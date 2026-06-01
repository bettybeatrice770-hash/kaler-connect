// Admin-only: creates an auth account for a member_record and links it via profiles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function phoneToAuthEmail(phoneE164: string) {
  const stripped = phoneE164.replace(/\D/g, "");
  return `${stripped}@members.kalernairobi.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admins only" }, 403);

    const { member_record_id, password } = await req.json();
    if (!member_record_id || !password || password.length < 6) {
      return json({ error: "member_record_id and password (min 6 chars) required" }, 400);
    }

    const { data: rec, error: recErr } = await admin
      .from("member_records")
      .select("*")
      .eq("id", member_record_id)
      .maybeSingle();
    if (recErr || !rec) return json({ error: "Member record not found" }, 404);
    if (!rec.phone) return json({ error: "Member has no phone number on file" }, 400);
    if (rec.profile_id) return json({ error: "This member already has a login" }, 400);

    const email = phoneToAuthEmail(rec.phone);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: rec.full_name, phone: rec.phone },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message || "Could not create user" }, 400);
    }

    const newUserId = created.user.id;

    const { error: profErr } = await admin.from("profiles").insert({
      id: newUserId,
      full_name: rec.full_name,
      phone: rec.phone,
      branch_id: rec.branch_id,
      category: rec.category,
      status: rec.status,
      family_id: rec.family_id,
      must_change_password: true,
    });
    if (profErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: "Could not create profile: " + profErr.message }, 500);
    }

    const { error: linkErr } = await admin
      .from("member_records")
      .update({ profile_id: newUserId })
      .eq("id", rec.id);
    if (linkErr) return json({ error: "Could not link record: " + linkErr.message }, 500);

    return json({ success: true, user_id: newUserId, login_phone: rec.phone });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
