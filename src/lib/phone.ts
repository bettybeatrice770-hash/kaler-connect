/**
 * Normalize a Kenyan phone number to E.164 format (+254XXXXXXXXX).
 * Accepts inputs like "0712345678", "712345678", "+254712345678", "254712345678", "0112345678".
 * * @param input The raw phone number string from user input.
 * @returns The E.164 formatted string, or null if the number is invalid.
 */
export function normalizeKenyanPhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Strip all non-numeric characters
  let digits = input.replace(/\D/g, "");

  // Strip country code variants to get the core 9-digit local number
  if (digits.startsWith("254")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0254")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // A valid local Kenyan mobile number must be exactly 9 digits long
  if (!/^\d{9}$/.test(digits)) {
    return null;
  }

  // Validate prefixes based on Communications Authority of Kenya allocations:
  // - Legacy numbers: 7XX (700-799)
  // - Newer numbers: 1XX (100-115, and future-proofing up to 15X)
  const prefix7 = digits.substring(0, 1); // For '7'
  const prefix1 = digits.substring(0, 2); // For '10', '11', '12', '13', '14', '15'

  const isValid7Series = prefix7 === "7";
  const isValid1Series = ["10", "11", "12", "13", "14", "15"].includes(prefix1);

  if (!isValid7Series && !isValid1Series) {
    return null;
  }

  return `+254${digits}`;
}

/**
 * Convert a normalized E.164 Kenyan phone number to a synthetic email
 * used as the Supabase auth identifier.
 * e.g. "+254712345678" → "254712345678@members.kalernairobi.local"
 * * @param e164 A strictly validated E.164 phone number (e.g., "+254712345678")
 * @returns A synthetic email string (e.g., "254712345678@members.kalernairobi.local")
 * @throws Error if the input is not a valid E.164 formatted Kenyan number.
 */
export function phoneToAuthEmail(e164: string): string {
  const trimmed = (e164 || "").trim();

  // Enforce rigid E.164 format check before processing
  if (!/^\+254\d{9}$/.test(trimmed)) {
    throw new Error(`Invalid E.164 phone number format provided: ${e164}`);
  }

  // Strip the leading '+' and append the internal domain
  const cleanNumber = trimmed.slice(1); 
  return `${cleanNumber}@members.kalernairobi.local`;
}
