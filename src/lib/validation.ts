/**
 * Centralized validation utilities for Topline ODC
 */

export const STANDARD_HEIGHT_OPTIONS = [
  { value: "4'10\" (147 cm)", label: "4'10\" (147 cm)" },
  { value: "4'11\" (150 cm)", label: "4'11\" (150 cm)" },
  { value: "5'0\" (152 cm)", label: "5'0\" (152 cm)" },
  { value: "5'1\" (155 cm)", label: "5'1\" (155 cm)" },
  { value: "5'2\" (157 cm)", label: "5'2\" (157 cm)" },
  { value: "5'3\" (160 cm)", label: "5'3\" (160 cm)" },
  { value: "5'4\" (163 cm)", label: "5'4\" (163 cm)" },
  { value: "5'5\" (165 cm)", label: "5'5\" (165 cm)" },
  { value: "5'6\" (168 cm)", label: "5'6\" (168 cm)" },
  { value: "5'7\" (170 cm)", label: "5'7\" (170 cm)" },
  { value: "5'8\" (173 cm)", label: "5'8\" (173 cm)" },
  { value: "5'9\" (175 cm)", label: "5'9\" (175 cm)" },
  { value: "5'10\" (178 cm)", label: "5'10\" (178 cm)" },
  { value: "5'11\" (180 cm)", label: "5'11\" (180 cm)" },
  { value: "6'0\" (183 cm)", label: "6'0\" (183 cm)" },
  { value: "6'1\" (185 cm)", label: "6'1\" (185 cm)" },
  { value: "6'2\" (188 cm)", label: "6'2\" (188 cm)" },
  { value: "6'3\" (191 cm)", label: "6'3\" (191 cm)" },
  { value: "6'4\" (193 cm)", label: "6'4\" (193 cm)" },
  { value: "6'5\" (196 cm)", label: "6'5\" (196 cm)" },
  { value: "6'6\" (198 cm)", label: "6'6\" (198 cm)" },
];

/**
 * Validates candidate height format.
 * Accepts:
 * - Structured options: `5'10" (178 cm)`
 * - Feet & inches: `5'10"`, `5'10`, `5.10`, `5ft 10in`, `5 ft 10`, `5'8"`, `6'0"`, `6ft` (4ft to 7ft 6in)
 * - Centimeters: `178 cm`, `178cm`, `178` (120cm to 230cm)
 * Rejects invalid strings / gibberish like `fesfs`, `abc`, `0`, `999`.
 */
export function isValidHeight(height: string | null | undefined): boolean {
  if (!height) return false;
  const raw = String(height).trim();
  if (!raw) return false;

  // 1. Check formatted option: 5'10" (178 cm)
  const comboMatch = raw.match(/^([4-7])'(\d{1,2})"?\s*(?:\((\d{2,3})\s*cm\))?$/i);
  if (comboMatch) {
    const ft = parseInt(comboMatch[1], 10);
    const inch = parseInt(comboMatch[2], 10);
    if (ft >= 4 && ft <= 7 && inch >= 0 && inch <= 11) return true;
  }

  // 2. Check centimeters: 120cm to 230cm
  const cmMatch = raw.match(/^(\d{2,3})\s*(?:cm)?$/i);
  if (cmMatch) {
    const cm = parseInt(cmMatch[1], 10);
    if (cm >= 120 && cm <= 230) return true;
  }

  // 3. Check feet & inches: 5'10", 5'10, 5.10, 5ft 10in, 5ft 10, 5ft, 6'1", 6ft 2in
  const ftInMatch = raw.match(/^([4-7])\s*(?:ft|'|foot|feet|\.)\s*(\d{1,2})?(?:\s*(?:in|''|"|inches)?)?$/i);
  if (ftInMatch) {
    const ft = parseInt(ftInMatch[1], 10);
    const inch = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
    if (ft >= 4 && ft <= 7 && inch >= 0 && inch <= 11) return true;
  }

  // 4. Check space or dash separated: e.g. "5 10", "5-10"
  const spaceMatch = raw.match(/^([4-7])[\s\-](\d{1,2})$/);
  if (spaceMatch) {
    const ft = parseInt(spaceMatch[1], 10);
    const inch = parseInt(spaceMatch[2], 10);
    if (ft >= 4 && ft <= 7 && inch >= 0 && inch <= 11) return true;
  }

  return false;
}

/**
 * Normalizes a valid height string to standard display format e.g. 5'10" (178 cm)
 */
export function normalizeHeight(height: string): string {
  const raw = String(height).trim();
  if (!isValidHeight(raw)) return raw;

  // If already standard combo format, return as is
  const standard = STANDARD_HEIGHT_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === raw.toLowerCase() || opt.value.startsWith(raw)
  );
  if (standard) return standard.value;

  // CM to Ft/In
  const cmMatch = raw.match(/^(\d{2,3})\s*(?:cm)?$/i);
  if (cmMatch) {
    const cm = parseInt(cmMatch[1], 10);
    const totalInches = Math.round(cm / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${ft}'${inches}" (${cm} cm)`;
  }

  // Ft/In to CM
  const ftInMatch = raw.match(/^([4-7])\s*(?:ft|'|foot|feet|\.|\s|\-)\s*(\d{1,2})?(?:\s*(?:in|''|"|inches)?)?$/i);
  if (ftInMatch) {
    const ft = parseInt(ftInMatch[1], 10);
    const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
    const cm = Math.round((ft * 12 + inches) * 2.54);
    return `${ft}'${inches}" (${cm} cm)`;
  }

  return raw;
}

/**
 * Validates Indian UPI ID format.
 * e.g., 9876543210@paytm, user@oksbi, name@okhdfcbank
 */
export function isValidUPI(upi: string | null | undefined): boolean {
  if (!upi) return true; // Optional field
  const raw = String(upi).trim();
  if (!raw) return true;
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(raw);
}
