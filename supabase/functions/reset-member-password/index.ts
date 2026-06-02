// Admin-only: resets the password for an existing member's auth account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { logAudit } from "../_shared/audit.ts";

function genTempPassword(format: "year" | "mmdd" = "year") {
  const now = new Date();
  if (format === "mmdd") {
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `Kaler${mm}${dd}`;
  }
  return `Kaler${now.getFullYear()}`;
}

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

    const body = await req.json().catch(() => ({}));
    const { member_record_id, format } = body;
    let { password } = body;
    if (!member_record_id) return jsonResponse(req, { error: "member_record_id required" }, 400);
    if (password && password.length < 6) return jsonResponse(req, { error: "password must be >= 6 chars" }, 400);
    if (!password) password = genTempPassword(format === "mmdd" ? "mmdd" : "year");

    const { data: rec } = await admin.from("member_records").select("id, profile_id, full_name").eq("id", member_record_id).maybeSingle();
    if (!rec?.profile_id) return jsonResponse(req, { error: "Member has no login linked" }, 400);

    const { error: updErr } = await admin.auth.admin.updateUserById(rec.profile_id, { password });
    if (updErr) return jsonResponse(req, { error: updErr.message }, 400);

    await admin.from("profiles").update({
      must_change_password: true,
      reset_requested: false,
      reset_requested_at: null,
    }).eq("id", rec.profile_id);

    await logAudit(admin, {
      actor_id: user.id,
      actor_label: user.email ?? null,
      action: "password.reset",
      table_name: "member_records",
      record_id: rec.id,
      details: { member_name: rec.full_name, format: format === "mmdd" ? "mmdd" : "year" },
    });

    return jsonResponse(req, { success: true, temp_password: password });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
