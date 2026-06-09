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
import { Loader2, ChevronLeft, AlertTriangle, Undo2, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface Branch {
  id: string;
  name: string;
}

interface FormState {
  type: string;
  year: number;
  funeral_name: string;
  amount: string;
  branch_id: string;
  category: string;
  status: string;
}

interface LastEvent {
  ids: string[];       // Arrear row IDs inserted
  label: string;       // Human-readable summary
  count: number;
}

interface ArrearsInsertedResponse {
  id: string;
}

const TYPE_LABELS: Record<string, string> = {
  subscription: "Subscription (yearly)",
  funeral: "Funeral",
  fpf: "FEF",
  development_fund: "Development fund",
  fines_penalties: "Fines & penalties",
  advance_subscription: "Advance subscription",
};

const AdminEvents = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [busy, setBusy] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);

  const [form, setForm] = useState<FormState>({
    type: "subscription",
    year: new Date().getFullYear(),
    funeral_name: "",
    amount: "",
    branch_id: "all",
    category: "all",
    status: "active",
  });

  useEffect(() => {
    supabase
      .from("branches")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Failed to fetch branches", description: error.message, variant: "destructive" });
          return;
        }
        setBranches(data || []);
      });
  }, []);

  // Reset preview when filters or event configurations change to prevent stale states
  useEffect(() => {
    setPreview(null);
  }, [form.branch_id, form.category, form.status, form.type, form.year]);

  const countTargets = async (): Promise<number> => {
    setPreviewLoading(true);
    let q = supabase.from("member_records").select("id", { count: "exact", head: true });
    
    if (form.branch_id !== "all") q = q.eq("branch_id", form.branch_id);
    if (form.category !== "all") q = q.eq("category", form.category);
    if (form.status !== "all") q = q.eq("status", form.status);
    
    const { count, error } = await q;
    setPreviewLoading(false);
    
    if (error) {
      toast({ title: "Failed to count targets", description: error.message, variant: "destructive" });
      return 0;
    }
    
    const finalCount = count ?? 0;
    setPreview(finalCount);
    return finalCount;
  };

  const handleApplyClick = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast({ title: "Enter a valid amount", variant: "destructive" });
    if (form.type === "funeral" && !form.funeral_name.trim()) return toast({ title: "Enter the funeral name", variant: "destructive" });

    let currentPreview = preview;
    if (currentPreview === null) {
      currentPreview = await countTargets();
    }
    
    if (currentPreview === 0) return toast({ title: "No members match the selected criteria", variant: "destructive" });

    setConfirmOpen(true);
  };

  const apply = async () => {
    setConfirmOpen(false);
    setBusy(true);

    let q = supabase.from("member_records").select("id");
    if (form.branch_id !== "all") q = q.eq("branch_id", form.branch_id);
    if (form.category !== "all") q = q.eq("category", form.category);
    if (form.status !== "all") q = q.eq("status", form.status);

    const { data: targets, error: tErr } = await q;
    if (tErr || !targets) {
      setBusy(false);
      return toast({ title: "Failed to fetch target records", description: tErr?.message, variant: "destructive" });
    }

    const amt = Number(form.amount);
    const rows = targets.map((m) => ({
      member_record_id: m.id,
      type: form.type,
      year: form.year || null,
      funeral_name: form.funeral_name || null,
      amount: amt,
    }));

    const insertedIds: string[] = [];
    const chunkSize = 200;
    
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { data: inserted, error } = await supabase
        .from("arrears")
        .insert(rows.slice(i, i + chunkSize))
        .select("id");
        
      if (error) {
        setBusy(false);
        return toast({ title: "Insert failed midway", description: error.message, variant: "destructive" });
      }
      
      if (inserted) {
        (inserted as ArrearsInsertedResponse[]).forEach((r) => insertedIds.push(r.id));
      }
    }

    const typeLabel = TYPE_LABELS[form.type] ?? form.type;
    const label = form.type === "funeral"
      ? `${typeLabel} — ${form.funeral_name} (Ksh ${amt.toLocaleString()})`
      : `${typeLabel} ${form.year} (Ksh ${amt.toLocaleString()})`;

    setLastEvent({ ids: insertedIds, label, count: insertedIds.length });
    setBusy(false);
    toast({ title: "Success", description: `Added ${insertedIds.length} arrears entries.` });
    setForm((prev) => ({ ...prev, amount: "", funeral_name: "" }));
    setPreview(null);
  };

  const undo = async () => {
    if (!lastEvent) return;
    setUndoConfirmOpen(false);
    setUndoing(true);

    const chunkSize = 200;
    const ids = lastEvent.ids;
    
    for (let i = 0; i < ids.length; i += chunkSize) {
      const { error } = await supabase
        .from("arrears")
        .delete()
        .in("id", ids.slice(i, i + chunkSize));
        
      if (error) {
        setUndoing(false);
        return toast({ title: "Undo failed", description: error.message, variant: "destructive" });
      }
    }

    setUndoing(false);
    setLastEvent(null);
    toast({ title: "Event undone", description: `Removed ${ids.length} arrears entries.` });
  };

  const branchLabel = form.branch_id === "all" ? "all branches" : (branches.find((b) => b.id === form.branch_id)?.name ?? "selected branch");
  const categoryLabel = form.category === "all" ? "all categories" : form.category.replace("_", " ");
  const statusLabel = form.status === "all" ? "all statuses" : form.status;
  const typeLabel = TYPE_LABELS[form.type] ?? form.type;
  const confirmSummary = form.type === "funeral" ? `${typeLabel} — ${form.funeral_name}` : typeLabel;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin" className="inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <div>
          <h1 className="font-display text-3xl text-primary font-semibold tracking-tight">Mass arrears event</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a yearly subscription, funeral contribution, FEF, or development levy across many members in one click.
          </p>
        </div>

        {lastEvent && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-green-700/40 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">
                Applied: <span className="font-normal">{lastEvent.label}</span> — {lastEvent.count} members charged
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-green-700/40 text-green-700 hover:bg-green-100"
              disabled={undoing}
              onClick={() => setUndoConfirmOpen(true)}
            >
              {undoing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Undo2 className="h-4 w-4 mr-1" /> Undo</>}
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> This creates one arrears row per matched member
            </CardTitle>
            <CardDescription>Use the filters below to scope targets. By default, only active members are charged.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-type">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger id="event-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Subscription (yearly)</SelectItem>
                  <SelectItem value="funeral">Funeral</SelectItem>
                  <SelectItem value="fpf">FEF</SelectItem>
                  <SelectItem value="development_fund">Development fund</SelectItem>
                  <SelectItem value="fines_penalties">Fines & penalties</SelectItem>
                  <SelectItem value="advance_subscription">Advance subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-year">Year</Label>
              <Input
                id="event-year"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              />
            </div>

            {form.type === "funeral" && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="funeral-name">Funeral name</Label>
                <Input
                  id="funeral-name"
                  value={form.funeral_name}
                  onChange={(e) => setForm({ ...form, funeral_name: e.target.value })}
                  placeholder="e.g. Jane Otieno"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="event-amount">Amount per member (Ksh)</Label>
              <Input
                id="event-amount"
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-filter">Branch</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger id="branch-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="category-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="full_member">Full members</SelectItem>
                  <SelectItem value="woman">Women</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="status-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="dormant">Dormant only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-4 mt-2">
              <Button
                variant="outline"
                onClick={countTargets}
                disabled={previewLoading || busy}
                className="w-full sm:w-auto"
              >
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Preview targets
              </Button>

              {preview !== null && !previewLoading && (
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Will create <b className="text-foreground">{preview}</b> arrears entries.
                </p>
              )}

              <Button
                onClick={handleApplyClick}
                disabled={busy || previewLoading}
                variant="default"
                className="w-full sm:w-auto ml-auto"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirm bulk arrears event
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm text-muted-foreground pt-2">
              <span>You are about to add the following arrears entry to <b>{preview ?? "?"} members</b>:</span>
              <span className="block rounded-md bg-muted p-3 space-y-1 text-foreground">
                <span className="block"><span className="text-muted-foreground">Type:</span> <b>{confirmSummary}</b></span>
                <span className="block"><span className="text-muted-foreground">Amount:</span> <b>Ksh {Number(form.amount || 0).toLocaleString()} per member</b></span>
                <span className="block"><span className="text-muted-foreground">Branch:</span> <b>{branchLabel}</b></span>
                <span className="block"><span className="text-muted-foreground">Category:</span> <b>{categoryLabel}</b></span>
                <span className="block"><span className="text-muted-foreground">Status:</span> <b>{statusLabel}</b></span>
              </span>
              <span className="block text-destructive font-medium">
                You can undo this immediately after applying, but only within this session.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={apply}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, apply to {preview ?? "?"} members
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={undoConfirmOpen} onOpenChange={setUndoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5" /> Undo this event?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm pt-2">
              <span>This will permanently delete the <b>{lastEvent?.count}</b> arrears entries just created for:</span>
              <span className="block rounded-md bg-muted p-3 font-medium text-foreground">{lastEvent?.label}</span>
              <span className="block text-muted-foreground">Member accounts will return to their state before this event was applied.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={undo}>
              Yes, undo {lastEvent?.count} entries
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
};

export default AdminEvents;
