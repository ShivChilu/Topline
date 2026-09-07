/**
 * Shared Candidate Filters & Parsing Utilities
 * Handles flexible input formats for height (e.g. 5'4", 5.4, 165cm), weight, gender, age, and location.
 */

export function parseHeightInCm(val: any): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toLowerCase();
  if (!str || str === "n/a" || str === "-") return null;

  // Case 1: Pure centimeters like "165 cm", "170cm", or numbers in [90, 250]
  const cmMatch = str.match(/^(\d{2,3})\s*(?:cm)?$/i);
  if (cmMatch) {
    const num = parseFloat(cmMatch[1]);
    if (num >= 90 && num <= 250) return num;
  }

  // Case 2: Feet & Inches like 5'4", 5'4, 5ft 4in, 5 ft 4, 5-4, 5' 4"
  const ftInMatch = str.match(/^(\d{1})\s*(?:'|ft|feet|\.|\-|\s)\s*(\d{1,2})?(?:\s*(?:"|in|inch|inches)?)?$/i);
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1], 10);
    const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
    if (feet >= 3 && feet <= 8 && inches < 12) {
      return (feet * 12 + inches) * 2.54;
    }
  }

  // Case 3: Just feet like "5", "5ft", "6 feet"
  const ftOnlyMatch = str.match(/^(\d{1})\s*(?:ft|feet)?$/i);
  if (ftOnlyMatch) {
    const feet = parseInt(ftOnlyMatch[1], 10);
    if (feet >= 3 && feet <= 8) {
      return feet * 12 * 2.54;
    }
  }

  // Case 4: General numeric float like 5.5, 5.2, etc.
  const floatVal = parseFloat(str.replace(/[^\d.]/g, ""));
  if (!isNaN(floatVal)) {
    if (floatVal >= 90 && floatVal <= 250) return floatVal;
    if (floatVal >= 3 && floatVal <= 8) {
      const feet = Math.floor(floatVal);
      const dec = floatVal - feet;
      const inches = dec > 0 ? (dec <= 0.11 ? Math.round(dec * 100) : Math.round(dec * 12)) : 0;
      return (feet * 12 + inches) * 2.54;
    }
  }

  return null;
}

export function parseWeightInKg(val: any): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toLowerCase();
  const num = parseFloat(str.replace(/[^\d.]/g, ""));
  if (!isNaN(num) && num >= 30 && num <= 200) return num;
  return null;
}

export function matchesGender(genderStr: string | null | undefined, filter: string): boolean {
  if (!filter || filter === "ALL") return true;
  if (!genderStr) return false;
  const g = genderStr.trim().toLowerCase();
  if (filter === "FEMALE") {
    return g.includes("female") || g === "f" || g.includes("girl") || g.includes("woman") || g.includes("lady");
  }
  if (filter === "MALE") {
    return (g.includes("male") && !g.includes("female")) || g === "m" || g.includes("boy") || g.includes("man") || g.includes("gent");
  }
  if (filter === "OTHER") {
    return !g.includes("female") && !g.includes("male") && !g.includes("girl") && !g.includes("boy");
  }
  return true;
}

export function matchesHeight(heightStr: string | null | undefined, filter: string): boolean {
  if (!filter || filter === "ALL") return true;
  const cm = parseHeightInCm(heightStr);
  if (!cm) return false;

  const minCmMap: Record<string, number> = {
    "5_0": 152.4, // ≥ 5'0" (152.4 cm)
    "5_2": 157.48, // ≥ 5'2" (157.48 cm)
    "5_3": 160.02, // ≥ 5'3" (160 cm)
    "5_4": 162.56, // ≥ 5'4" (162.56 cm)
    "5_5": 165.1, // ≥ 5'5" (165.1 cm)
    "5_6": 167.64, // ≥ 5'6" (167.64 cm)
    "5_8": 172.72, // ≥ 5'8" (172.72 cm)
    "5_10": 177.8, // ≥ 5'10" (177.8 cm)
    "6_0": 182.88, // ≥ 6'0" (182.88 cm)
  };

  const minCm = minCmMap[filter];
  if (minCm !== undefined) {
    return cm >= minCm;
  }
  return true;
}

export function matchesAge(age: number | string | null | undefined, filter: string): boolean {
  if (!filter || filter === "ALL") return true;
  if (age === null || age === undefined || age === "") return false;
  const num = typeof age === "number" ? age : parseInt(String(age).replace(/[^\d]/g, ""), 10);
  if (isNaN(num)) return false;

  if (filter === "18_20") return num >= 18 && num <= 20;
  if (filter === "21_23") return num >= 21 && num <= 23;
  if (filter === "24_26") return num >= 24 && num <= 26;
  if (filter === "27_PLUS") return num >= 27;
  return true;
}

export function matchesWeight(weightStr: string | null | undefined, filter: string): boolean {
  if (!filter || filter === "ALL") return true;
  const kg = parseWeightInKg(weightStr);
  if (!kg) return false;

  if (filter === "UNDER_50") return kg < 50;
  if (filter === "50_60") return kg >= 50 && kg <= 60;
  if (filter === "60_70") return kg >= 60 && kg <= 70;
  if (filter === "70_PLUS") return kg > 70;
  return true;
}
