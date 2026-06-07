import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Profile = {
  id: string;
  full_name: string;
  roles: string[];
};

const AdminRoles = () => {
  const { isAdmin, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, roles");
    if (error) {
      toast({ title: "Error loading profiles", description: error.message, variant: "destructive" });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const toggleRole = async (profileId: string, currentRoles: string[], role: string) => {
    setUpdating(profileId);
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    const { error } = await supabase
      .from("profiles")
      .update({ roles: newRoles })
      .eq("id", profileId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Roles updated" });
      await refreshAuth(); // Ensure the UI reflects the change
      fetchProfiles();
    }
    setUpdating(null);
  };

  if (!isAdmin) {
    return <PortalLayout><div className="p-8 text-center text-destructive">Unauthorized access.</div></PortalLayout>;
  }

  if (loading) return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></PortalLayout>;

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display text-primary">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage administrative access for staff and branch representatives.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Grant or revoke access to administrative dashboards.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {profiles.map((p) => (
                <div key={p.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-sm text-muted-foreground italic">Current: {p.roles.length > 0 ? p.roles.join(", ") : "No roles"}</p>
                  </div>
                  <div className="flex gap-2">
                    {["admin", "officer", "branch_rep"].map((role) => (
                      <Button
                        key={role}
                        variant={p.roles.includes(role) ? "default" : "outline"}
                        size="sm"
                        disabled={updating === p.id}
                        onClick={() => toggleRole(p.id, p.roles, role)}
                      >
                        {updating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : p.roles.includes(role) ? <UserMinus className="h-3 w-3 mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminRoles;
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
