// Grants the calling user the 'admin' role IF no admin exists yet.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { logAudit } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(req, { error: "Not authenticated" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse(req, { error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { count, error: cErr } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw cErr;

    if ((count ?? 0) > 0) {
      return jsonResponse(req, { error: "An admin already exists. Ask the existing admin to grant access." }, 403);
    }

    const { error: insErr } = await admin
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    if (insErr) throw insErr;

    await logAudit(admin, {
      actor_id: user.id, actor_label: user.email ?? null,
      action: "admin.bootstrap", table_name: "user_roles", record_id: user.id,
    });

    return jsonResponse(req, { success: true });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
