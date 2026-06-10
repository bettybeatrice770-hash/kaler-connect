/**
 * Configuration Constants
 * Moved outside functions to avoid re-allocation on every invocation.
 */
const VALID_PREFIXES = new Set([
  // Legacy 07xx prefixes
  "70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
  // Newer 01xx prefixes (Safaricom, Airtel, Telkom, Equitel)
  "10", "11", "12", "13", "14", "15", "16"
]);

const SYNTHETIC_EMAIL_DOMAIN = "members.kalernairobi.local";

/**
 * Normalize a Kenyan phone number to E.164 format (+254XXXXXXXXX).
 * Accepts inputs like "0712345678", "712345678", "+254712345678", "0112345678".
 * * @param input The raw phone number string from user input.
 * @returns The E.164 formatted string, or null if the number is invalid.
 */
export function normalizeKenyanPhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Strip all non-numeric characters
  let digits = input.replace(/\D/g, "");

  // Strip country code variants or leading zeros to isolate the 9-digit local number
  if (digits.startsWith("254") && digits.length === 12) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0254") && digits.length === 13) {
    digits = digits.slice(4);
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = digits.slice(1);
  }

  // A valid local Kenyan mobile number must be exactly 9 digits long
  if (!/^\d{9}$/.test(digits)) {
    return null;
  }

  // Validate against recognized Kenyan telco prefixes
  const prefix2 = digits.substring(0, 2);
  if (!VALID_PREFIXES.has(prefix2)) {
    return null;
  }

  return `+254${digits}`;
}

/**
 * Convert a normalized E.164 Kenyan phone number to a synthetic email
 * used as the Supabase auth identifier.
 * e.g. "+254712345678" → "254712345678@members.kalernairobi.local"
 * * @param e164 A strictly validated E.164 phone number (e.g., "+254712345678")
 * @returns A synthetic email string.
 * @throws Error if the input is not a valid E.164 formatted Kenyan number.
 */
export function phoneToAuthEmail(e164: string): string {
  if (!e164 || !/^\+254\d{9}$/.test(e164)) {
    throw new Error(`Invalid E.164 phone number format provided: ${e164}`);
  }
  
  const cleanNumber = e164.replace(/^\+/, "");
  return `${cleanNumber}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Format a phone number (E.164 or raw) for human-readable display.
 * e.g. "+254712345678" → "0712 345 678"
 * e.g. "0112345678" → "0112 345 678"
 * Returns the original string unchanged if it cannot be parsed.
 * * @param phone Any phone string stored in the database or provided by user.
 * @returns A formatted display string.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "—";

  // Normalize first to ensure we have a standard E.164 base to parse from
  const e164 = normalizeKenyanPhone(phone);
  if (!e164) return phone.trim(); // Fallback to original input if normalization fails

  // Extract the 9-digit local number (removes "+254")
  const local = e164.slice(4); // e.g., "712345678" or "112345678"

  // Properly split into traditional local format: 07XX XXX XXX
  const group1 = local.substring(0, 3); // "712"
  const group2 = local.substring(3, 6); // "345"
  const group3 = local.substring(6);    // "678"

  return `0${group1} ${group2} ${group3}`;
}
