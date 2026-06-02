// Shared audit-log helper. Uses the provided service-role client to write entries.
// Failures are swallowed so audit writes never break the main action.

// deno-lint-ignore no-explicit-any
export async function logAudit(admin: any, params: {
  actor_id?: string | null;
  actor_label?: string | null;
  action: string;
  table_name?: string | null;
  record_id?: string | null;
  details?: unknown;
}) {
  try {
    await admin.from("audit_log").insert({
      actor_id: params.actor_id ?? null,
      actor_label: params.actor_label ?? null,
      action: params.action,
      table_name: params.table_name ?? null,
      record_id: params.record_id ?? null,
      details: params.details ?? null,
    });
  } catch (_e) {
    // intentionally ignore — never block the main action on audit failure
  }
}
