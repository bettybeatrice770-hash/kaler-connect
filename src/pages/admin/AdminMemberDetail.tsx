import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, KeyRound } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";

const AdminMemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [branch, setBranch] = useState<any>(null);
  const [arrears, setArrears] = useState<any[]>([]);
  const [password, setPassword] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: rec } = await supabase.from("member_records").select("*").eq("id", id).maybeSingle();
    setRecord(rec);
    if (rec?.branch_id) {
      const { data: br } = await supabase.from("branches").select("*").eq("id", rec.branch_id).maybeSingle();
      setBranch(br);
    }
    const { data: arr } = await supabase
      .from("arrears").select("*").eq("member_record_id", id).order("year", { ascending: true });
    setArrears(arr || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const issueLogin = async () => {
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("issue-member-login", {
      body: { member_record_id: id, password },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not issue login", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Login created", description: `${record.full_name} can now sign in with ${record.phone}` });
    setPassword("");
    load();
  };

  if (loading) {
    return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></PortalLayout>;
  }
  if (!record) {
    return <PortalLayout><p>Member not found.</p></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/members"><ChevronLeft className="h-4 w-4" /> Back to members</Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="font-display text-2xl text-primary">{record.full_name}</CardTitle>
                <CardDescription>
                  {branch?.name ?? "—"} · <span className="capitalize">{record.category.replace("_", " ")}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={record.status === "active" ? "default" : "destructive"} className="capitalize">{record.status}</Badge>
                {record.profile_id && <Badge variant="secondary">login linked</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{record.phone ? formatPhoneDisplay(record.phone) : "—"}</p></div>
            <div><p className="text-muted-foreground">Family</p><p className="font-medium">{record.family_id ? "linked" : "individual"}</p></div>
            <div><p className="text-muted-foreground">Development paid</p><p className="font-medium">Ksh {Number(record.development_paid || 0).toLocaleString()}</p></div>
            <div><p className="text-muted-foreground">FPF paid</p><p className="font-medium">Ksh {Number(record.fpf_paid || 0).toLocaleString()}</p></div>
          </CardContent>
        </Card>

        {!record.profile_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Issue login</CardTitle>
              <CardDescription>
                Creates an account using {record.phone ? formatPhoneDisplay(record.phone) : "the member's phone"}. Share the password with the member privately.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 flex-1 min-w-[220px]">
                <Label htmlFor="pw">Initial password</Label>
                <Input id="pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g. kaler1234" />
              </div>
              <Button onClick={issueLogin} disabled={busy || !record.phone} variant="hero">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create login"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Arrears</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Type</TableHead><TableHead>Year</TableHead><TableHead>Funeral</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {arrears.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="capitalize">{a.type.replace("_", " ")}</TableCell>
                    <TableCell>{a.year ?? "—"}</TableCell>
                    <TableCell>{a.funeral_name ?? "—"}</TableCell>
                    <TableCell className="text-right">Ksh {Number(a.amount).toLocaleString()}</TableCell>
                    <TableCell>{a.cleared ? <Badge variant="secondary">cleared</Badge> : <Badge variant="destructive">open</Badge>}</TableCell>
                  </TableRow>
                ))}
                {arrears.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No arrears recorded.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminMemberDetail;
