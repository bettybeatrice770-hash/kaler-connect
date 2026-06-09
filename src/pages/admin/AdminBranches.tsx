
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Branch {
  id: string;
  name: string;
  member_count?: number;
}

const AdminBranches = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: brs }, { data: recs }] = await Promise.all([
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("member_records").select("branch_id"),
    ]);

    // Count members per branch
    const counts: Record<string, number> = {};
    for (const r of recs || []) {
      if (r.branch_id) counts[r.branch_id] = (counts[r.branch_id] || 0) + 1;
    }

    setBranches(
      (brs || []).map((b: any) => ({ ...b, member_count: counts[b.id] || 0 }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBranch = async () => {
    const name = newName.trim();
    if (!name) return toast({ title: "Enter a branch name", variant: "destructive" });
    if (branches.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      return toast({ title: "A branch with that name already exists", variant: "destructive" });
    }
    setBusy(true);
    const { error } = await supabase.from("branches").insert({ name });
    setBusy(false);
    if (error) return toast({ title: "Failed to create branch", description: error.message, variant: "destructive" });
    toast({ title: `Branch "${name}" created` });
    setNewName("");
    load();
  };

  const startEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setEditingName(branch.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return toast({ title: "Branch name cannot be empty", variant: "destructive" });
    if (branches.some((b) => b.name.toLowerCase() === name.toLowerCase() && b.id !== id)) {
      return toast({ title: "A branch with that name already exists", variant: "destructive" });
    }
    setBusy(true);
    const { error } = await supabase.from("branches").update({ name }).eq("id", id);
    setBusy(false);
    if (error) return toast({ title: "Failed to rename", description: error.message, variant: "destructive" });
    toast({ title: "Branch renamed" });
    cancelEdit();
    load();
  };

  const deleteBranch = async () => {
    if (!deleteTarget) return;
    if ((deleteTarget.member_count || 0) > 0) {
      setDeleteTarget(null);
      return toast({
        title: "Cannot delete — branch has members",
        description: `Move all ${deleteTarget.member_count} members to another branch first.`,
        variant: "destructive",
      });
    }
    setBusy(true);
    const { error } = await supabase.from("branches").delete().eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (error) return toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    toast({ title: `Branch "${deleteTarget.name}" deleted` });
    load();
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-2xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin" className="inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <div>
          <h1 className="font-display text-3xl text-primary font-semibold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, rename, or delete branches. A branch with members cannot be deleted.
          </p>
        </div>

        {/* Create new branch */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add new branch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="new-branch">Branch name</Label>
                <Input
                  id="new-branch"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Umoja"
                  onKeyDown={(e) => e.key === "Enter" && createBranch()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={createBranch} disabled={busy || !newName.trim()} variant="hero">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Create</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branch list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All branches ({branches.length})</CardTitle>
            <CardDescription>Click the pencil to rename. Red bin only appears when branch is empty.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="grid place-items-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : branches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No branches yet. Create one above.</p>
            ) : (
              branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                  {editingId === branch.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(branch.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" onClick={() => saveEdit(branch.id)} disabled={busy}>
                        <Check className="h-4 w-4 text-green-700" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-primary">{branch.name}</p>
                        <p className="text-xs text-muted-foreground">{branch.member_count} member{branch.member_count !== 1 ? "s" : ""}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(branch)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(branch)}
                        disabled={(branch.member_count || 0) > 0}
                        title={(branch.member_count || 0) > 0 ? "Move all members out first" : "Delete branch"}
                      >
                        <Trash2 className={`h-4 w-4 ${(branch.member_count || 0) > 0 ? "text-muted-foreground/30" : "text-destructive"}`} />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the branch. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteBranch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
};

export default AdminBranches;
