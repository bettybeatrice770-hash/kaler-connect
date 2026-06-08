/**
 * Normalize a Kenyan phone number to E.164 format (+2547XXXXXXXX).
 * Accepts inputs like "0712345678", "712345678", "+254712345678", "254712345678".
 */
export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  let local = digits;
  
  if (local.startsWith("254")) {
    local = local.slice(3);
  } else if (local.startsWith("0")) {
    local = local.slice(1);
  }

  // Must be exactly 9 digits and start with a valid Kenyan mobile prefix
  if (!/^\d{9}$/.test(local)) return null;
  
  const prefix = parseInt(local.substring(0, 2), 10);
  const validPrefixes = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 10, 11];
  
  if (!validPrefixes.includes(prefix)) return null;

  return `+254${local}`;
}
