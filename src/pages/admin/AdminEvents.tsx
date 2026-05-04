import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, AlertTriangle } from "lucide-react";

const AdminEvents = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    type: "subscription",
    year: new Date().getFullYear(),
    funeral_name: "",
    amount: "",
    branch_id: "all",
    category: "all",
    status: "active",
  });
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("branches").select("*").order("name").then(({ data }) => setBranches(data || []));
  }, []);

  const countTargets = async () => {
    let q = supabase.from("member_records").select("id", { count: "exact", head: true });
    if (form.branch_id !== "all") q = q.eq("branch_id", form.branch_id);
    if (form.category !== "all") q = q.eq("category", form.category as any);
    if (form.status !== "all") q = q.eq("status", form.status as any);
    const { count } = await q;
    setPreview(count ?? 0);
  };

  const apply = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast({ title: "Enter an amount", variant: "destructive" });
    if (form.type === "funeral" && !form.funeral_name.trim()) return toast({ title: "Enter the funeral name", variant: "destructive" });
    setBusy(true);

    let q = supabase.from("member_records").select("id");
    if (form.branch_id !== "all") q = q.eq("branch_id", form.branch_id);
    if (form.category !== "all") q = q.eq("category", form.category as any);
    if (form.status !== "all") q = q.eq("status", form.status as any);
    const { data: targets, error: tErr } = await q;
    if (tErr || !targets) { setBusy(false); return toast({ title: "Failed", description: tErr?.message, variant: "destructive" }); }

    const rows = targets.map((m: any) => ({
      member_record_id: m.id,
      type: form.type as any,
      year: form.year || null,
      funeral_name: form.funeral_name || null,
      amount: amt,
    }));

    // Chunk inserts to avoid payload limits
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { error } = await supabase.from("arrears").insert(rows.slice(i, i + chunkSize));
      if (error) { setBusy(false); return toast({ title: "Insert failed", description: error.message, variant: "destructive" }); }
    }
    setBusy(false);
    toast({ title: `Added ${rows.length} arrears entries` });
    setForm({ ...form, amount: "", funeral_name: "" });
    setPreview(null);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back</Link></Button>

        <div>
          <h1 className="font-display text-3xl text-primary">Mass arrears event</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a yearly subscription, funeral contribution, FPF, or development levy across many members in one click.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> This creates one arrears row per matched member</CardTitle>
            <CardDescription>Use the filter to scope. By default only active members are charged.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Subscription (yearly)</SelectItem>
                  <SelectItem value="funeral">Funeral</SelectItem>
                  <SelectItem value="fpf">FEF</SelectItem>
                  <SelectItem value="development_fund">Development fund</SelectItem>
                  <SelectItem value="fines_penalties">Fines &amp; penalties</SelectItem>
                  <SelectItem value="advance_subscription">Advance subscription</SelectItem>
                </SelectContent>
              </Select></div>
            <div><Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
            {form.type === "funeral" && (
              <div className="sm:col-span-2"><Label>Funeral name</Label>
                <Input value={form.funeral_name} onChange={(e) => setForm({ ...form, funeral_name: e.target.value })} placeholder="e.g. Jane Otieno" /></div>
            )}
            <div><Label>Amount per member (Ksh)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Branch</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="full_member">Full members</SelectItem>
                  <SelectItem value="woman">Women</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                </SelectContent>
              </Select></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="dormant">Dormant only</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="sm:col-span-2 flex items-center justify-between gap-3 border-t pt-4">
              <Button variant="outline" onClick={countTargets}>Preview targets</Button>
              {preview !== null && <p className="text-sm">Will create <b>{preview}</b> arrears entries.</p>}
              <Button onClick={apply} disabled={busy} variant="hero">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default AdminEvents;
