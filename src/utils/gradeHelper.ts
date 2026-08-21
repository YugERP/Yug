export const ALL_STANDARD_CLASSES = [
  'Nursery',
  'L.K.G',
  'U.K.G',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

/**
 * Normalizes any grade/class representation into standard app class format:
 * e.g. "9", "9th", "IX", "class 9", "Class 9th" -> "Class 9"
 * "nur", "nursery" -> "Nursery"
 * "lkg", "l.k.g." -> "L.K.G"
 * "ukg", "u.k.g." -> "U.K.G"
 */
export function normalizeGrade(gradeStr?: string | null): string {
  if (!gradeStr) return 'Class 1';
  const clean = gradeStr.toString().trim();
  if (!clean) return 'Class 1';

  // Roman numerals mapping
  const lower = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const romanMap: Record<string, string> = {
    i: 'Class 1',
    ii: 'Class 2',
    iii: 'Class 3',
    iv: 'Class 4',
    v: 'Class 5',
    vi: 'Class 6',
    vii: 'Class 7',
    viii: 'Class 8',
    ix: 'Class 9',
    x: 'Class 10',
    xi: 'Class 11',
    xii: 'Class 12',
    classi: 'Class 1',
    classii: 'Class 2',
    classiii: 'Class 3',
    classiv: 'Class 4',
    classv: 'Class 5',
    classvi: 'Class 6',
    classvii: 'Class 7',
    classviii: 'Class 8',
    classix: 'Class 9',
    classx: 'Class 10',
    classxi: 'Class 11',
    classxii: 'Class 12',
  };

  if (romanMap[lower]) {
    return romanMap[lower];
  }

  // Pre-primary checks
  if (/^nur(s(ery)?)?$/i.test(clean) || /^pg|play(group)?$/i.test(clean)) {
    return 'Nursery';
  }
  if (/^l\.?k\.?g\.?$/i.test(clean) || lower === 'lkg') {
    return 'L.K.G';
  }
  if (/^u\.?k\.?g\.?$/i.test(clean) || lower === 'ukg') {
    return 'U.K.G';
  }

  // Numeric checks: e.g. "9", "9th", "Class 9", "class 9th", "Grade 9", "Std 9"
  const numMatch = clean.match(/(?:class|grade|std)?\s*(\d{1,2})(?:st|nd|rd|th)?/i);
  if (numMatch && numMatch[1]) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 12) {
      return `Class ${num}`;
    }
  }

  // Capitalize nicely if it starts with class
  if (/^class\s+/i.test(clean)) {
    return clean.replace(/^class\s+/i, 'Class ');
  }

  return clean;
}

/**
 * Checks if two grade strings represent the same class
 */
export function isSameGrade(g1?: string | null, g2?: string | null): boolean {
  if (!g1 || !g2) return false;
  if (g1 === g2) return true;
  return normalizeGrade(g1).toLowerCase() === normalizeGrade(g2).toLowerCase();
}

/**
 * Provides comprehensive standard subjects for a given grade and optional stream
 */
export function getDefaultSubjectsForGrade(gradeStr?: string | null, stream?: string | null): string[] {
  const norm = normalizeGrade(gradeStr);

  if (norm === 'Nursery' || norm === 'L.K.G' || norm === 'U.K.G') {
    return ['English', 'Hindi', 'Mathematics', 'Drawing', 'Rhymes', 'G.K.'];
  }

  if (norm === 'Class 1' || norm === 'Class 2' || norm === 'Class 3' || norm === 'Class 4' || norm === 'Class 5') {
    return ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Drawing', 'G.K Moral', 'Reasoning', 'P.T.'];
  }

  if (norm === 'Class 6' || norm === 'Class 7' || norm === 'Class 8') {
    return ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'Drawing', 'G.K Moral', 'P.T.'];
  }

  if (norm === 'Class 9' || norm === 'Class 10') {
    return ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Drawing', 'P.T.'];
  }

  // Class 11 and 12 Stream based
  if (norm === 'Class 11' || norm === 'Class 12') {
    const st = (stream || '').toUpperCase();
    if (st.includes('COMMERCE')) {
      return ['Hindi', 'English', 'Accountancy', 'Business Studies', 'Economics', 'P.T.'];
    }
    if (st.includes('ARTS') || st.includes('HUMANITIES')) {
      return ['Hindi', 'English', 'History', 'Geography', 'Political Science', 'P.T.'];
    }
    if (st.includes('BIO')) {
      return ['Hindi', 'English', 'Physics', 'Chemistry', 'Biology', 'P.T.'];
    }
    // Default PCM / Science
    return ['Hindi', 'English', 'Physics', 'Chemistry', 'Mathematics', 'P.T.'];
  }

  return ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Drawing', 'P.T.'];
}
