import { useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Upload, FileSpreadsheet } from "lucide-react";
import { normalizeKenyanPhone } from "@/lib/phone";

const CORE_FIELDS = new Set(["branch", "full name", "name", "phone", "category", "status"]);

type ParsedRow = {
  raw: Record<string, any>;
  full_name: string;
  branch: string;
  phone: string | null;
  category: "full_member" | "woman" | "student";
  status: "active" | "dormant";
  arrears: { header: string; amount: number }[];
};

const normCat = (v: any): ParsedRow["category"] => {
  const s = String(v || "").toLowerCase();
  if (s.includes("woman") || s.includes("women")) return "woman";
  if (s.includes("student")) return "student";
  return "full_member";
};
const normStatus = (v: any): ParsedRow["status"] =>
  String(v || "").toLowerCase().includes("dormant") ? "dormant" : "active";

const parseArrearHeader = (header: string): { type: string; year: number | null; funeral_name: string | null } => {
  const h = header.trim();
  const lower = h.toLowerCase();
  const yearMatch = h.match(/(20\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  let type = "funeral";
  if (lower.includes("subscription") || lower.includes("subs")) type = "subscription";
  else if (lower.includes("fpf")) type = "fpf";
  else if (lower.includes("development") || lower.includes("dev fund")) type = "development_fund";
  // funeral name = header minus year/type tokens
  let funeral_name: string | null = null;
  if (type === "funeral") {
    funeral_name = h.replace(/funeral/gi, "").replace(/(20\d{2})/g, "").replace(/[-_:]+/g, " ").trim() || h;
  }
  return { type, year, funeral_name };
};

const AdminImport = () => {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [extraHeaders, setExtraHeaders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [mode, setMode] = useState<"update" | "override">("update");

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

    const headers = Object.keys(data[0] || {});
    const extras = headers.filter((h) => !CORE_FIELDS.has(h.trim().toLowerCase()));
    setExtraHeaders(extras);

    const parsed: ParsedRow[] = data.map((r) => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          for (const key of Object.keys(r)) if (key.trim().toLowerCase() === k) return r[key];
        }
        return "";
      };
      const arrears = extras
        .map((h) => ({ header: h, amount: Number(r[h]) || 0 }))
        .filter((a) => a.amount > 0);
      return {
        raw: r,
        full_name: String(get("full name", "name") || "").trim(),
        branch: String(get("branch") || "").trim(),
        phone: String(get("phone") || "").trim() || null,
        category: normCat(get("category")),
        status: normStatus(get("status")),
        arrears,
      };
    }).filter((r) => r.full_name);

    setRows(parsed);
    toast({ title: `Parsed ${parsed.length} rows`, description: `${extras.length} arrears columns detected` });
  };

  const runImport = async () => {
    if (!rows.length) return;
    setBusy(true);

    // 1. Ensure branches exist
    const branchNames = Array.from(new Set(rows.map((r) => r.branch).filter(Boolean)));
    setProgress("Checking branches...");
    const { data: existingBranches } = await supabase.from("branches").select("*");
    const branchMap = new Map<string, string>();
    (existingBranches || []).forEach((b: any) => branchMap.set(b.name.toLowerCase(), b.id));
    const missing = branchNames.filter((n) => !branchMap.has(n.toLowerCase()));
    if (missing.length) {
      const { data: created, error } = await supabase.from("branches").insert(missing.map((n) => ({ name: n }))).select();
      if (error) { setBusy(false); return toast({ title: "Branch create failed", description: error.message, variant: "destructive" }); }
      (created || []).forEach((b: any) => branchMap.set(b.name.toLowerCase(), b.id));
    }

    // 2. Load existing members for matching by name
    setProgress("Loading existing members...");
    const { data: existingMembers } = await supabase.from("member_records").select("id, full_name, phone");
    const memberByName = new Map<string, any>();
    (existingMembers || []).forEach((m: any) => memberByName.set(m.full_name.trim().toLowerCase(), m));

    if (mode === "override") {
      setProgress("Override mode: clearing existing arrears for matched members...");
      const matchedIds = rows
        .map((r) => memberByName.get(r.full_name.toLowerCase())?.id)
        .filter(Boolean);
      if (matchedIds.length) {
        await supabase.from("arrears").delete().in("member_record_id", matchedIds);
      }
    }

    let upserts = 0, inserts = 0, arrearCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      setProgress(`Importing ${i + 1}/${rows.length}: ${r.full_name}`);
      const phone = r.phone ? normalizeKenyanPhone(r.phone) : null;
      const branch_id = branchMap.get(r.branch.toLowerCase()) || null;
      const existing = memberByName.get(r.full_name.toLowerCase());

      let memberId: string;
      if (existing) {
        const { error } = await supabase.from("member_records").update({
          phone, branch_id, category: r.category, status: r.status,
        }).eq("id", existing.id);
        if (error) { setBusy(false); return toast({ title: "Update failed", description: error.message, variant: "destructive" }); }
        memberId = existing.id;
        upserts++;
      } else {
        const { data: created, error } = await supabase.from("member_records").insert({
          full_name: r.full_name, phone, branch_id, category: r.category, status: r.status,
        }).select().single();
        if (error || !created) { setBusy(false); return toast({ title: "Insert failed", description: error?.message, variant: "destructive" }); }
        memberId = created.id;
        inserts++;
      }

      // Insert arrears for this member
      if (r.arrears.length) {
        const arrRows = r.arrears.map((a) => {
          const meta = parseArrearHeader(a.header);
          return {
            member_record_id: memberId,
            type: meta.type as any,
            year: meta.year,
            funeral_name: meta.funeral_name,
            amount: a.amount,
            notes: `Imported from Excel column "${a.header}"`,
          };
        });
        const { error } = await supabase.from("arrears").insert(arrRows);
        if (error) { setBusy(false); return toast({ title: "Arrears insert failed", description: error.message, variant: "destructive" }); }
        arrearCount += arrRows.length;
      }
    }

    setBusy(false);
    setProgress("");
    toast({ title: "Import complete", description: `${inserts} added, ${upserts} updated, ${arrearCount} arrears entries` });
    setRows([]);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back</Link></Button>

        <div>
          <h1 className="font-display text-3xl text-primary">Bulk Excel import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload an .xlsx with one row per member. Required columns: <b>Branch, Full Name, Phone, Category, Status</b>.
            Any other column is treated as an arrears amount, e.g. <i>"Subscription 2025"</i>, <i>"Funeral 2024 Jane Otieno"</i>, <i>"FPF"</i>.
            Existing members (matched by full name) are updated; new ones are added.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Upload spreadsheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {extraHeaders.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Detected arrears columns: {extraHeaders.map((h) => <code key={h} className="mx-1 px-1 bg-muted rounded">{h}</code>)}
              </p>
            )}
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">Preview ({rows.length} rows)</CardTitle>
                  <CardDescription>Verify before importing. Existing members are matched by full name.</CardDescription>
                </div>
                <Button onClick={runImport} disabled={busy} variant="hero">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Import all</>}
                </Button>
              </div>
              {progress && <p className="text-xs text-muted-foreground mt-2">{progress}</p>}
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Branch</TableHead><TableHead>Phone</TableHead>
                  <TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Arrears</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.branch || "—"}</TableCell>
                      <TableCell>{r.phone || "—"}</TableCell>
                      <TableCell className="capitalize">{r.category.replace("_", " ")}</TableCell>
                      <TableCell className="capitalize">{r.status}</TableCell>
                      <TableCell className="text-right">{r.arrears.length} entries</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 100 && <p className="text-xs text-center py-3 text-muted-foreground">…and {rows.length - 100} more</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
};

export default AdminImport;
