import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { normalizeKenyanPhone } from "@/lib/phone";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const generateSecurePassword = () => {
  const array = new Uint8Array(12);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(36)).join('').slice(0, 12);
};

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

const RELATIONSHIP_OPTIONS = ["Head of family", "Spouse", "Child", "Parent", "Sibling", "Other"];

const AdminMemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as any)?.from || "/admin/members";
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [arrears, setArrears] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [showGenerated, setShowGenerated] = useState(false);
  const [form, setForm] = useState<any>({});
  const [relationship, setRelationship] = useState("");
  const [newArr, setNewArr] = useState({ type: "subscription", year: new Date().getFullYear(), funeral_name: "", amount: "" });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'member' | 'arrear'; id: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: rec }, { data: brs }, { data: arr }] = await Promise.all([
        supabase.from("member_records").select("*").eq("id", id).maybeSingle(),
        supabase.from("branches").select("*").order("name"),
        supabase.from("arrears").select("*").eq("member_record_id", id).order("year", { ascending: true }),
      ]);
      setRecord(rec);
      setBranches(brs || []);
      setArrears(arr || []);

      if (rec) {
        setForm({
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

        if (rec.profile_id) {
          const { data: prof } = await supabase.from("profiles").select("id, relationship").eq("id", rec.profile_id).maybeSingle();
          setProfile(prof);
          setRelationship(prof?.relationship || "");
        }
      }
    } catch (err: any) {
      toast({ title: "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const openArrears = useMemo(
    () => arrears.filter((a) => !a.cleared && (ARREAR_TYPES as readonly string[]).includes(a.type)).reduce((s, a) => s + Number(a.amount || 0), 0),
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
    const { error: recErr } = await supabase.from("member_records").update({
      full_name: form.full_name, phone, category: form.category, status: form.status,
      branch_id: form.branch_id || null, development_paid: Number(form.development_paid) || 0,
      fpf_paid: Number(form.fpf_paid) || 0, advance_subscription_paid: Number(form.advance_subscription_paid) || 0,
      admin_notes: form.admin_notes || null,
    }).eq("id", id);
    if (recErr) { setBusy(false); return toast({ title: "Save failed", variant: "destructive" }); }
    if (profile?.id) await supabase.from("profiles").update({ relationship: relationship.trim() || null }).eq("id", profile.id);
    setBusy(false);
    toast({ title: "Member updated" });
    load();
  };

  const issueLogin = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("issue-member-login", { body: { member_record_id: id, password } });
    setBusy(false);
    if (error) return toast({ title: "Could not issue login", variant: "destructive" });
    toast({ title: "Login created" });
    setPassword(""); load();
  };

  const resetPassword = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("reset-member-password", { body: { member_record_id: id, password: resetPw } });
    setBusy(false);
    if (error) return toast({ title: "Reset failed", variant: "destructive" });
    toast({ title: "Password reset" });
    setResetPw("");
  };

  const deleteMember = async () => {
    setBusy(true);
    try {
      const profileId = record?.profile_id || null;

      // Delete all arrears for this member
      await supabase.from("arrears").delete().eq("member_record_id", id);

      // Delete the member record itself
      const { error } = await supabase.from("member_records").delete().eq("id", id);
      if (error) throw error;

      // Delete the linked auth profile so they can no longer log in
      if (profileId) {
        await supabase.from("profiles").delete().eq("id", profileId);
      }

      toast({ title: "Member deleted", description: "Member and all associated data removed." });
      navigate(backTo);
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'member') {
      await deleteMember();
    } else {
      await supabase.from("arrears").delete().eq("id", deleteTarget.id);
      load();
    }
    setDeleteTarget(null);
  };

  const addArrear = async () => {
    const amt = Number(newArr.amount);
    if (!amt || amt <= 0) return toast({ title: "Enter valid amount", variant: "destructive" });
    if ((SAVINGS_TYPES as readonly string[]).includes(newArr.type)) {
      const col = newArr.type === "fpf" ? "fpf_paid" : newArr.type === "development_fund" ? "development_paid" : "advance_subscription_paid";
      const updatedValue = Number(record[col] || 0) + amt;
      await supabase.from("member_records").update({ [col]: updatedValue }).eq("id", id);
      setForm((prev: any) => ({ ...prev, [col]: updatedValue }));
    } else {
      await supabase.from("arrears").insert({ member_record_id: id, type: newArr.type as any, year: newArr.year, funeral_name: newArr.funeral_name, amount: amt });
    }
    setNewArr({ type: "subscription", year: new Date().getFullYear(), funeral_name: "", amount: "" });
    load();
  };

  if (loading) return <PortalLayout><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></PortalLayout>;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to={backTo}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="font-display text-2xl text-primary">{record.full_name}</CardTitle>
                <CardDescription>Edit member details</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={record.status === "active" ? "default" : "destructive"}>{record.status}</Badge>
                {record.profile_id && <Badge variant="secondary">login linked</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Full name</Label><Input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>Branch</Label>
              <Select value={form.branch_id || ""} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="full_member">Full member</SelectItem><SelectItem value="woman">Woman</SelectItem><SelectItem value="student">Student</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{RELATIONSHIP_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2"><Label>Admin notes</Label><Textarea rows={3} value={form.admin_notes || ""} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} /></div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row justify-between gap-3 pt-2">
              {isAdmin && (
                <Button variant="destructive" onClick={() => setDeleteTarget({ type: 'member', id: id! })} className="w-full sm:w-auto">
                  <UserX className="h-4 w-4 mr-2" /> Delete member
                </Button>
              )}
              <Button onClick={saveMember} variant="hero" className="w-full sm:w-auto sm:ml-auto">Save changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Arrears & Savings Breakdown ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arrears &amp; savings</CardTitle>
            <CardDescription>
              Open arrears total: <span className="font-semibold text-destructive">Ksh {openArrears.toLocaleString()}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {arrears.length === 0 ? (
              <p className="text-sm text-muted-foreground">No arrear or savings entries.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Amount (Ksh)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrears.map((a) => (
                    <TableRow key={a.id} className={a.cleared ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{typeLabel(a.type)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.funeral_name || "—"}</TableCell>
                      <TableCell>{a.year}</TableCell>
                      <TableCell className="text-right">{Number(a.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {a.cleared
                          ? <Badge variant="secondary" className="text-green-700"><Check className="h-3 w-3 mr-1" />Cleared</Badge>
                          : <Badge variant="destructive">Owed</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ type: 'arrear', id: a.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* ── Add arrear / savings entry ── */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> Add entry</p>
              <div className="grid sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={newArr.type} onValueChange={(v) => setNewArr({ ...newArr, type: v, funeral_name: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_TYPES.map((t) => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>
                    {newArr.type === "funeral" ? "Deceased name" : newArr.type === "fines_penalties" ? "Description" : "Note (optional)"}
                  </Label>
                  <Input
                    value={newArr.funeral_name}
                    onChange={(e) => setNewArr({ ...newArr, funeral_name: e.target.value })}
                    placeholder={newArr.type === "funeral" ? "Name of deceased" : newArr.type === "fines_penalties" ? "e.g. Late for meeting" : ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={newArr.year}
                    onChange={(e) => setNewArr({ ...newArr, year: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Amount (Ksh)</Label>
                  <Input
                    type="number"
                    value={newArr.amount}
                    onChange={(e) => setNewArr({ ...newArr, amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button onClick={addArrear} variant="hero" size="sm" className="mt-3">
                <Plus className="h-4 w-4 mr-1" /> Add entry
              </Button>
            </div>
          </CardContent>
        </Card>

        {!record.profile_id ? (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Issue login</CardTitle></CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-end gap-3">
              <div className="space-y-1 w-full sm:flex-1"><Label>Initial password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button onClick={issueLogin} variant="hero" className="w-full sm:w-auto">Create login</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Reset password</CardTitle></CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-end gap-3">
              <div className="space-y-1 w-full sm:flex-1"><Label>New password</Label><Input value={resetPw} onChange={(e) => setResetPw(e.target.value)} /></div>
              <div className="flex w-full sm:w-auto gap-2">
                <Button variant="outline" onClick={() => setResetPw(generateSecurePassword())} className="flex-1 sm:flex-none">Generate</Button>
                <Button onClick={resetPassword} variant="hero" className="flex-1 sm:flex-none">Reset</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'member' ? 'Delete member?' : 'Delete arrear?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'member'
                ? `This will permanently delete ${record?.full_name} and all their data including arrears and login access. This cannot be undone.`
                : 'This arrear entry will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </PortalLayout>
  );
};

export default AdminMemberDetail;
