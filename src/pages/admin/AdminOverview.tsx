import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, Users, AlertTriangle, MapPin, Wallet, Coins, 
  Shield, Download, KeyRound, Copy, Check, UserPlus, 
  UserCheck, UserX 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadMembersExcel } from "@/lib/exportExcel";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Interfaces & Types ---
interface Branch { 
  id: string; 
  name: string; 
}

interface MemberRecord {
  id: string; 
  full_name: string;
  category: "full_member" | "student" | "woman";
  status: "active" | "dormant" | "suspended" | "left_welfare";
  branch_id: string | null; 
  profile_id: string | null;
  development_paid: number | null; 
  fpf_paid: number | null; 
  advance_subscription_paid: number | null;
}

interface Arrear { 
  amount: number; 
  cleared: boolean; 
  member_record_id: string; 
}

interface ResetRequest { 
  id: string; 
  full_name: string; 
  phone: string; 
  reset_requested_at: string | null; 
}

interface FamilyRequest {
  id: string; 
  full_name: string; 
  category: "child" | "woman" | "student";
  phone: string | null; 
  birth_month: number | null; 
  birth_year: number | null;
  family_id: string | null; 
  submitted_by_profile_id: string; 
  created_at: string;
  profiles: { full_name: string } | null;
  families: { family_name: string } | null;
}

interface StatusBreakdownItem { 
  count: number; 
  arrears: number; 
}

const STATUS_LABELS: Record<MemberRecord["status"], string> = {
  active: "Active", 
  dormant: "Dormant", 
  suspended: "Suspended", 
  left_welfare: "Left welfare",
};

const STATUS_KEYS: MemberRecord["status"][] = ["active", "dormant", "suspended", "left_welfare"];

