// Admin-only: merges a set of member records into a single family.
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

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse(req, { error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles").select("id")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return jsonResponse(req, { error: "Admins only" }, 403);

    const { member_record_ids, family_name, existing_family_id } = await req.json();
    if (!Array.isArray(member_record_ids) || member_record_ids.length === 0) {
      return jsonResponse(req, { error: "member_record_ids required" }, 400);
    }

    let familyId = existing_family_id as string | undefined;
    if (!familyId) {
      if (!family_name) return jsonResponse(req, { error: "family_name required" }, 400);
      const { data: fam, error: famErr } = await admin
        .from("families").insert({ family_name }).select("id").single();
      if (famErr || !fam) return jsonResponse(req, { error: famErr?.message || "Could not create family" }, 500);
      familyId = fam.id;
    }

    const { error: upErr } = await admin
      .from("member_records").update({ family_id: familyId }).in("id", member_record_ids);
    if (upErr) return jsonResponse(req, { error: upErr.message }, 500);

    const { data: linked } = await admin
      .from("member_records").select("profile_id").in("id", member_record_ids);
    const profileIds = (linked ?? []).map(r => r.profile_id).filter(Boolean) as string[];
    if (profileIds.length > 0) {
      await admin.from("profiles").update({ family_id: familyId }).in("id", profileIds);
    }

    await logAudit(admin, {
      actor_id: user.id, actor_label: user.email ?? null,
      action: existing_family_id ? "family.add_members" : "family.create",
      table_name: "families", record_id: familyId!,
      details: { family_name: family_name ?? null, member_record_ids },
    });

    return jsonResponse(req, { success: true, family_id: familyId });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
