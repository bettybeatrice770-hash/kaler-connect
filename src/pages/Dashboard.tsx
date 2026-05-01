import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";

type Profile = { id: string; full_name: string; phone: string; relationship: string | null; is_adult: boolean; family_id: string | null };
type Family = { id: string; family_name: string };
type Dependent = { id: string; full_name: string; relationship: string | null };
type Contribution = { id: string; profile_id: string; type: string; amount: number; year: number | null; status: string; paid_at: string | null; notes: string | null };

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [contribs, setContribs] = useState<Contribution[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setMe(profile as Profile | null);
      if (profile?.family_id) {
        const [{ data: fam }, { data: mem }, { data: dep }, { data: con }] = await Promise.all([
          supabase.from("families").select("*").eq("id", profile.family_id).maybeSingle(),
          supabase.from("profiles").select("*").eq("family_id", profile.family_id).order("full_name"),
          supabase.from("dependents").select("*").eq("family_id", profile.family_id).order("full_name"),
          supabase.from("contributions").select("*").eq("family_id", profile.family_id).order("created_at", { ascending: false }),
        ]);
        setFamily(fam as Family | null);
        setMembers((mem as Profile[]) || []);
        setDependents((dep as Dependent[]) || []);
        setContribs((con as Contribution[]) || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const totalArrears = contribs.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = contribs.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);

  const memberName = (id: string) => members.find((m) => m.id === id)?.full_name || "—";

  if (loading) {
    return (
      <PortalLayout>
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </PortalLayout>
    );
  }

  if (!me?.family_id) {
    return (
      <PortalLayout>
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {me?.full_name || "member"}</CardTitle>
            <CardDescription>
              Your account is not yet linked to a family record. Please contact the secretary
              <strong> Joseph Oluoch</strong> on <a className="text-primary" href="tel:+254701594936">0701 594 936</a>.
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">Karibu</p>
          <h1 className="font-display text-3xl text-primary">{family?.family_name} Family</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" />Family members</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-display text-primary">{members.length + dependents.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Outstanding arrears</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-display text-destructive">Ksh {totalArrears.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-4 w-4" />Total paid</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-display text-green-700">Ksh {totalPaid.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        {totalArrears > 0 && (
          <Card className="border-accent bg-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-accent" />Pay your arrears</CardTitle>
              <CardDescription>Use M-Pesa Paybill below, then forward the confirmation SMS to the secretary.</CardDescription>
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
              <div className="sm:col-span-2 text-muted-foreground">
                After payment, forward the M-Pesa confirmation to secretary Joseph Oluoch on{" "}
                <a className="text-primary font-medium" href="tel:+254701594936">0701 594 936</a>.
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Family members</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name}{m.id === me.id && <Badge variant="secondary" className="ml-2">You</Badge>}</TableCell>
                    <TableCell>{m.relationship || "—"}</TableCell>
                    <TableCell>{formatPhoneDisplay(m.phone)}</TableCell>
                    <TableCell><Badge variant="outline">{m.is_adult ? "Adult" : "Minor"}</Badge></TableCell>
                  </TableRow>
                ))}
                {dependents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.full_name}</TableCell>
                    <TableCell>{d.relationship || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell><Badge variant="outline">Dependent</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contributions & arrears</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {contribs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No contributions on record yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Amount (Ksh)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid on</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contribs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{memberName(c.profile_id)}</TableCell>
                      <TableCell className="capitalize">{c.type}</TableCell>
                      <TableCell>{c.year || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{Number(c.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "paid" ? "default" : c.status === "pending" ? "destructive" : "secondary"} className="capitalize">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.paid_at ? new Date(c.paid_at).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
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