const AdminOverview = () => {
  const { isAdmin, isOfficer, isBranchRep, branchAdminIds = [], refreshAuth, user } = useAuth();
  const branchScoped = isBranchRep && !isAdmin && !isOfficer;

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<MemberRecord[]>([]);
  const [arrears, setArrears] = useState<Arrear[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [familyRequests, setFamilyRequests] = useState<FamilyRequest[]>([]);

  const [exporting, setExporting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [pwFormat, setPwFormat] = useState<"year" | "mmdd">("year");
  const [copied, setCopied] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);

  const branchAdminIdsString = useMemo(() => branchAdminIds.join(","), [branchAdminIds]);

  // --- Data Loading: single RPC instead of 5 separate queries ---
  const loadDashboardData = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_overview_data");
      if (error) throw error;

      let allBranches = (data?.branches as Branch[]) || [];
      let allRecs = (data?.member_records as MemberRecord[]) || [];
      const allArrears = (data?.arrears as Arrear[]) || [];
      const allResets = (data?.reset_requests as ResetRequest[]) || [];
      const allFamilyReqs = (data?.family_requests as FamilyRequest[]) || [];

      if (branchScoped) {
        allBranches = allBranches.filter((b) => branchAdminIds.includes(b.id));
        allRecs = allRecs.filter((r) => r.branch_id && branchAdminIds.includes(r.branch_id));
      }

      const recIds = new Set(allRecs.map((r) => r.id));
      setBranches(allBranches);
      setRecords(allRecs);
      setArrears(allArrears.filter((a) => recIds.has(a.member_record_id)));
      setResetRequests(allResets);
      setFamilyRequests(allFamilyReqs);
    } catch (error: any) {
      toast({ title: "Failed to load dashboard data", description: error?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [branchScoped, branchAdminIdsString, isAdmin, branchAdminIds]);

  useEffect(() => { 
    loadDashboardData(); 
  }, [loadDashboardData]);

  // --- Memoized Aggregations ---
  const totalArrears = useMemo(() => arrears.reduce((s, a) => s + Number(a.amount), 0), [arrears]);
  
  const arrearsByMember = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of arrears) {
      map[a.member_record_id] = (map[a.member_record_id] || 0) + Number(a.amount);
    }
    return map;
  }, [arrears]);

  const arrearsByStatus = useMemo(() => {
    const map: Record<MemberRecord["status"], { total: number; count: number }> = {
      active: { total: 0, count: 0 }, 
      dormant: { total: 0, count: 0 },
      suspended: { total: 0, count: 0 }, 
      left_welfare: { total: 0, count: 0 },
    };
    for (const r of records) {
      const owed = arrearsByMember[r.id] || 0;
      if (owed > 0 && map[r.status]) { 
        map[r.status].total += owed; 
        map[r.status].count += 1; 
      }
    }
    return map;
  }, [records, arrearsByMember]);

  const devTotal = useMemo(() => records.reduce((s, r) => s + Number(r.development_paid || 0), 0), [records]);
  const devCount = useMemo(() => records.filter((r) => Number(r.development_paid) > 0).length, [records]);
  const fefTotal = useMemo(() => records.reduce((s, r) => s + Number(r.fpf_paid || 0), 0), [records]);
  const fefCount = useMemo(() => records.filter((r) => Number(r.fpf_paid) > 0).length, [records]);
  const advTotal = useMemo(() => records.reduce((s, r) => s + Number(r.advance_subscription_paid || 0), 0), [records]);

  const byBranch = useMemo(() => branches.map((b) => {
    const bm = records.filter((r) => r.branch_id === b.id);
    let full = 0, women = 0, students = 0, active = 0, dormant = 0;
    const statusBreakdown: Record<MemberRecord["status"], StatusBreakdownItem> = {
      active: { count: 0, arrears: 0 }, 
      dormant: { count: 0, arrears: 0 },
      suspended: { count: 0, arrears: 0 }, 
      left_welfare: { count: 0, arrears: 0 },
    };
    for (const r of bm) {
      if (r.category === "full_member") full++;
      else if (r.category === "woman") women++;
      else if (r.category === "student") students++;
      
      if (r.status === "active") active++;
      else if (r.status === "dormant") dormant++;
      
      if (statusBreakdown[r.status]) {
        statusBreakdown[r.status].count += 1;
        statusBreakdown[r.status].arrears += arrearsByMember[r.id] || 0;
      }
    }
    return { ...b, total: bm.length, full, women, students, active, dormant, statusBreakdown };
  }), [branches, records, arrearsByMember]);

  // --- Handlers ---
  const exportAll = async () => {
    setExporting(true);
    try { 
      await downloadMembersExcel(null, "kaler-members-all"); 
    } catch (e: any) { 
      toast({ title: "Export failed", description: e.message, variant: "destructive" }); 
    } finally { 
      setExporting(false); 
    }
  };

  const approveReset = async (profileId: string) => {
    setApproving(profileId);
    try {
      const { data: mr } = await supabase.from("member_records").select("id").eq("profile_id", profileId).maybeSingle();
      if (!mr?.id) { 
        toast({ title: "No linked member record", variant: "destructive" }); 
        return; 
      }
      const { data, error } = await supabase.functions.invoke("reset-member-password", { 
        body: { member_record_id: mr.id, format: pwFormat } 
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      
      setTempPassword((data as any).temp_password);
      setCopied(false);
      await refreshAuth();
      await loadDashboardData();
    } catch (err: any) {
      toast({ title: "Could not reset", description: err.message, variant: "destructive" });
    } finally { 
      setApproving(null); 
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(cancelTarget.id);
    try {
      const { error } = await supabase.rpc("cancel_password_reset_request", { _profile_id: cancelTarget.id });
      if (error) throw error;
      toast({ title: "Request cancelled" });
      await loadDashboardData();
    } catch (error: any) {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    } finally { 
      setCancelling(null); 
      setCancelTarget(null); 
    }
  };

  const admitFamilyRequest = async (req: FamilyRequest) => {
    setProcessingRequest(req.id);
    try {
      const adminUserId = user?.id;

      if (req.category === "child") {
        await supabase.from("family_requests").update({ 
          status: "approved", 
          reviewed_at: new Date().toISOString(), 
          reviewed_by: adminUserId,
        }).eq("id", req.id);
      } else {
        const branchRes = await supabase.from("member_records").select("branch_id").eq("profile_id", req.submitted_by_profile_id).maybeSingle();
        const branchId = branchRes.data?.branch_id || null;
        
        const { data: newRec, error: recErr } = await supabase.from("member_records").insert({
          full_name: req.full_name, 
          phone: req.phone || null,
          category: req.category === "woman" ? "woman" : "student",
          status: "active", 
          branch_id: branchId, 
          family_id: req.family_id,
        }).select("id").single();
        
        if (recErr || !newRec) throw recErr || new Error("Could not create member record");
        
        if (req.category === "student" || req.category === "woman") {
          await supabase.from("arrears").insert([
            { member_record_id: newRec.id, type: "subscription", year: new Date().getFullYear(), amount: 200 },
            { member_record_id: newRec.id, type: "fines_penalties", year: new Date().getFullYear(), amount: 500, funeral_name: "Registration fee" },
          ]);
        }
        
        await supabase.from("family_requests").update({ 
          status: "approved", 
          reviewed_at: new Date().toISOString(), 
          reviewed_by: adminUserId,
          member_record_id: newRec.id,
        }).eq("id", req.id);
      }
      toast({ 
        title: `${req.full_name} admitted`, 
        description: (req.category === "student" || req.category === "woman") ? "Arrears of Ksh 700 created." : "Added to family." 
      });
      await loadDashboardData();
    } catch (err: any) {
      toast({ title: "Admit failed", description: err.message, variant: "destructive" });
    } finally { 
      setProcessingRequest(null); 
    }
  };

  const rejectFamilyRequest = async (req: FamilyRequest) => {
    setProcessingRequest(req.id);
    try {
      const { error } = await supabase.from("family_requests").delete().eq("id", req.id);
      
      if (error) throw error;
      toast({ title: `${req.full_name} request rejected and removed` });
      await loadDashboardData();
    } catch (error: any) {
      toast({ title: "Reject failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingRequest(null);
    }
  };

  const copyToClipboard = () => {
    if (tempPassword) { 
      navigator.clipboard.writeText(tempPassword); 
      setCopied(true); 
      toast({ title: "Copied to clipboard" }); 
    }
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold tracking-widest uppercase text-accent">Admin</p>
            <h1 className="font-display text-3xl text-primary">Secretary dashboard</h1>
          </div>
          <Button onClick={exportAll} disabled={exporting} variant="outline">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-2" /> Download all (Excel)</>}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Total members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-primary">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Branches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-primary">{branches.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700"><Wallet className="h-4 w-4" />Development Fund</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display text-green-700">Ksh {devTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{devCount} contributors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700"><Coins className="h-4 w-4" />FEF</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display text-green-700">Ksh {fefTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{fefCount} contributors</p>
              <p className="text-xs text-muted-foreground mt-2 font-semibold">Adv. Contribution</p>
              <p className="text-2xl font-display text-green-700">Ksh {advTotal.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Arrears Summary */}
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

        {/* Password Resets */}
        {isAdmin && (
          <Card className="border-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-accent" /> Password reset requests</CardTitle>
              <CardDescription>Verify each member offline (e.g. by phone) before approving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm mb-4">
                <span className="text-muted-foreground">Temp password format:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={pwFormat === "year"} onChange={() => setPwFormat("year")} />
                  <span>Kaler{new Date().getFullYear()}</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={pwFormat === "mmdd"} onChange={() => setPwFormat("mmdd")} />
                  <span>Kaler{String(new Date().getMonth() + 1).padStart(2, "0")}{String(new Date().getDate()).padStart(2, "0")}</span>
                </label>
              </div>
              {resetRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                <ul className="divide-y">
                  {resetRequests.map((r) => (
                    <li key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-primary">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.phone}{r.reset_requested_at ? ` · requested ${new Date(r.reset_requested_at).toLocaleString()}` : ""}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={cancelling === r.id || approving === r.id} onClick={() => setCancelTarget({ id: r.id, name: r.full_name })}>
                          {cancelling === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
                        </Button>
                        <Button size="sm" variant="hero" disabled={approving === r.id || cancelling === r.id} onClick={() => approveReset(r.id)}>
                          {approving === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & issue temp password"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Family Admission Requests */}
        {isAdmin && familyRequests.length > 0 && (
          <Card className="border-orange-400/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-orange-500" /> Family admission requests</CardTitle>
              <CardDescription>Verify each person offline before admitting. Women and students pending review are listed here.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {familyRequests.map((req) => {
                  const submittedBy = req.profiles?.full_name || "Unknown member";
                  const familyName = req.families?.family_name || "Unknown family";
                  
                  let age: number | null = null;
                  if (req.birth_month && req.birth_year) {
                    const today = new Date();
                    age = today.getFullYear() - req.birth_year;
                    if (today.getMonth() + 1 < req.birth_month) age--;
                  }

                  return (
                    <li key={req.id} className="py-4 flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <p className="font-medium text-primary">{req.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{req.category}{age !== null ? ` · Age ${age}` : ""}{req.phone ? ` · ${req.phone}` : ""}</p>
                        <p className="text-xs text-muted-foreground">Submitted by <b>{submittedBy}</b> · Family: <b>{familyName}</b></p>
                        <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={processingRequest === req.id} onClick={() => rejectFamilyRequest(req)} className="text-destructive border-destructive/40 hover:bg-destructive/10">
                          {processingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserX className="h-4 w-4 mr-1" /> Reject</>}
                        </Button>
                        <Button size="sm" variant="hero" disabled={processingRequest === req.id} onClick={() => admitFamilyRequest(req)}>
                          {processingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserCheck className="h-4 w-4 mr-1" /> Admit</>}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Branches Grid */}
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
                        <span>{STATUS_LABELS[k]} ({sb.count})</span>
                        <span>Arrears – Ksh {sb.arrears.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Link to="/admin/members" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary">All members</p><p className="text-xs text-muted-foreground">Search, edit, add new members</p></Link>
            <Link to="/admin/import" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary">Bulk Excel import</p><p className="text-xs text-muted-foreground">Upload .xlsx to update everyone at once</p></Link>
            <Link to="/admin/events" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary">Mass arrears event</p><p className="text-xs text-muted-foreground">Add a yearly subscription or funeral charge to many members</p></Link>
            <Link to="/admin/families" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary">Merge into a family</p><p className="text-xs text-muted-foreground">Link members together into one family</p></Link>
            <Link to="/admin/all-families" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary">All families</p><p className="text-xs text-muted-foreground">View, rename, remove members, or delete families</p></Link>
            <Link to="/admin/branches" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary">Branches</p><p className="text-xs text-muted-foreground">Create, rename or delete branches</p></Link>
            {isAdmin && <Link to="/admin/audit" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary">Audit log</p><p className="text-xs text-muted-foreground">Who changed what, when</p></Link>}
            <Link to="/admin/roles" className="px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"><p className="font-medium text-primary flex items-center gap-2"><Shield className="h-4 w-4" /> Roles &amp; permissions</p><p className="text-xs text-muted-foreground">Admins, officers, branch reps</p></Link>
          </CardContent>
        </Card>
      </div>

      {/* Temp Password Modal */}
      <AlertDialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temporary Password Generated</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              Copy this password and share it safely with the member. It will not be shown again.
              <div className="relative mt-4 p-4 bg-muted rounded font-mono text-xl text-center select-all border flex items-center justify-center gap-3">
                <span className="text-foreground">{tempPassword}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter><AlertDialogAction onClick={() => setTempPassword(null)}>I have copied it</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Reset Modal */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel the password reset request from {cancelTarget?.name}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Yes, cancel request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
};

export default AdminOverview;
