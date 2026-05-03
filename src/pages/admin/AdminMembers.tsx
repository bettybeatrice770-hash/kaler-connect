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
import { Loader2, Search, ChevronLeft, Plus } from "lucide-react";
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
  status: "active" | "dormant";
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

  useEffect(() => {
    (async () => {
      const [{ data: brs }, { data: recs }, { data: arr }] = await Promise.all([
        supabase.from("branches").select("*").order("name"),
        supabase.from("member_records").select("*").order("full_name"),
        supabase.from("arrears").select("member_record_id, amount").eq("cleared", false),
      ]);
      setBranches((brs as Branch[]) || []);
      setRecords((recs as MemberRecord[]) || []);
      setArrears((arr as Arrear[]) || []);
      setLoading(false);
    })();
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
                        <Link to={`/admin/members/${r.id}`} className="hover:text-primary">
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
                          {r.status}
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

export default AdminMembers;
