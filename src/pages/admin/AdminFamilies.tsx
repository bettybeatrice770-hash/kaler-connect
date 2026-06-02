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
import { Loader2, ChevronLeft, Users, Pencil, Trash2, UserMinus, Check, X } from "lucide-react";

type Branch = { id: string; name: string };
type MRec = { id: string; full_name: string; branch_id: string | null; family_id: string | null; phone: string | null };
type Family = { id: string; family_name: string };

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
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: brs }, { data: recs }, { data: fams }] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("member_records").select("id, full_name, branch_id, family_id, phone").order("full_name"),
      supabase.from("families").select("*").order("family_name"),
    ]);
    let allBranches = (brs as Branch[]) || [];
    let allRecs = (recs as MRec[]) || [];
    if (branchScoped) {
      allBranches = allBranches.filter((b) => branchAdminIds.includes(b.id));
      allRecs = allRecs.filter((r) => r.branch_id && branchAdminIds.includes(r.branch_id));
    }
    setBranches(allBranches);
    setRecords(allRecs);
    setFamilies((fams as Family[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [branchScoped, branchAdminIds.join(",")]);

  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name ?? "—";
  const familyOf = (id: string | null) => families.find(f => f.id === id)?.family_name;

  // Families list: only those with at least one visible member (branch-scoped users)
  const familyMembers = useMemo(() => {
    const m: Record<string, MRec[]> = {};
    for (const r of records) {
      if (!r.family_id) continue;
      (m[r.family_id] ||= []).push(r);
    }
    return m;
  }, [records]);

  const visibleFamilies = useMemo(() => {
    if (!branchScoped) return families;
    return families.filter((f) => (familyMembers[f.id] || []).length > 0);
  }, [families, familyMembers, branchScoped]);

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
    if (selected.size < 2) return toast({ title: "Select at least 2 members", variant: "destructive" });
    if (!familyName.trim()) return toast({ title: "Enter a family name", variant: "destructive" });
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

  const startRename = (f: Family) => {
    setEditingFamilyId(f.id);
    setEditingName(f.family_name);
  };

  const saveRename = async (id: string) => {
    if (!editingName.trim()) return;
    const { error } = await supabase.from("families").update({ family_name: editingName.trim() }).eq("id", id);
    if (error) return toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    toast({ title: "Family renamed" });
    setEditingFamilyId(null);
    load();
  };

  const removeMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this family? Their member record stays; only the family link is cleared.`)) return;
    const { error: mErr } = await supabase.from("member_records").update({ family_id: null }).eq("id", memberId);
    if (mErr) return toast({ title: "Failed", description: mErr.message, variant: "destructive" });
    // Also clear on the linked profile if any
    const rec = records.find(r => r.id === memberId);
    if (rec) {
      const { data: mrFull } = await supabase.from("member_records").select("profile_id").eq("id", memberId).maybeSingle();
      if ((mrFull as any)?.profile_id) {
        await supabase.from("profiles").update({ family_id: null }).eq("id", (mrFull as any).profile_id);
      }
    }
    toast({ title: "Member removed from family" });
    load();
  };

  const deleteFamily = async (f: Family) => {
    const members = familyMembers[f.id] || [];
    if (!confirm(`Delete the family "${f.family_name}"? ${members.length} member record(s) will be unlinked (records are kept).`)) return;
    // Unlink members first
    if (members.length > 0) {
      const ids = members.map(m => m.id);
      await supabase.from("member_records").update({ family_id: null }).in("id", ids);
      const { data: profs } = await supabase.from("member_records").select("profile_id").in("id", ids);
      const pids = (profs || []).map((p: any) => p.profile_id).filter(Boolean);
      if (pids.length) await supabase.from("profiles").update({ family_id: null }).in("id", pids);
    }
    const { error } = await supabase.from("families").delete().eq("id", f.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Family deleted" });
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
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Group spouses or relatives so they share one dashboard. Admins can rename or delete families."
                : "Read-only view of family groupings" + (branchScoped ? " in your branch." : ".")}
            </p>
          </div>
        </div>

        {isAdmin && (
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
        )}

        {/* FAMILIES LIST */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All families ({visibleFamilies.length})</CardTitle>
            <CardDescription>
              {isAdmin ? "Rename a family, remove a wrongly-added member, or delete the family entirely." : "View-only list."}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {visibleFamilies.length === 0 && <p className="text-sm text-muted-foreground py-3">No families yet.</p>}
            {visibleFamilies.map((f) => {
              const members = familyMembers[f.id] || [];
              const isEditing = editingFamilyId === f.id;
              return (
                <div key={f.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="max-w-xs" />
                        <Button size="sm" variant="hero" onClick={() => saveRename(f.id)}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingFamilyId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <p className="font-medium text-primary">{f.family_name} <span className="text-xs text-muted-foreground ml-2">({members.length} member{members.length === 1 ? "" : "s"})</span></p>
                    )}
                    {isAdmin && !isEditing && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startRename(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteFamily(f)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                  <ul className="pl-2 space-y-1">
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between text-sm">
                        <span>{m.full_name} <span className="text-xs text-muted-foreground">· {branchName(m.branch_id)} · {m.phone || "no phone"}</span></span>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => removeMember(m.id, m.full_name)} title="Remove from family">
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </li>
                    ))}
                    {members.length === 0 && <li className="text-xs text-muted-foreground">No members.</li>}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pick members to merge</CardTitle>
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
        )}
      </div>
    </PortalLayout>
  );
};

export default AdminFamilies;
