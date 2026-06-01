// Admin-only: resets the password for an existing member's auth account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genTempPassword() {
  // Simple readable temp password, e.g. Kaler-4F7K
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `Kaler-${s}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { member_record_id } = body;
    let { password } = body;
    if (!member_record_id) return json({ error: "member_record_id required" }, 400);
    if (password && password.length < 6) return json({ error: "password must be >= 6 chars" }, 400);
    if (!password) password = genTempPassword();

    const { data: rec } = await admin.from("member_records").select("profile_id").eq("id", member_record_id).maybeSingle();
    if (!rec?.profile_id) return json({ error: "Member has no login linked" }, 400);

    const { error: updErr } = await admin.auth.admin.updateUserById(rec.profile_id, { password });
    if (updErr) return json({ error: updErr.message }, 400);

    // Force change on next login and clear any pending reset request
    await admin.from("profiles").update({
      must_change_password: true,
      reset_requested: false,
      reset_requested_at: null,
    }).eq("id", rec.profile_id);

    return json({ success: true, temp_password: password });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
