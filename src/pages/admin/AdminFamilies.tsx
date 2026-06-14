import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
type MRec = { id: string; full_name: string; branch_id: string | null; family_id: string | null; phone: string | null };
type Family = { id: string; family_name: string };

interface MergeFunctionResponse {
  error?: string;
}

const AdminFamilies = () => {
  const { isAdmin, isBranchRep, isOfficer, branchAdminIds } = useAuth();
  const branchScoped = isBranchRep && !isAdmin && !isOfficer;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<MRec[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [familyName, setFamilyName] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: brs }, { data: recs }, { data: fams }] = await Promise.all([
        supabase.from("branches").select("*").order("name"),
        supabase.from("member_records").select("id, full_name, branch_id, family_id, phone").order("full_name"),
        supabase.from("families").select("*").order("family_name"),
      ]);

      let allBranches = (brs as Branch[]) || [];
      let allRecs = (recs as MRec[]) || [];

      if (branchScoped && branchAdminIds) {
        allBranches = allBranches.filter((b) => branchAdminIds.includes(b.id));
        allRecs = allRecs.filter((r) => r.branch_id && branchAdminIds.includes(r.branch_id));
      }

      setBranches(allBranches);
      setRecords(allRecs);
      setFamilies((fams as Family[]) || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load members.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const serializedBranchAdminIds = useMemo(() => branchAdminIds?.join(",") ?? "", [branchAdminIds]);

  useEffect(() => {
    load();
  }, [branchScoped, serializedBranchAdminIds]);

  const branchMap = useMemo(() => new Map(branches.map(b => [b.id, b.name])), [branches]);
  const familyMap = useMemo(() => new Map(families.map(f => [f.id, f.family_name])), [families]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      r.full_name.toLowerCase().includes(q) ||
      (r.phone || "").includes(q)
    );
  }, [records, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRecords = useMemo(() => records.filter(r => selected.has(r.id)), [records, selected]);
  const existingFamilyId = useMemo(() => selectedRecords.find(r => r.family_id)?.family_id ?? null, [selectedRecords]);
  const existingFamilyName = useMemo(() => existingFamilyId ? familyMap.get(existingFamilyId) : null, [existingFamilyId, familyMap]);

  const isMergeDisabled = useMemo(() => {
    return busy || selected.size < 2 || (!existingFamilyId && !familyName.trim());
  }, [busy, selected.size, existingFamilyId, familyName]);

  const merge = async () => {
    if (selected.size < 2) return toast({ title: "Select at least 2 members", variant: "destructive" });
    if (!existingFamilyId && !familyName.trim()) return toast({ title: "Enter a family name", variant: "destructive" });

    setBusy(true);
    try {
      const body: { member_record_ids: string[]; existing_family_id?: string; family_name?: string } = {
        member_record_ids: Array.from(selected)
      };
      
      if (existingFamilyId) body.existing_family_id = existingFamilyId;
      else body.family_name = familyName.trim();

      const { data, error } = await supabase.functions.invoke<MergeFunctionResponse>("merge-family", { body });
      
      if (error || data?.error) {
        toast({ title: "Merge failed", description: data?.error || error?.message || "An unknown error occurred", variant: "destructive" });
        return;
      }

      toast({ title: "Done", description: existingFamilyId ? `Members added to "${existingFamilyName}" family.` : `${selected.size} members linked into "${familyName.trim()}".` });
      setSelected(new Set());
      setFamilyName("");
      load();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "An unexpected error occurred", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></PortalLayout>;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back</Link></Button>
          <div>
            <h1 className="font-display text-3xl text-primary">Merge into a family</h1>
            <p className="text-sm text-muted-foreground">Select 2+ members to merge. To view existing families, go to <Link to="/admin/all-families" className="text-primary underline">All families</Link>.</p>
          </div>
        </div>

        {(isAdmin || isBranchRep || isOfficer) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Family Actions</CardTitle>
              <CardDescription>{existingFamilyId ? `Selected members belong to "${existingFamilyName}". Others will be added here.` : "Enter a name to create a new family."}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:flex-wrap items-end gap-3">
              {existingFamilyId ? (
                <div className="w-full sm:flex-1">
                  <p className="text-sm font-medium text-primary">{existingFamilyName}</p>
                  <p className="text-xs text-muted-foreground">Existing family — no new family will be created</p>
                </div>
              ) : (
                <div className="space-y-1 w-full sm:flex-1">
                  <Label htmlFor="family-name-input">Family name</Label>
                  <Input id="family-name-input" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="e.g. Elijah Orwa Family" />
                </div>
              )}
              <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3">
                <Badge variant="secondary">{selected.size} selected</Badge>
                <Button onClick={merge} disabled={isMergeDisabled} variant="hero">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : existingFamilyId ? "Add to family" : "Create & merge"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick members to merge</CardTitle>
            <Input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="mt-2" />
          </CardHeader>
          <CardContent className="divide-y">
            {filtered.map(r => (
              <label key={r.id} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/40 px-2 rounded transition-colors">
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.branch_id ? branchMap.get(r.branch_id) : "—"} · {r.phone || "no phone"}</p>
                </div>
                {r.family_id && <Badge variant="outline" className="text-xs max-w-[150px] truncate">{familyMap.get(r.family_id)}</Badge>}
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminFamilies;
