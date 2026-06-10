/**
 * Normalize a Kenyan phone number to E.164 format (+254XXXXXXXXX).
 * Accepts inputs like "0712345678", "712345678", "+254712345678", "254712345678", "0112345678".
 * * @param input The raw phone number string from user input.
 * @returns The E.164 formatted string, or null if the number is invalid.
 */
export function normalizeKenyanPhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // 1. Extract digits only
  let digits = input.replace(/\D/g, "");

  // 2. Strip country code if present (handles both 254... and accidental 0254...)
  if (digits.startsWith("254")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0254")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // 3. Ensure the remaining local number is exactly 9 digits
  if (!/^\d{9}$/.test(digits)) {
    return null;
  }

  // 4. Validate against all current Kenyan mobile prefixes (7XX, 11X, 12X, 13X)
  // Using string matching to avoid any potential octal/parsing edge cases.
  const prefix2 = digits.substring(0, 2); 
  const validPrefixes = ["70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "10", "11", "12", "13"];

  if (!validPrefixes.includes(prefix2)) {
    return null;
  }

  return `+254${digits}`;
}

/**
 * Convert a normalized E.164 Kenyan phone number to a synthetic email
 * used as the Supabase auth identifier.
 * * @param e164 A strictly validated E.164 phone number (e.g., "+254712345678")
 * @returns A synthetic email string (e.g., "254712345678@kaler.member")
 * @throws Error if the input is not a valid E.164 formatted Kenyan number.
 */
export function phoneToAuthEmail(e164: string): string {
  // Defensive check to ensure we don't generate invalid auth emails from malformed data
  if (!/^\+254\d{9}$/.test(e164)) {
    throw new Error(`Invalid E.164 phone number format provided: ${e164}`);
  }
  
  const cleanNumber = e164.replace(/^\+/, "");
  return `${cleanNumber}@kaler.member`;
}
