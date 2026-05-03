import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Users } from "lucide-react";

type Branch = { id: string; name: string };
type Record = { id: string; full_name: string; branch_id: string | null; family_id: string | null; phone: string | null };
type Family = { id: string; family_name: string };

const AdminFamilies = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [familyName, setFamilyName] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: brs }, { data: recs }, { data: fams }] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("member_records").select("id, full_name, branch_id, family_id, phone").order("full_name"),
      supabase.from("families").select("*").order("family_name"),
    ]);
    setBranches((brs as Branch[]) || []);
    setRecords((recs as Record[]) || []);
    setFamilies((fams as Family[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name ?? "—";
  const familyOf = (id: string | null) => families.find(f => f.id === id)?.family_name;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => r.full_name.toLowerCase().includes(q) || (r.phone || "").includes(q));
  }, [records, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const merge = async () => {
    if (selected.size < 2) {
      toast({ title: "Select at least 2 members", variant: "destructive" });
      return;
    }
    if (!familyName.trim()) {
      toast({ title: "Enter a family name", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("merge-family", {
      body: { member_record_ids: Array.from(selected), family_name: familyName.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Merge failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Family created", description: `${selected.size} members linked into "${familyName}".` });
    setSelected(new Set());
    setFamilyName("");
    load();
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
            <h1 className="font-display text-3xl text-primary">Families</h1>
            <p className="text-sm text-muted-foreground">Group spouses or relatives so they share one dashboard.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Merge into a family</CardTitle>
            <CardDescription>Select 2+ members below, name the family, then merge.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <Label>Family name</Label>
              <Input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="e.g. Elijah Orwa Family" />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Button onClick={merge} disabled={busy || selected.size < 2 || !familyName.trim()} variant="hero">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Merge"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </CardHeader>
          <CardContent className="divide-y">
            {filtered.map(r => {
              const fam = familyOf(r.family_id);
              return (
                <label key={r.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/40 px-2 rounded">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                  <div className="flex-1">
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{branchName(r.branch_id)} · {r.phone || "no phone"}</p>
                  </div>
                  {fam && <Badge variant="outline" className="text-xs">{fam}</Badge>}
                </label>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No members.</p>}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminFamilies;
