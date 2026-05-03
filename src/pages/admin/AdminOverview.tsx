import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, AlertTriangle, MapPin, UserCheck } from "lucide-react";

type Branch = { id: string; name: string };
type MemberRecord = {
  id: string;
  category: "full_member" | "student" | "woman";
  status: "active" | "dormant";
  branch_id: string | null;
  profile_id: string | null;
};
type Arrear = { amount: number };

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<MemberRecord[]>([]);
  const [arrears, setArrears] = useState<Arrear[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: brs }, { data: recs }, { data: arr }] = await Promise.all([
        supabase.from("branches").select("*").order("name"),
        supabase.from("member_records").select("id, category, status, branch_id, profile_id"),
        supabase.from("arrears").select("amount").eq("cleared", false),
      ]);
      setBranches((brs as Branch[]) || []);
      setRecords((recs as MemberRecord[]) || []);
      setArrears((arr as Arrear[]) || []);
      setLoading(false);
    })();
  }, []);

  const totalArrears = useMemo(() => arrears.reduce((s, a) => s + Number(a.amount), 0), [arrears]);
  const totalLinked = records.filter((r) => r.profile_id).length;

  const byBranch = useMemo(() => {
    return branches.map((b) => {
      const rs = records.filter((r) => r.branch_id === b.id);
      return {
        ...b,
        total: rs.length,
        full: rs.filter((r) => r.category === "full_member").length,
        women: rs.filter((r) => r.category === "woman").length,
        students: rs.filter((r) => r.category === "student").length,
        active: rs.filter((r) => r.status === "active").length,
        dormant: rs.filter((r) => r.status === "dormant").length,
      };
    });
  }, [branches, records]);

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
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Admin</p>
          <h1 className="font-display text-3xl text-primary">Secretary dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage members, branches, and arrears across the welfare association.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-primary">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Branches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-primary">{branches.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Open arrears
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-destructive">Ksh {totalArrears.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-green-700">
                <UserCheck className="h-4 w-4" />
                Linked logins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-green-700">{totalLinked}</p>
              <p className="text-xs text-muted-foreground">of {records.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <CardDescription>Click a branch to view its members</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {byBranch.map((b) => (
              <Link
                key={b.id}
                to={`/admin/members?branch=${b.id}`}
                className="group p-5 rounded-xl border border-border bg-card hover:shadow-elegant hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl text-primary">{b.name}</p>
                  <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                    {b.total} members
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Full</p>
                    <p className="font-semibold">{b.full}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Women</p>
                    <p className="font-semibold">{b.women}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="font-semibold">{b.students}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="text-green-700">● {b.active} active</span>
                  <span className="text-destructive">● {b.dormant} dormant</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Link to="/admin/members" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="font-medium text-primary">All members</p>
              <p className="text-xs text-muted-foreground">Search, edit, add new members</p>
            </Link>
            <Link to="/admin/import" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="font-medium text-primary">Bulk Excel import</p>
              <p className="text-xs text-muted-foreground">Upload .xlsx to update everyone at once</p>
            </Link>
            <Link to="/admin/events" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="font-medium text-primary">Mass arrears event</p>
              <p className="text-xs text-muted-foreground">Add a yearly subscription or funeral charge to many members</p>
            </Link>
            <Link to="/admin/families" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="font-medium text-primary">Families &amp; merge</p>
              <p className="text-xs text-muted-foreground">Group spouses into one family</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminOverview;
