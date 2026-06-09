import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Pencil, Trash2, UserMinus, Check, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Branch = { id: string; name: string };
type MRec = { id: string; full_name: string; branch_id: string | null; family_id: string | null; phone: string | null };
type Family = { id: string; family_name: string };

type DeleteTarget = { family: Family; memberCount: number };
type RemoveTarget = { memberId: string; memberName: string; familyName: string };

const AdminAllFamilies = () => {
  const { isAdmin, isBranchRep, isOfficer, branchAdminIds } = useAuth();
  const branchScoped = isBranchRep && !isAdmin && !isOfficer;

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<MRec[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
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
      
      if (branchScoped) {
        allBranches = allBranches.filter((b) => branchAdminIds.includes(b.id));
        allRecs = allRecs.filter((r) => r.branch_id && branchAdminIds.includes(r.branch_id));
      }

      setBranches(allBranches);
      setRecords(allRecs);
      setFamilies((fams as Family[]) || []);
    } catch (error) {
      console.error("Error loading families dataset:", error);
      toast({ title: "Error", description: "Failed to load management resources.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [branchScoped, branchAdminIds.join(",")]);

  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name ?? "—";

  const familyMembers = useMemo(() => {
    const m: Record<string, MRec[]> = {};
    for (const r of records) {
      if (!r.family_id) continue;
      (m[r.family_id] ||= []).push(r);
    }
    return m;
  }, [records]);

  const visibleFamilies = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = branchScoped
      ? families.filter((f) => (familyMembers[f.id] || []).length > 0)
      : families;
      
    if (q) {
      list = list.filter(f =>
        f.family_name.toLowerCase().includes(q) ||
        (familyMembers[f.id] || []).some(m => m.full_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [families, familyMembers, branchScoped, search]);

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

  const confirmRemoveMember = async () => {
    if (!removeTarget) return;
    
    const { error } = await supabase.from("member_records").update({ family_id: null }).eq("id", removeTarget.memberId);
    if (error) {
      setRemoveTarget(null);
      return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    
    const { data: mrFull } = await supabase.from("member_records").select("profile_id").eq("id", removeTarget.memberId).maybeSingle();
    if ((mrFull as any)?.profile_id) {
      await supabase.from("profiles").update({ family_id: null }).eq("id", (mrFull as any).profile_id);
    }
    
    toast({ title: "Member removed from family" });
    setRemoveTarget(null);
    load();
  };

  const confirmDeleteFamily = async () => {
    if (!deleteTarget) return;
    const { family, memberCount } = deleteTarget;
    const members = familyMembers[family.id] || [];
    
    if (members.length > 0) {
      const ids = members.map(m => m.id);
      await supabase.from("member_records").update({ family_id: null }).in("id", ids);
      const { data: profs } = await supabase.from("member_records").select("profile_id").in("id", ids);
      const pids = (profs || []).map((p: any) => p.profile_id).filter(Boolean);
      if (pids.length) await supabase.from("profiles").update({ family_id: null }).in("id", pids);
    }
    
    const { error } = await supabase.from("families").delete().eq("id", family.id);
    setDeleteTarget(null);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    
    toast({ title: "Family deleted", description: `${memberCount} member record(s) unlinked.` });
    load();
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl text-primary">All families</h1>
            <p className="text-sm text-muted-foreground">
              Rename, remove members, or delete families. To create a new family go to{" "}
              <Link to="/admin/families" className="text-primary underline">Merge tool</Link>.
            </p>
          </div>
        </div>

        <Input
          placeholder="Search family name or member name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md"
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All families ({visibleFamilies.length})</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Rename a family, remove a wrongly-added member, or delete the family entirely."
                : "View-only list."}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {visibleFamilies.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No families found.</p>
            )}
            {visibleFamilies.map((f) => {
              const members = familyMembers[f.id] || [];
              const isEditing = editingFamilyId === f.id;
              return (
                <div key={f.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="max-w-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(f.id);
                            if (e.key === "Escape") setEditingFamilyId(null);
                          }}
                        />
                        <Button size="sm" variant="hero" onClick={() => saveRename(f.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingFamilyId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="font-medium text-primary">
                        {f.family_name}{" "}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({members.length} member{members.length === 1 ? "" : "s"})
                        </span>
                      </p>
                    )}
                    {isAdmin && !isEditing && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startRename(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ family: f, memberCount: members.length })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <ul className="pl-2 space-y-1">
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between text-sm py-0.5">
                        <span>
                          {m.full_name}{" "}
                          <span className="text-xs text-muted-foreground">
                            · {branchName(m.branch_id)} · {m.phone || "no phone"}
                          </span>
                        </span>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRemoveTarget({ memberId: m.id, memberName: m.full_name, familyName: f.family_name })}
                            title="Remove from family"
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </li>
                    ))}
                    {members.length === 0 && (
                      <li className="text-xs text-muted-foreground italic">No members linked.</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Remove member confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.memberName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from the "{removeTarget?.familyName}" family. Their member record stays intact — only the family link is cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete family confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.family.family_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.memberCount ? `${deleteTarget.memberCount} member record(s) will be unlinked from this family. ` : ""}
              The member records themselves are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFamily} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete family
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
};

export default AdminAllFamilies;
