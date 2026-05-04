import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, KeyRound, Save, Plus, Trash2, Check, RefreshCw, UserX } from "lucide-react";
import { formatPhoneDisplay, normalizeKenyanPhone } from "@/lib/phone";

const ARREAR_TYPES = ["subscription", "funeral", "fines_penalties"] as const;
const SAVINGS_TYPES = ["development_fund", "fpf", "advance_subscription"] as const;
const ALL_TYPES = [...ARREAR_TYPES, ...SAVINGS_TYPES] as const;

const typeLabel = (t: string) =>
  t === "fpf" ? "FEF" :
  t === "advance_subscription" ? "Advance subscription" :
  t === "fines_penalties" ? "Fines & penalties" :
  t === "development_fund" ? "Development fund" :
  t.charAt(0).toUpperCase() + t.slice(1);

const STATUS_OPTIONS = [
  { v: "active", label: "Active" },
  { v: "dormant", label: "Dormant" },
  { v: "suspended", label: "Suspended" },
  { v: "left_welfare", label: "Left welfare" },
];

const AdminMemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as any)?.from || "/admin/members";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [arrears, setArrears] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [form, setForm] = useState<any>({});
  const [newArr, setNewArr] = useState({ type: "subscription", year: new Date().getFullYear(), funeral_name: "", amount: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: rec }, { data: brs }, { data: arr }] = await Promise.all([
      supabase.from("member_records").select("*").eq("id", id).maybeSingle(),
      supabase.from("branches").select("*").order("name"),
      supabase.from("arrears").select("*").eq("member_record_id", id).order("year", { ascending: true }),
    ]);
    setRecord(rec);
    setBranches(brs || []);
    setArrears(arr || []);
    if (rec) setForm({
      full_name: rec.full_name,
      phone: rec.phone || "",
      category: rec.category,
      status: rec.status,
      branch_id: rec.branch_id || "",
      development_paid: rec.development_paid || 0,
      fpf_paid: rec.fpf_paid || 0,
      advance_subscription_paid: rec.advance_subscription_paid || 0,
      admin_notes: rec.admin_notes || "",
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // Open arrears = sum of un-cleared rows whose type is an arrears type
  const openArrears = useMemo(
    () => arrears
      .filter((a) => !a.cleared && (ARREAR_TYPES as readonly string[]).includes(a.type))
      .reduce((s, a) => s + Number(a.amount || 0), 0),
    [arrears]
  );

  const saveMember = async () => {
    setBusy(true);
    let phone = form.phone?.trim() || null;
    if (phone) {
      const norm = normalizeKenyanPhone(phone);
      if (!norm) { setBusy(false); return toast({ title: "Invalid phone", variant: "destructive" }); }
      phone = norm;
    }
    const { error } = await supabase.from("member_records").update({
      full_name: form.full_name,
      phone,
      category: form.category,
      status: form.status,
      branch_id: form.branch_id || null,
      development_paid: Number(form.development_paid) || 0,
      fpf_paid: Number(form.fpf_paid) || 0,
      advance_subscription_paid: Number(form.advance_subscription_paid) || 0,
      admin_notes: form.admin_notes || null,
    }).eq("id", id);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Member updated" });
    load();
  };

  const issueLogin = async () => {
    if (password.length < 6) return toast({ title: "Password too short", variant: "destructive" });
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("issue-member-login", { body: { member_record_id: id, password } });
    setBusy(false);
    if (error || (data as any)?.error) return toast({ title: "Could not issue login", description: (data as any)?.error || error?.message, variant: "destructive" });
    toast({ title: "Login created" });
    setPassword(""); load();
  };

  const resetPassword = async () => {
    if (resetPw.length < 6) return toast({ title: "Password too short", variant: "destructive" });
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("reset-member-password", { body: { member_record_id: id, password: resetPw } });
    setBusy(false);
    if (error || (data as any)?.error) return toast({ title: "Reset failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    toast({ title: "Password reset" });
    setResetPw("");
  };

  const deleteMember = async () => {
    if (!confirm("Permanently delete this member and all their arrears? This cannot be undone.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("delete-member", { body: { member_record_id: id } });
    setBusy(false);
    if (error || (data as any)?.error) return toast({ title: "Delete failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    toast({ title: "Member deleted" });
    navigate(backTo);
  };

  const addArrear = async () => {
    const amt = Number(newArr.amount);
    if (!amt || amt <= 0) return toast({ title: "Enter an amount", variant: "destructive" });
    const isSavings = (SAVINGS_TYPES as readonly string[]).includes(newArr.type);
    if (isSavings) {
      // Savings types: bump the corresponding paid total on member_record instead of creating arrears
      const col = newArr.type === "fpf" ? "fpf_paid" : newArr.type === "development_fund" ? "development_paid" : "advance_subscription_paid";
      const current = Number(record[col] || 0);
      const { error } = await supabase.from("member_records").update({ [col]: current + amt }).eq("id", id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("arrears").insert({
        member_record_id: id, type: newArr.type as any,
        year: newArr.year || null, funeral_name: newArr.funeral_name || null, amount: amt,
      });
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    setNewArr({ type: "subscription", year: new Date().getFullYear(), funeral_name: "", amount: "" });
    load();
  };

  const updateArrearAmount = async (arrId: string, amount: number) => {
    const { error } = await supabase.from("arrears").update({ amount }).eq("id", arrId);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };
  const updateArrearType = async (arrId: string, type: string) => {
    const { error } = await supabase.from("arrears").update({ type: type as any }).eq("id", arrId);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };
  const toggleCleared = async (a: any) => {
    const { error } = await supabase.from("arrears").update({ cleared: !a.cleared, cleared_at: !a.cleared ? new Date().toISOString() : null }).eq("id", a.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };
  const deleteArrear = async (arrId: string) => {
    if (!confirm("Delete this arrear entry?")) return;
    const { error } = await supabase.from("arrears").delete().eq("id", arrId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  if (loading) return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></PortalLayout>;
  if (!record) return <PortalLayout><p>Member not found.</p></PortalLayout>;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to={backTo}><ChevronLeft className="h-4 w-4" /> Back</Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="font-display text-2xl text-primary">{record.full_name}</CardTitle>
                <CardDescription>Edit member details below</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={record.status === "active" ? "default" : "destructive"} className="capitalize">{String(record.status).replace("_", " ")}</Badge>
                {record.profile_id && <Badge variant="secondary">login linked</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Full name</Label>
              <Input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0712345678" /></div>
            <div className="space-y-1"><Label>Branch</Label>
              <Select value={form.branch_id || ""} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_member">Full member</SelectItem>
                  <SelectItem value="woman">Woman</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-1"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-destructive">Open arrears (live)</Label>
              <div className="h-10 rounded-md border bg-muted/40 px-3 grid place-items-start content-center">
                <span className={openArrears > 0 ? "text-destructive font-semibold" : "text-green-700 font-semibold"}>
                  {openArrears > 0 ? `Ksh ${openArrears.toLocaleString()}` : "Cleared"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:col-span-2">
              <div className="space-y-1"><Label>Development paid</Label>
                <Input type="number" value={form.development_paid} onChange={(e) => setForm({ ...form, development_paid: e.target.value })} /></div>
              <div className="space-y-1"><Label>FEF paid</Label>
                <Input type="number" value={form.fpf_paid} onChange={(e) => setForm({ ...form, fpf_paid: e.target.value })} /></div>
              <div className="space-y-1"><Label>Advance subs paid</Label>
                <Input type="number" value={form.advance_subscription_paid} onChange={(e) => setForm({ ...form, advance_subscription_paid: e.target.value })} /></div>
            </div>
            <div className="space-y-1 sm:col-span-2"><Label>Admin notes (back-end only)</Label>
              <Textarea rows={3} value={form.admin_notes || ""} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} placeholder="Important notes only visible to admins..." /></div>
            <div className="sm:col-span-2 flex justify-between gap-3">
              <Button variant="destructive" onClick={deleteMember} disabled={busy}>
                <UserX className="h-4 w-4" /> Delete member
              </Button>
              <Button onClick={saveMember} disabled={busy} variant="hero">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save changes</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!record.profile_id ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Issue login</CardTitle>
              <CardDescription>
                Creates an account using {record.phone ? formatPhoneDisplay(record.phone) : "the member's phone"}. Save phone first if blank.
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Reset / generate password</CardTitle>
              <CardDescription>Issue a new password for this member's existing login.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 flex-1 min-w-[220px]">
                <Label htmlFor="rpw">New password</Label>
                <Input id="rpw" type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <Button variant="outline" onClick={() => setResetPw(Math.random().toString(36).slice(-8) + "K")}>Generate</Button>
              <Button onClick={resetPassword} disabled={busy} variant="hero">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Arrears & savings entries</CardTitle>
            <CardDescription>FEF / Development / Advance subscription are tracked as savings, not arrears.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Type</TableHead><TableHead>Year</TableHead><TableHead>Funeral / note</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {arrears.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Select value={a.type} onValueChange={(v) => updateArrearType(a.id, v)}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ALL_TYPES.map((t) => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{a.year ?? "—"}</TableCell>
                    <TableCell>{a.funeral_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" defaultValue={a.amount} onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== Number(a.amount)) updateArrearAmount(a.id, v);
                      }} className="w-28 ml-auto text-right" />
                    </TableCell>
                    <TableCell>{a.cleared ? <Badge variant="secondary">cleared</Badge> : <Badge variant="destructive">open</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => toggleCleared(a)} title={a.cleared ? "Mark open" : "Mark cleared"}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteArrear(a.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {arrears.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No arrears recorded.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
          <CardContent className="border-t pt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
            <div><Label className="text-xs">Type</Label>
              <Select value={newArr.type} onValueChange={(v) => setNewArr({ ...newArr, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_TYPES.map((t) => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Year</Label>
              <Input type="number" value={newArr.year} onChange={(e) => setNewArr({ ...newArr, year: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label className="text-xs">Funeral / note</Label>
              <Input value={newArr.funeral_name} onChange={(e) => setNewArr({ ...newArr, funeral_name: e.target.value })} placeholder="e.g. Jane Otieno" /></div>
            <div><Label className="text-xs">Amount</Label>
              <div className="flex gap-1">
                <Input type="number" value={newArr.amount} onChange={(e) => setNewArr({ ...newArr, amount: e.target.value })} />
                <Button size="icon" onClick={addArrear} variant="hero"><Plus className="h-4 w-4" /></Button>
              </div></div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminMemberDetail;
