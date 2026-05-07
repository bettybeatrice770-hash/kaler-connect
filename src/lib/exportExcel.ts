import { supabase } from "@/integrations/supabase/client";

export const downloadMembersExcel = async (branchId: string | null, fileBase: string) => {
  const XLSX = await import("xlsx");
  let q = supabase.from("member_records").select("*").order("full_name");
  if (branchId) q = q.eq("branch_id", branchId);
  const [{ data: members, error: mErr }, { data: branches }] = await Promise.all([
    q,
    supabase.from("branches").select("*"),
  ]);
  if (mErr) throw mErr;
  const ids = (members || []).map((m: any) => m.id);
  let arrears: any[] = [];
  if (ids.length) {
    const { data } = await supabase.from("arrears").select("*").in("member_record_id", ids);
    arrears = data || [];
  }
  const branchName = (id: string | null) => branches?.find((b: any) => b.id === id)?.name || "";

  const arrearsByMember: Record<string, number> = {};
  for (const a of arrears) if (!a.cleared) arrearsByMember[a.member_record_id] = (arrearsByMember[a.member_record_id] || 0) + Number(a.amount || 0);

  const rows = (members || []).map((m: any) => ({
    "Full Name": m.full_name,
    Branch: branchName(m.branch_id),
    Phone: m.phone || "",
    Category: m.category,
    Status: m.status,
    "Open Arrears (Ksh)": arrearsByMember[m.id] || 0,
    "Development Paid": Number(m.development_paid || 0),
    "FEF Paid": Number(m.fpf_paid || 0),
    "Advance Subs Paid": Number(m.advance_subscription_paid || 0),
    "Admin Notes": m.admin_notes || "",
  }));

  const arrearsRows = arrears.map((a) => {
    const m = members?.find((x: any) => x.id === a.member_record_id);
    return {
      Member: m?.full_name || "",
      Branch: branchName(m?.branch_id),
      Type: a.type,
      Year: a.year ?? "",
      Detail: a.funeral_name ?? "",
      Amount: Number(a.amount),
      Cleared: a.cleared ? "Yes" : "No",
    };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Members");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrearsRows), "Arrears");
  XLSX.writeFile(wb, `${fileBase}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};
