// Admin-only: deletes a member record (and unlinks/optionally deletes its auth account).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { member_record_id } = await req.json();
    if (!member_record_id) return json({ error: "member_record_id required" }, 400);

    const { data: rec } = await admin.from("member_records").select("profile_id").eq("id", member_record_id).maybeSingle();

    // Delete arrears, then record, then auth user (last so failures don't orphan the auth user)
    await admin.from("arrears").delete().eq("member_record_id", member_record_id);
    const { error: delErr } = await admin.from("member_records").delete().eq("id", member_record_id);
    if (delErr) return json({ error: delErr.message }, 400);

    if (rec?.profile_id) {
      await admin.from("profiles").delete().eq("id", rec.profile_id);
      await admin.auth.admin.deleteUser(rec.profile_id);
    }
    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
