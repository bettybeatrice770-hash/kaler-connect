import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, Plus, X, Search } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin (full rights)",
  officer: "Officer (read-only, sees all)",
  branch_rep: "Branch rep (read-only, one branch)",
};

const AdminRoles = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [branchAdmins, setBranchAdmins] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<any>(null);
  const [pickedRole, setPickedRole] = useState<string>("officer");
  const [pickedBranch, setPickedBranch] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [{ data: r }, { data: p }, { data: ba }, { data: brs }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("profiles").select("id, full_name, phone"),
      supabase.from("branch_admins").select("*"),
      supabase.from("branches").select("*").order("name"),
    ]);
    setRoles(r || []); setProfiles(p || []); setBranchAdmins(ba || []); setBranches(brs || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const profileById = (id: string) => profiles.find((p) => p.id === id);
  const branchById = (id: string) => branches.find((b) => b.id === id);

  const filteredProfiles = profiles.filter((p) => {
    if (!search.trim()) return false;
    const q = search.toLowerCase();
    return p.full_name?.toLowerCase().includes(q) || (p.phone || "").includes(q);
  }).slice(0, 8);

  const adminCount = roles.filter((r) => r.role === "admin").length;

  const assign = async () => {
    if (!picked) return toast({ title: "Pick a member first", variant: "destructive" });

    // Check if user already has an administrative role
    const adminRoles = ["admin", "officer", "branch_rep"];
    const existing = roles.find((r) => r.user_id === picked.id && adminRoles.includes(r.role));
    if (existing) {
      return toast({
        title: "User already has a role",
        description: `This member is already a ${existing.role}. Remove that role first.`,
        variant: "destructive",
      });
    }

    if (pickedRole === "admin" && adminCount >= 4) return toast({ title: "Max 4 admins allowed", variant: "destructive" });
    if (pickedRole === "branch_rep" && !pickedBranch) return toast({ title: "Pick a branch", variant: "destructive" });
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-role", {
      body: { action: "assign", target_user_id: picked.id, role: pickedRole, branch_id: pickedBranch || undefined },
    });
    setBusy(false);
    if (error || (data as any)?.error) return toast({ title: "Failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    toast({ title: "Role assigned" });
    setPicked(null); setSearch(""); setPickedBranch(""); reload();
  };

  const remove = async (userId: string, role: string) => {
    if (!confirm(`Remove ${role} role from this user?`)) return;
    const { data, error } = await supabase.functions.invoke("manage-role", { body: { action: "remove", target_user_id: userId, role } });
    if (error || (data as any)?.error) return toast({ title: "Failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    toast({ title: "Role removed" });
    reload();
  };

  const grouped = ["admin", "officer", "branch_rep"].map((role) => ({
    role,
    rows: roles.filter((r) => r.role === role).map((r) => ({ ...r, profile: profileById(r.user_id) })),
  }));

  if (loading) return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></PortalLayout>;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back</Link></Button>
        <div>
          <h1 className="font-display text-3xl text-primary">Roles & permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Up to <b>4 admins</b> total (creator + secretary + assistant + one spare). Officers (chair, vice, treasurer) see everything but cannot edit. Branch reps see their branch only.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Assign a role</CardTitle>
            <CardDescription>Search by name or phone. The person must already have a login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search member name or phone..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPicked(null); }} />
              {search && !picked && (
                <div className="border rounded-md mt-1 max-h-60 overflow-y-auto bg-card">
                  {filteredProfiles.map((p) => (
                    <button key={p.id} onClick={() => { setPicked(p); setSearch(p.full_name); }} className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
                      <span className="font-medium">{p.full_name}</span> <span className="text-muted-foreground">{p.phone}</span>
                    </button>
                  ))}
                  {filteredProfiles.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>}
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Role</Label>
                <Select value={pickedRole} onValueChange={setPickedRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="officer">Officer (read-only)</SelectItem>
                    <SelectItem value="branch_rep">Branch rep</SelectItem>
                  </SelectContent>
                </Select></div>
              {pickedRole === "branch_rep" && (
                <div><Label>Branch</Label>
                  <Select value={pickedBranch} onValueChange={setPickedBranch}>
                    <SelectTrigger><SelectValue placeholder="Pick branch" /></SelectTrigger>
                    <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select></div>
              )}
              <div className="self-end">
                <Button onClick={assign} disabled={busy || !picked} variant="hero" className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Assign</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {grouped.map((g) => (
          <Card key={g.role}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{ROLE_LABELS[g.role]}</span>
                {g.role === "admin" && <Badge variant={adminCount >= 4 ? "destructive" : "secondary"}>{adminCount} / 4</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {g.rows.length === 0 && <p className="text-sm text-muted-foreground">No one assigned.</p>}
              {g.rows.map((r) => {
                const myBranches = g.role === "branch_rep" ? branchAdmins.filter((ba) => ba.user_id === r.user_id).map((ba) => branchById(ba.branch_id)?.name).filter(Boolean) : [];
                return (
                  <div key={r.id} className="flex items-center justify-between border rounded-md p-2">
                    <div>
                      <p className="font-medium">{r.profile?.full_name || r.user_id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.profile?.phone || "—"}
                        {myBranches.length > 0 && <> · branches: {myBranches.join(", ")}</>}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.user_id, r.role)}><X className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </PortalLayout>
  );
};

export default AdminRoles;
