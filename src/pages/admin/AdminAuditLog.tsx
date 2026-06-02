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

const PAGE_SIZE = 100;

const AdminAuditLog = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const rows = (data as AuditEntry[]) || [];
      setEntries(rows);

      const ids = Array.from(new Set(rows.map(r => r.actor_id).filter(Boolean) as string[]));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, string> = {};
        for (const p of (profs as any[]) || []) map[p.id] = p.full_name;
        setActors(map);
      }
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
            <p className="text-sm text-muted-foreground">Most recent {PAGE_SIZE} admin actions. View-only.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent actions</CardTitle>
            <CardDescription>Who did what, when, and to which record.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {entries.length === 0 && <p className="text-sm text-muted-foreground py-3">No audit entries yet.</p>}
            {entries.map((e) => (
              <div key={e.id} className="py-3 text-sm space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{e.action}</Badge>
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
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminAuditLog;
