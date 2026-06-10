import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, AlertTriangle, CheckCircle2, Wallet, AlertOctagon } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";

type Profile = { 
  id: string; 
  full_name: string; 
  phone: string; 
  family_id: string | null; 
};

type MemberRecord = {
  id: string;
  full_name: string;
  phone: string | null;
  category: "full_member" | "student" | "woman";
  status: "active" | "dormant" | "suspended" | "left_welfare";
  branch_id: string | null;
  family_id: string | null;
  profile_id: string | null;
  development_paid: number | null;
  fpf_paid: number | null;
  advance_subscription_paid: number | null;
};

type Arrear = {
  id: string;
  member_record_id: string;
  type: string;
  year: number | null;
  funeral_name: string | null;
  amount: number;
  cleared: boolean;
};

type Branch = { 
  id: string; 
  name: string; 
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Profile | null>(null);
  const [myRecord, setMyRecord] = useState<MemberRecord | null>(null);
  const [familyRecords, setFamilyRecords] = useState<MemberRecord[]>([]);
  const [arrears, setArrears] = useState<Arrear[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true; // Prevents state updates if user navigates away mid-request
    
    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_dashboard_data");

        if (rpcError) throw rpcError;

        if (isMounted) {
          const profile = data?.profile as Profile | null;
          const brs = (data?.branches as Branch[]) || [];
          const recs = (data?.member_records as MemberRecord[]) || [];
          const arr = (data?.arrears as Arrear[]) || [];

          setMe(profile);
          setBranches(brs);
          setFamilyRecords(recs);
          setMyRecord(recs.find((r) => r.profile_id === user.id) ?? null);
          setArrears(arr);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Derived calculations wrapped in useMemo for optimal rendering performance
  const branchMap = useMemo(() => new Map(branches.map(b => [b.id, b.name])), [branches]);
  const branchName = (id: string | null) => (id ? branchMap.get(id) : null) ?? "—";

  const totalArrears = useMemo(() => arrears.reduce((s, a) => s + Number(a.amount || 0), 0), [arrears]);
  const totalDevPaid = useMemo(() => familyRecords.reduce((s, r) => s + Number(r.development_paid || 0), 0), [familyRecords]);
  const totalFpfPaid = useMemo(() => familyRecords.reduce((s, r) => s + Number(r.fpf_paid || 0), 0), [familyRecords]);
  const totalAdvPaid = useMemo(() => familyRecords.reduce((s, r) => s + Number(r.advance_subscription_paid || 0), 0), [familyRecords]);
  
  // Creates a quick lookup map for member arrears totals to prevent heavy calculations in loops
  const memberArrearsMap = useMemo(() => {
    const map = new Map<string, number>();
    arrears.forEach((a) => {
      const current = map.get(a.member_record_id) || 0;
      map.set(a.member_record_id, current + Number(a.amount || 0));
    });
    return map;
  }, [arrears]);

  const status = myRecord?.status;

  if (loading) {
    return (
      <PortalLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </PortalLayout>
    );
  }

  if (!myRecord && familyRecords.length === 0) {
    return (
      <PortalLayout>
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {me?.full_name || "member"}</CardTitle>
            <CardDescription>
              Your login is not yet linked to a member record. Please contact the secretary{" "}
              <strong>Joseph Oluoch</strong> on{" "}
              <a className="text-primary hover:underline" href="tel:+254701594936">
                0701 594 936
              </a>{" "}
              to link your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <p className="text-sm text-muted-foreground">Karibu</p>
          <h1 className="font-display text-3xl text-primary">{myRecord?.full_name || me?.full_name}</h1>
          {myRecord && (
            <p className="text-sm text-muted-foreground mt-1">
              {branchName(myRecord.branch_id)} branch · {myRecord.category.replace("_", " ")}
            </p>
          )}
        </div>

        {/* Status Alerts */}
        {status === "active" && (
          <Card className="border-green-700/40 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" /> Active Member
              </CardTitle>
            </CardHeader>
          </Card>
        )}
        
        {status === "dormant" && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="h-5 w-5" /> Membership marked dormant
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-2">
                Per Article 5(f), members who fail to pay annual subscriptions for more than six months automatically cease to be members and are struck off the register. Per Article 19(c), failure to pay funeral contributions for two consecutive funerals also results in cessation of membership. Reinstatement is possible upon clearing all arrears and required contributions.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {status === "left_welfare" && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="h-5 w-5" /> Left Welfare
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-2">
                Per Article 5(c), members who resign are not entitled to refunds of subscriptions or contributions.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {status === "suspended" && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="h-5 w-5" /> Suspended
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-2">
                Per Article 5(d), members may be suspended or expelled if their conduct harms the reputation or dignity of the society or contravenes the constitution. Suspended members retain the right to address the general meeting considering their expulsion.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-primary">{familyRecords.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Outstanding arrears
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl text-destructive">
                <span className="font-display">Ksh</span>{" "}
                <span className="font-sans tabular-nums">{totalArrears.toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Funds contributed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-3xl font-display text-green-700">
                  Ksh {(totalDevPaid + totalFpfPaid).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dev: {totalDevPaid.toLocaleString()} · FEF: {totalFpfPaid.toLocaleString()}
                </p>
              </div>
              {totalAdvPaid > 0 && (
                <div className="border-t pt-2 border-green-100">
                  <p className="text-xs text-muted-foreground">Adv. Contribution</p>
                  <p className="text-xl font-display text-green-700">Ksh {totalAdvPaid.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* M-Pesa Payment Card */}
        {totalArrears > 0 && (
          <Card className="border-accent bg-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-accent" />
                Pay your arrears
              </CardTitle>
              <CardDescription>
                Use M-Pesa Paybill below, then forward the confirmation SMS to the secretary.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Paybill</p>
                <p className="font-display text-2xl text-primary">247247</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Account number</p>
                <p className="font-display text-2xl text-primary">0020182728325</p>
              </div>
              <div className="sm:col-span-2 text-muted-foreground mt-2">
                After payment, forward the M-Pesa confirmation to secretary Joseph Oluoch on{" "}
                <a className="text-primary font-medium hover:underline" href="tel:+254701594936">
                  0701 594 936
                </a>
                .
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Family members</CardTitle>
            <CardDescription>Everyone in your linked family record</CardDescription>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Arrears</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyRecords.map((r) => {
                  const memberArrears = memberArrearsMap.get(r.id) || 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.full_name}
                        {r.profile_id === user?.id && (
                          <Badge variant="secondary" className="ml-2">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{branchName(r.branch_id)}</TableCell>
                      <TableCell className="capitalize">{r.category.replace("_", " ")}</TableCell>
                      <TableCell>{r.phone ? formatPhoneDisplay(r.phone) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : "destructive"} className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {memberArrears > 0 ? (
                          <span className="text-destructive">Ksh {memberArrears.toLocaleString()}</span>
                        ) : (
                          <span className="text-green-700">Cleared</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Arrears Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Arrears breakdown</CardTitle>
            <CardDescription>What's owed and to which fund</CardDescription>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto whitespace-nowrap">
            {arrears.length === 0 ? (
              <p className="text-muted-foreground text-sm">All contributions cleared. Asante sana!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Amount (Ksh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrears.map((a) => {
                    const rec = familyRecords.find((r) => r.id === a.member_record_id);
                    const detail =
                      a.type === "subscription"
                        ? `Annual subs ${a.year}`
                        : a.type === "funeral"
                        ? `${a.funeral_name} funeral`
                        : a.year || a.funeral_name || "—";
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{rec?.full_name || "—"}</TableCell>
                        <TableCell className="capitalize">{a.type.replace("_", " ")}</TableCell>
                        <TableCell>{detail}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {Number(a.amount || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default Dashboard;
