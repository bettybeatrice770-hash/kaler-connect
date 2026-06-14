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
type FamRequest = { id: string; family_id: string; full_name: string };

type DeleteTarget = { family: Family; memberCount: number };
type RemoveTarget = { memberId: string; memberName: string; familyName: string };

const AdminAllFamilies = () => {
  const { isAdmin, isBranchRep, isOfficer, branchAdminIds } = useAuth();
  const branchScoped = isBranchRep && !isAdmin && !isOfficer;

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<MRec[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [requests, setRequests] = useState<FamRequest[]>([]);
  
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: brs }, { data: recs }, { data: fams }, { data: reqs }] = await Promise.all([
        supabase.from("branches").select("*").order("name"),
        supabase.from("member_records").select("id, full_name, branch_id, family_id, phone").order("full_name"),
        supabase.from("families").select("*").order("family_name"),
        supabase.from("family_requests").select("id, family_id, full_name").eq("status", "pending"),
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
      
      const existingNames = new Set((allRecs || []).map(r => r.full_name.toLowerCase().trim()));
      setRequests((reqs as FamRequest[] || []).filter(req => !existingNames.has(req.full_name.toLowerCase().trim())));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load management resources.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branchScoped, branchAdminIds?.join(",")]);

  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name ?? "—";

  const familyMembers = useMemo(() => {
    const m: Record<string, MRec[]> = {};
    for (const r of records) { if (r.family_id) (m[r.family_id] ||= []).push(r); }
    return m;
  }, [records]);

  const familyRequests = useMemo(() => {
    const r: Record<string, FamRequest[]> = {};
    for (const req of requests) { (r[req.family_id] ||= []).push(req); }
    return r;
  }, [requests]);

  const visibleFamilies = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = branchScoped ? families.filter((f) => (familyMembers[f.id] || []).length > 0) : families;
    if (q) {
      list = list.filter(f =>
        f.family_name.toLowerCase().includes(q) ||
        (familyMembers[f.id] || []).some(m => m.full_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [families, familyMembers, branchScoped, search]);

  // FULL DELETE LOGIC RESTORED
  const confirmRemoveMember = async () => {
    if (!removeTarget) return;
    const { error } = await supabase.from("member_records").delete().eq("id", removeTarget.memberId);
    if (error) toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
    setRemoveTarget(null);
    load();
  };

  const confirmDeleteFamily = async () => {
    if (!deleteTarget) return;
    await supabase.from("family_requests").delete().eq("family_id", deleteTarget.family.id);
    await supabase.from("member_records").delete().eq("family_id", deleteTarget.family.id);
    await supabase.from("families").delete().eq("id", deleteTarget.family.id);
    setDeleteTarget(null);
    load();
  };

  if (loading) return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></PortalLayout>;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">All families</h1>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
        <Card>
          <CardContent className="divide-y pt-4">
            {visibleFamilies.map(f => (
              <div key={f.id} className="py-4">
                <p className="font-medium text-primary">{f.family_name}</p>
                {(familyMembers[f.id] || []).map(m => (
                  <div key={m.id} className="flex justify-between py-1 text-sm">
                    {m.full_name}
                    {isAdmin && <Button size="sm" variant="ghost" onClick={() => setRemoveTarget({ memberId: m.id, memberName: m.full_name, familyName: f.family_name })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                ))}
                {(familyRequests[f.id] || []).map(req => (
                  <div key={req.id} className="flex justify-between py-1 text-sm italic text-muted-foreground">
                    {req.full_name} (Pending)
                    {isAdmin && <Button size="sm" variant="ghost" onClick={() => supabase.from("family_requests").delete().eq("id", req.id).then(load)}><X className="h-4 w-4" /></Button>}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {removeTarget?.memberName}?</AlertDialogTitle>
          <AlertDialogDescription>This record will be permanently deleted.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
};

export default AdminAllFamilies;
