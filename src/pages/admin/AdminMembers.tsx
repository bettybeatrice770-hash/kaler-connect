import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ChevronLeft, Plus, Download } from "lucide-react";
import { downloadMembersExcel } from "@/lib/exportExcel";
import { formatPhoneDisplay, normalizeKenyanPhone } from "@/lib/phone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type Branch = { id: string; name: string };
type MemberRecord = {
  id: string;
  full_name: string;
  phone: string | null;
  category: "full_member" | "student" | "woman";
  status: "active" | "dormant" | "suspended" | "left_welfare";
  branch_id: string | null;
  family_id: string | null;
  profile_id: string | null;
};
type Arrear = { member_record_id: string; amount: number };

const AdminMembers = () => {
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<MemberRecord[]>([]);
  const [arrears, setArrears] = useState<Arrear[]>([]);
  const [search, setSearch] = useState("");

  const branchFilter = params.get("branch") || "all";
  const categoryFilter = params.get("category") || "all";
  const statusFilter = params.get("status") || "all";

  const reload = async () => {
    const [{ data: brs }, { data: recs }, { data: arr }] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("member_records").select("*").order("full_name"),
      supabase.from("arrears").select("member_record_id, amount").eq("cleared", false),
    ]);
    setBranches((brs as Branch[]) || []);
    setRecords((recs as MemberRecord[]) || []);
    setArrears((arr as Arrear[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    const channel = supabase
      .channel("admin-members-arrears")
      .on("postgres_changes", { event: "*", schema: "public", table: "arrears" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "member_records" }, () => reload())
      .subscribe();
    return () => { window.removeEventListener("focus", onFocus); supabase.removeChannel(channel); };
  }, []);

  const arrearsByMember = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of arrears) {
      m[a.member_record_id] = (m[a.member_record_id] || 0) + Number(a.amount);
    }
    return m;
  }, [arrears]);

  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (branchFilter !== "all" && r.branch_id !== branchFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.full_name.toLowerCase().includes(q) && !(r.phone || "").includes(q)) return false;
      }
      return true;
    });
  }, [records, branchFilter, categoryFilter, statusFilter, search]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-3xl text-primary">Members</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {records.length} members shown
            </p>
          </div>
          <AddMemberDialog branches={branches} onAdded={async () => {
            const { data: recs } = await supabase.from("member_records").select("*").order("full_name");
            setRecords((recs as MemberRecord[]) || []);
          }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={branchFilter} onValueChange={(v) => setFilter("branch", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => setFilter("category", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="full_member">Full members</SelectItem>
                <SelectItem value="woman">Women</SelectItem>
                <SelectItem value="student">Students</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="left_welfare">Left welfare</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Arrears</TableHead>
                  <TableHead>Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const owed = arrearsByMember[r.id] || 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/admin/members/${r.id}`}
                          state={{ from: `/admin/members?${params.toString()}` }}
                          className="hover:text-primary"
                        >
                          {r.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{branchName(r.branch_id)}</TableCell>
                      <TableCell className="capitalize">{r.category.replace("_", " ")}</TableCell>
                      <TableCell>{r.phone ? formatPhoneDisplay(r.phone) : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === "active" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {String(r.status).replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {owed > 0 ? (
                          <span className="text-destructive font-medium">
                            Ksh {owed.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-green-700 text-xs">cleared</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.profile_id ? (
                          <Badge variant="secondary" className="text-xs">
                            linked
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">no login</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No members match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardDescription>
              Editing individual records (arrears, status, linking to a login account, grouping into a
              family) is coming next. For now, this view gives you a complete read-only picture of every
              member by branch.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </PortalLayout>
  );
};

const AddMemberDialog = ({ branches, onAdded }: { branches: Branch[]; onAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", branch_id: "", category: "full_member", status: "active" });

  const submit = async () => {
    if (!form.full_name.trim()) return toast({ title: "Name required", variant: "destructive" });
    let phone: string | null = null;
    if (form.phone.trim()) {
      phone = normalizeKenyanPhone(form.phone);
      if (!phone) return toast({ title: "Invalid phone", description: "Use a valid Kenyan number, or leave blank", variant: "destructive" });
    }
    setBusy(true);
    const { error } = await supabase.from("member_records").insert({
      full_name: form.full_name.trim(),
      phone,
      branch_id: form.branch_id || null,
      category: form.category as any,
      status: form.status as any,
    });
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Member added" });
    setForm({ full_name: "", phone: "", branch_id: "", category: "full_member", status: "active" });
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero"><Plus className="h-4 w-4" /> Add member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a new member</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0712345678" /></div>
          <div><Label>Branch</Label>
            <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_member">Full member</SelectItem>
                  <SelectItem value="woman">Woman</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dormant">Dormant</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="left_welfare">Left welfare</SelectItem>
                </SelectContent>
              </Select></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} variant="hero">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminMembers;
