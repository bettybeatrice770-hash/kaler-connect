import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, ShieldCheck } from "lucide-react";

type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_label: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: any;
  created_at: string;
};

const PAGE_SIZE = 2000;

const AdminAuditLog = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [familyNames, setFamilyNames] = useState<Record<string, string>>({});
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const rows = (data as AuditEntry[]) || [];
      setEntries(rows);

      const actorIds = new Set<string>();
      const memberIds = new Set<string>();
      const familyIds = new Set<string>();
      const profileIds = new Set<string>();

      for (const r of rows) {
        if (r.actor_id) actorIds.add(r.actor_id);
        const d: any = r.details || {};
        const newRow = d.new || {};
        const oldRow = d.old || {};
        const mId = newRow.member_record_id || oldRow.member_record_id || d.member_record_id || (r.table_name === "member_records" ? r.record_id : null);
        const fId = newRow.family_id || oldRow.family_id || d.family_id || (r.table_name === "families" ? r.record_id : null);
        const pId = newRow.profile_id || oldRow.profile_id || d.profile_id || (r.table_name === "profiles" ? r.record_id : null);
        if (mId) memberIds.add(mId);
        if (fId) familyIds.add(fId);
        if (pId) profileIds.add(pId);
      }

      const [profsRes, membersRes, familiesRes, profileLookupRes] = await Promise.all([
        actorIds.size ? supabase.from("profiles").select("id, full_name").in("id", Array.from(actorIds)) : Promise.resolve({ data: [] as any[] }),
        memberIds.size ? supabase.from("member_records").select("id, full_name").in("id", Array.from(memberIds)) : Promise.resolve({ data: [] as any[] }),
        familyIds.size ? supabase.from("families").select("id, family_name").in("id", Array.from(familyIds)) : Promise.resolve({ data: [] as any[] }),
        profileIds.size ? supabase.from("profiles").select("id, full_name").in("id", Array.from(profileIds)) : Promise.resolve({ data: [] as any[] }),
      ]);

      const aMap: Record<string, string> = {};
      for (const p of (profsRes.data as any[]) || []) aMap[p.id] = p.full_name;
      setActors(aMap);
      const mMap: Record<string, string> = {};
      for (const m of (membersRes.data as any[]) || []) mMap[m.id] = m.full_name;
      setMemberNames(mMap);
      const fMap: Record<string, string> = {};
      for (const f of (familiesRes.data as any[]) || []) fMap[f.id] = f.family_name;
      setFamilyNames(fMap);
      const pMap: Record<string, string> = {};
      for (const p of (profileLookupRes.data as any[]) || []) pMap[p.id] = p.full_name;
      setProfileNames(pMap);

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back</Link></Button>
          <div>
            <h1 className="font-display text-3xl text-primary flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Audit log</h1>
            <p className="text-sm text-muted-foreground">Most recent {PAGE_SIZE.toLocaleString()} admin actions. View-only.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent actions</CardTitle>
            <CardDescription>Who did what, when, and to which record.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {entries.length === 0 && <p className="text-sm text-muted-foreground py-3">No audit entries yet.</p>}
            {entries.map((e) => {
              const d: any = e.details || {};
              const newRow = d.new || {};
              const oldRow = d.old || {};
              const mId = newRow.member_record_id || oldRow.member_record_id || d.member_record_id || (e.table_name === "member_records" ? e.record_id : null);
              const fId = newRow.family_id || oldRow.family_id || d.family_id || (e.table_name === "families" ? e.record_id : null);
              const pId = newRow.profile_id || oldRow.profile_id || d.profile_id || (e.table_name === "profiles" ? e.record_id : null);
              const affectedName =
                d.member_name || d.family_name || d.full_name ||
                newRow.full_name || oldRow.full_name ||
                newRow.family_name || oldRow.family_name ||
                newRow.funeral_name || oldRow.funeral_name ||
                newRow.name || oldRow.name ||
                (mId && memberNames[mId]) ||
                (pId && profileNames[pId]) ||
                (fId && familyNames[fId]) ||
                null;
              return (
                <div key={e.id} className="py-3 text-sm space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{e.action}</Badge>
                      {affectedName && <span className="text-sm font-medium">{affectedName}</span>}
                      {e.table_name && <span className="text-xs text-muted-foreground">{e.table_name}{e.record_id ? ` · ${e.record_id.slice(0, 8)}` : ""}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    by {e.actor_id ? (actors[e.actor_id] || e.actor_label || e.actor_id.slice(0, 8)) : "system"}
                  </p>
                  {e.details && (
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-40">{JSON.stringify(e.details, null, 2)}</pre>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminAuditLog;
