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
