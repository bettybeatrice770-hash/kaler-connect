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
  const [memberInfo, setMemberInfo] = useState<Record<string, { name: string; branch: string | null }>>({});
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
        memberIds.size ? supabase.from("member_records").select("id, full_name, branch_id, branches(name)").in("id", Array.from(memberIds)) : Promise.resolve({ data: [] as any[] }),
        familyIds.size ? supabase.from("families").select("id, family_name").in("id", Array.from(familyIds)) : Promise.resolve({ data: [] as any[] }),
        profileIds.size ? supabase.from("profiles").select("id, full_name").in("id", Array.from(profileIds)) : Promise.resolve({ data: [] as any[] }),
      ]);

      const aMap: Record<string, string> = {};
      for (const p of (profsRes.data as any[]) || []) aMap[p.id] = p.full_name;
      setActors(aMap);
      const mMap: Record<string, { name: string; branch: string | null }> = {};
      for (const m of (membersRes.data as any[]) || []) mMap[m.id] = { name: m.full_name, branch: m.branches?.name ?? null };
      setMemberInfo(mMap);
      const fMap: Record<string, string> = {};
      for (const f of (familiesRes.data as any[]) || []) fMap[f.id] = f.family_name;
      setFamilyNames(fMap);
      const pMap: Record<string, string> = {};
      for (const p of (profileLookupRes.data as any[]) || []) pMap[p.id] = p.full_name;
      setProfileNames(pMap);

      setLoading(false);
    })();
  }, []);

  const SKIP_FIELDS = new Set(["id", "created_at", "updated_at"]);
  const formatVal = (v: any) => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "yes" : "no";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };
  const buildDiff = (oldRow: any, newRow: any) => {
    const keys = new Set([...Object.keys(oldRow || {}), ...Object.keys(newRow || {})]);
    const diffs: { key: string; from: any; to: any }[] = [];
    for (const k of keys) {
      if (SKIP_FIELDS.has(k)) continue;
      const a = oldRow?.[k];
      const b = newRow?.[k];
      if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ key: k, from: a, to: b });
    }
    return diffs;
  };

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
              const member = mId ? memberInfo[mId] : null;
              const fallbackName =
                d.member_name || d.family_name || d.full_name ||
                newRow.full_name || oldRow.full_name ||
                newRow.family_name || oldRow.family_name ||
                newRow.funeral_name || oldRow.funeral_name ||
                newRow.name || oldRow.name ||
                (pId && profileNames[pId]) ||
                (fId && familyNames[fId]) ||
                null;
              const headerName = member?.name || fallbackName;
              const headerBranch = member?.branch || null;
              const diffs = buildDiff(oldRow, newRow);
              return (
                <div key={e.id} className="py-4 text-sm space-y-2">
                  {(headerName || headerBranch) && (
                    <p className="text-sm font-semibold text-primary">
                      Name: {headerName || "—"} | Branch: {headerBranch || "—"}
                    </p>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{e.action}</Badge>
                      {e.table_name && <span className="text-xs text-muted-foreground">{e.table_name}{e.record_id ? ` · ${e.record_id.slice(0, 8)}` : ""}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    by {e.actor_id ? (actors[e.actor_id] || e.actor_label || e.actor_id.slice(0, 8)) : "system"}
                  </p>
                  {diffs.length > 0 && (
                    <ul className="text-xs bg-muted/40 rounded p-2 space-y-1">
                      {diffs.map((diff) => (
                        <li key={diff.key}>
                          <span className="font-medium">{diff.key}:</span>{" "}
                          <span className="text-muted-foreground line-through">{formatVal(diff.from)}</span>{" "}
                          <span>→</span>{" "}
                          <span className="text-primary font-medium">{formatVal(diff.to)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {diffs.length === 0 && e.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Raw details</summary>
                      <pre className="bg-muted/50 rounded p-2 overflow-x-auto max-h-40 mt-1">{JSON.stringify(e.details, null, 2)}</pre>
                    </details>
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
