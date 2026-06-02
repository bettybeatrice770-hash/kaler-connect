// Admin-only: deletes a member record (and unlinks/optionally deletes its auth account).
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
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse(req, { error: "Not authenticated" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return jsonResponse(req, { error: "Admins only" }, 403);

    const { member_record_id } = await req.json();
    if (!member_record_id) return jsonResponse(req, { error: "member_record_id required" }, 400);

    const { data: rec } = await admin.from("member_records").select("profile_id, full_name").eq("id", member_record_id).maybeSingle();

    await admin.from("arrears").delete().eq("member_record_id", member_record_id);
    const { error: delErr } = await admin.from("member_records").delete().eq("id", member_record_id);
    if (delErr) return jsonResponse(req, { error: delErr.message }, 400);

    if (rec?.profile_id) {
      await admin.from("profiles").delete().eq("id", rec.profile_id);
      await admin.auth.admin.deleteUser(rec.profile_id);
    }

    await logAudit(admin, {
      actor_id: user.id,
      actor_label: user.email ?? null,
      action: "member.delete",
      table_name: "member_records",
      record_id: member_record_id,
      details: { member_name: rec?.full_name ?? null, profile_id: rec?.profile_id ?? null },
    });

    return jsonResponse(req, { success: true });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
