// Admin-only: assign/remove a role for a user. Caps `admin` role to 4 total.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { logAudit } from "../_shared/audit.ts";

const ALLOWED_ROLES = ["admin", "officer", "branch_rep", "member"];
const MAX_ADMINS = 4;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(req, { error: "Not authenticated" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse(req, { error: "Not authenticated" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return jsonResponse(req, { error: "Admins only" }, 403);

    const { action, target_user_id, role, branch_id } = await req.json();
    if (!ALLOWED_ROLES.includes(role)) return jsonResponse(req, { error: "Unknown role" }, 400);
    if (!target_user_id) return jsonResponse(req, { error: "target_user_id required" }, 400);

    if (action === "assign") {
      const adminRoles = ["admin", "officer", "branch_rep"];
      if (adminRoles.includes(role)) {
        const { data: existingRoles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", target_user_id)
          .in("role", adminRoles);

        const otherRole = existingRoles?.find(r => r.role !== role);
        if (otherRole) {
          return jsonResponse(req, { error: `User already has an administrative role (${otherRole.role}). Remove it first.` }, 400);
        }
      }

      if (role === "admin") {
        const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
        if ((count ?? 0) >= MAX_ADMINS) return jsonResponse(req, { error: `Maximum ${MAX_ADMINS} admins allowed` }, 400);
      }
      const { error } = await admin.from("user_roles").insert({ user_id: target_user_id, role });
      if (error && !error.message.includes("duplicate")) return jsonResponse(req, { error: error.message }, 400);
      if (role === "branch_rep" && branch_id) {
        await admin.from("branch_admins").insert({ user_id: target_user_id, branch_id }).then(() => null).catch(() => null);
      }
      await logAudit(admin, {
        actor_id: user.id, actor_label: user.email ?? null,
        action: "role.assign", table_name: "user_roles", record_id: target_user_id,
        details: { role, branch_id: branch_id ?? null },
      });
      return jsonResponse(req, { success: true });
    } else if (action === "remove") {
      const { error } = await admin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", role);
      if (error) return jsonResponse(req, { error: error.message }, 400);
      if (role === "branch_rep") {
        await admin.from("branch_admins").delete().eq("user_id", target_user_id);
      }
      await logAudit(admin, {
        actor_id: user.id, actor_label: user.email ?? null,
        action: "role.remove", table_name: "user_roles", record_id: target_user_id,
        details: { role },
      });
      return jsonResponse(req, { success: true });
    }
    return jsonResponse(req, { error: "Unknown action" }, 400);
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
