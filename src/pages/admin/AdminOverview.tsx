import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, AlertTriangle, MapPin, Wallet, Coins, Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadMembersExcel } from "@/lib/exportExcel";
import { toast } from "@/hooks/use-toast";

type Branch = { id: string; name: string };
type MemberRecord = {
  id: string;
  full_name: string;
  category: "full_member" | "student" | "woman";
  status: "active" | "dormant" | "suspended" | "left_welfare";
  branch_id: string | null;
  profile_id: string | null;
  development_paid: number | null;
  fpf_paid: number | null;
  advance_subscription_paid: number | null;
};
type Arrear = { amount: number; cleared: boolean; member_record_id: string };

const STATUS_LABELS: Record<string, string> = {
  active: "Active", dormant: "Dormant", suspended: "Suspended", left_welfare: "Left welfare",
};
const STATUS_KEYS = ["active", "dormant", "suspended", "left_welfare"];

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<MemberRecord[]>([]);
  const [arrears, setArrears] = useState<Arrear[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: brs }, { data: recs }, { data: arr }] = await Promise.all([
        supabase.from("branches").select("*").order("name"),
        supabase.from("member_records").select("id, full_name, category, status, branch_id, profile_id, development_paid, fpf_paid, advance_subscription_paid"),
        supabase.from("arrears").select("amount, cleared, member_record_id").eq("cleared", false),
      ]);
      setBranches((brs as Branch[]) || []);
      setRecords((recs as MemberRecord[]) || []);
      setArrears((arr as Arrear[]) || []);
      setLoading(false);
    })();
  }, []);

  const totalArrears = useMemo(() => arrears.reduce((s, a) => s + Number(a.amount), 0), [arrears]);

  const arrearsByMember = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of arrears) m[a.member_record_id] = (m[a.member_record_id] || 0) + Number(a.amount);
    return m;
  }, [arrears]);

  const arrearsByStatus = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    STATUS_KEYS.forEach((k) => (m[k] = { total: 0, count: 0 }));
    for (const r of records) {
      const owed = arrearsByMember[r.id] || 0;
      if (owed > 0 && m[r.status]) {
        m[r.status].total += owed;
        m[r.status].count += 1;
      }
    }
    return m;
  }, [records, arrearsByMember]);

  const devTotal = useMemo(() => records.reduce((s, r) => s + Number(r.development_paid || 0), 0), [records]);
  const devCount = useMemo(() => records.filter((r) => Number(r.development_paid) > 0).length, [records]);
  const fefTotal = useMemo(() => records.reduce((s, r) => s + Number(r.fpf_paid || 0), 0), [records]);
  const fefCount = useMemo(() => records.filter((r) => Number(r.fpf_paid) > 0).length, [records]);
  const advTotal = useMemo(() => records.reduce((s, r) => s + Number(r.advance_subscription_paid || 0), 0), [records]);

  const byBranch = useMemo(() => branches.map((b) => {
    const rs = records.filter((r) => r.branch_id === b.id);
    const statusBreakdown: Record<string, { count: number; arrears: number }> = {};
    STATUS_KEYS.forEach((k) => (statusBreakdown[k] = { count: 0, arrears: 0 }));
    for (const r of rs) {
      if (statusBreakdown[r.status]) {
        statusBreakdown[r.status].count += 1;
        statusBreakdown[r.status].arrears += arrearsByMember[r.id] || 0;
      }
    }
    return {
      ...b, total: rs.length,
      full: rs.filter((r) => r.category === "full_member").length,
      women: rs.filter((r) => r.category === "woman").length,
      students: rs.filter((r) => r.category === "student").length,
      active: rs.filter((r) => r.status === "active").length,
      dormant: rs.filter((r) => r.status === "dormant").length,
      statusBreakdown,
    };
  }), [branches, records, arrearsByMember]);

  const exportAll = async () => {
    setExporting(true);
    try { await downloadMembersExcel(null, "kaler-members-all"); }
    catch (e: any) { toast({ title: "Export failed", description: e.message, variant: "destructive" }); }
    setExporting(false);
  };

  if (loading) return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></PortalLayout>;

  return (
    <PortalLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold tracking-widest uppercase text-accent">Admin</p>
            <h1 className="font-display text-3xl text-primary">Secretary dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage members, branches, and arrears across the welfare association.</p>
          </div>
          <Button onClick={exportAll} disabled={exporting} variant="outline">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4" /> Download all (Excel)</>}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" />Total members</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-display text-primary">{records.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><MapPin className="h-4 w-4" />Branches</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-display text-primary">{branches.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 text-green-700"><Wallet className="h-4 w-4" />Development Fund</CardDescription></CardHeader>
            <CardContent>
              <p className="text-2xl font-display text-green-700">Ksh {devTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{devCount} contributors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 text-green-700"><Coins className="h-4 w-4" />FEF</CardDescription></CardHeader>
            <CardContent>
              <p className="text-2xl font-display text-green-700">Ksh {fefTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{fefCount} contributors</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Arrears summary
            </CardTitle>
            <CardDescription>Grand total at the top, broken down by member status below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4">
              <p className="text-xs uppercase tracking-wider text-destructive font-semibold">Grand total arrears</p>
              <p className="text-4xl font-display text-destructive mt-1">Ksh {totalArrears.toLocaleString()}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {STATUS_KEYS.map((k) => (
                <div key={k} className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{STATUS_LABELS[k]}</p>
                  <p className="text-xl font-display text-primary">Ksh {arrearsByStatus[k].total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{arrearsByStatus[k].count} members</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Advance subscription savings on file: <b>Ksh {advTotal.toLocaleString()}</b></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <CardDescription>Click a branch to view its members</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {byBranch.map((b) => (
              <Link key={b.id} to={`/admin/members?branch=${b.id}`} className="group p-5 rounded-xl border border-border bg-card hover:shadow-elegant hover:-translate-y-0.5 transition-all">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl text-primary">{b.name}</p>
                  <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{b.total} members</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Full</p><p className="font-semibold">{b.full}</p></div>
                  <div><p className="text-xs text-muted-foreground">Women</p><p className="font-semibold">{b.women}</p></div>
                  <div><p className="text-xs text-muted-foreground">Students</p><p className="font-semibold">{b.students}</p></div>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  {STATUS_KEYS.map((k) => {
                    const sb = b.statusBreakdown[k];
                    const colorClass = k === "active" ? "text-green-700" : "text-destructive";
                    return (
                      <div key={k} className={`flex items-center justify-between ${colorClass}`}>
                        <span>{STATUS_LABELS[k]} {sb.count}</span>
                        <span>Arrears – Ksh {sb.arrears.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
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
            <Link to="/admin/roles" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="font-medium text-primary flex items-center gap-2"><Shield className="h-4 w-4" /> Roles &amp; permissions</p>
              <p className="text-xs text-muted-foreground">Admins, officers, branch reps</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminOverview;
