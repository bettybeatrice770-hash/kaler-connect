/**
 * Normalize a Kenyan phone number to E.164 format (+2547XXXXXXXX).
 * Accepts inputs like "0712345678", "712345678", "+254712345678", "254712345678".
 * We use this normalized form as the user's email-equivalent identifier in auth
 * (Lovable Cloud uses email/password under the hood, so we map phone -> a synthetic email).
 */
export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("254")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);
  if (!/^[17]\d{8}$/.test(local)) return null; // Kenyan mobile: starts with 7 or 1, 9 digits
  return `+254${local}`;
}

export function phoneToAuthEmail(phoneE164: string): string {
  // Stable synthetic email so we can use email/password auth with phone as identifier.
  const stripped = phoneE164.replace(/\D/g, "");
  return `${stripped}@members.kalernairobi.local`;
}

export function formatPhoneDisplay(phoneE164: string | null | undefined): string {
  if (!phoneE164) return "";
  const m = phoneE164.match(/^\+254(\d{3})(\d{3})(\d{3})$/);
  if (!m) return phoneE164;
  return `+254 ${m[1]} ${m[2]} ${m[3]}`;
}
