import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Branch = { id: string; name: string };
type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  roles: string[];
  branch_id: string | null;
};

const ADMIN_ROLES = ["admin", "officer", "branch_rep"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin (full rights)",
  officer: "Officer (read-only)",
  branch_rep: "Branch rep",
};

const ROLE_SELECT_LABELS: Record<AdminRole, string> = {
  admin: "Admin (full rights)",
  officer: "Officer (read-only)",
  branch_rep: "Branch rep",
};

const MAX_ADMINS = 4;

const AdminRoles = () => {
  const { isAdmin, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [updating, setUpdating] = useState(false);

  // Assign form state
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>("officer");
  const [selectedBranch, setSelectedBranch] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: profs, error: profErr },
      { data: roleRows, error: roleErr },
      { data: branchAdmins },
      { data: brs },
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("branch_admins").select("user_id, branch_id"),
      supabase.from("branches").select("id, name").order("name"),
    ]);

    if (profErr || roleErr) {
      toast({
        title: "Error loading data",
        description: (profErr ?? roleErr)?.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const roleMap: Record<string, string[]> = {};
    for (const r of roleRows ?? []) {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    }

    const branchMap: Record<string, string> = {};
    for (const ba of branchAdmins ?? []) branchMap[ba.user_id] = ba.branch_id;

    setProfiles(
      (profs ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        phone: (p as any).phone ?? null,
        roles: roleMap[p.id] ?? [],
        branch_id: branchMap[p.id] ?? null,
      }))
    );
    setBranches(brs ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return profiles
      .filter((p) => {
        const hasRole = p.roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
        return (
          !hasRole &&
          (p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q))
        );
      })
      .slice(0, 5);
  }, [search, profiles]);

  const callManageRole = async (
    action: "assign" | "remove",
    targetUserId: string,
    role: AdminRole,
    branchId?: string
  ): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke("manage-role", {
      body: { action, target_user_id: targetUserId, role, branch_id: branchId ?? null },
    });
    if (error || (data as any)?.error) {
      toast({
        title: action === "assign" ? "Could not assign role" : "Could not remove role",
        description: (data as any)?.error ?? error?.message,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleAssign = async () => {
    if (!selectedProfile) {
      toast({ title: "Search and select a member first", variant: "destructive" });
      return;
    }
    if (selectedRole === "branch_rep" && !selectedBranch) {
      toast({ title: "Select a branch first", variant: "destructive" });
      return;
    }
    setUpdating(true);
    const ok = await callManageRole(
      "assign",
      selectedProfile.id,
      selectedRole,
      selectedRole === "branch_rep" ? selectedBranch : undefined
    );
    if (ok) {
      toast({ title: "Role assigned successfully" });
      await refreshAuth(); // Ensure current auth session updates
      await fetchAll();
      setSearch("");
      setSelectedProfile(null);
      setSelectedBranch("");
    }
    setUpdating(false);
  };

  const handleRemove = async (profile: ProfileRow, role: AdminRole) => {
    setUpdating(true);
    const ok = await callManageRole("remove", profile.id, role);
    if (ok) {
      toast({ title: "Role removed" });
      await refreshAuth(); // Ensure current auth session updates
      await fetchAll();
    }
    setUpdating(false);
  };

  const byRole = useMemo(() => {
    const map: Record<AdminRole, ProfileRow[]> = { admin: [], officer: [], branch_rep: [] };
    for (const p of profiles) {
      for (const role of ADMIN_ROLES) {
        if (p.roles.includes(role)) map[role].push(p);
      }
    }
    return map;
  }, [profiles]);

  const adminCount = byRole.admin.length;

  if (!isAdmin) {
    return (
      <PortalLayout>
        <div className="p-8 text-center text-destructive">Unauthorized access.</div>
      </PortalLayout>
    );
  }

  if (loading) {
    return (
      <PortalLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display text-primary">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Up to <strong>4 admins</strong> total. Officers see everything but cannot edit. Branch reps see their branch only.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assign a role</CardTitle>
            <CardDescription>Search by name or phone. The person must already have a login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search member name or phone."
                value={selectedProfile ? selectedProfile.full_name : search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedProfile(null);
                }}
              />
              {suggestions.length > 0 && !selectedProfile && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                      onClick={() => {
                        setSelectedProfile(p);
                        setSearch("");
                      }}
                    >
                      <span className="font-medium">{p.full_name}</span>
                      {p.phone && <span className="ml-2 text-muted-foreground text-xs">{p.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v as AdminRole); setSelectedBranch(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_SELECT_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedRole === "branch_rep" && (
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger><SelectValue placeholder="Select branch…" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button variant="hero" className="w-full" disabled={updating || !selectedProfile} onClick={handleAssign}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "+ "} Assign
            </Button>
          </CardContent>
        </Card>

        {ADMIN_ROLES.map((role) => {
          const holders = byRole[role];
          const cap = role === "admin" ? MAX_ADMINS : null;

          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{ROLE_LABELS[role]}</CardTitle>
                  {cap !== null && <span className="text-sm font-semibold bg-secondary px-2.5 py-0.5 rounded-full">{adminCount} / {cap}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {holders.length === 0 ? <p className="text-sm text-muted-foreground italic">None assigned.</p> : holders.map((p) => {
                  const branchName = role === "branch_rep" && p.branch_id ? branches.find((b) => b.id === p.branch_id)?.name : null;
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div>
                        <p className="font-medium text-sm">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone ?? ""} {branchName ? ` · ${branchName}` : ""}</p>
                      </div>
                      <button className="text-muted-foreground hover:text-destructive transition-colors ml-4" disabled={updating} onClick={() => handleRemove(p, role)} aria-label={`Remove ${p.full_name}`}>
                        {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PortalLayout>
  );
};

export default AdminRoles;
