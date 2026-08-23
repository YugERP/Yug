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

/**
 * Normalizes subject names across various formats, abbreviations, and languages
 */
export function normalizeSubject(subject?: string | null): string {
  if (!subject) return 'General';
  const clean = subject.toString().trim();
  if (!clean) return 'General';

  const subLower = clean.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (/^math/.test(subLower)) return 'Mathematics';
  if (/^hindi/.test(subLower)) return 'Hindi';
  if (/^eng/.test(subLower)) return 'English';
  if (/^sci/.test(subLower) && !subLower.includes('social')) return 'Science';
  if (/^soc|^sst|^social/.test(subLower)) return 'Social Science';
  if (/^sans/.test(subLower)) return 'Sanskrit';
  if (/^draw|^art|^craft/.test(subLower)) return 'Drawing';
  if (/^gk|^general|^moral/.test(subLower)) return 'G.K Moral';
  if (/^reas/.test(subLower)) return 'Reasoning';
  if (/^pt|^physic/.test(subLower) && !subLower.includes('physics')) return 'P.T.';
  if (/^comp|^it$/.test(subLower)) return 'Computer Science';
  if (/^urdu/.test(subLower)) return 'Urdu';
  if (/^home/.test(subLower)) return 'Home Science';
  if (/^phys/.test(subLower)) return 'Physics';
  if (/^chem/.test(subLower)) return 'Chemistry';
  if (/^bio/.test(subLower)) return 'Biology';
  if (/^acc/.test(subLower)) return 'Accountancy';
  if (/^bus|^bst/.test(subLower)) return 'Business Studies';
  if (/^eco/.test(subLower)) return 'Economics';
  if (/^hist/.test(subLower)) return 'History';
  if (/^geo/.test(subLower)) return 'Geography';
  if (/^pol/.test(subLower)) return 'Political Science';

  // Return formatted capitalized subject if unrecognized
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Checks if two subject names represent the same academic subject
 */
export function isSameSubject(s1?: string | null, s2?: string | null): boolean {
  if (!s1 || !s2) return false;
  if (s1.trim().toLowerCase() === s2.trim().toLowerCase()) return true;
  return normalizeSubject(s1).toLowerCase() === normalizeSubject(s2).toLowerCase();
}

/**
 * Robust parser for exam column headers in imported CSV files.
 * Handles formats like:
 * - "Hindi Half-Yearly Test Obtained", "Hindi Half-Yearly Test Max"
 * - "Hindi Half-Yearly Exam Obtained", "Hindi Yearly Exam Max"
 * - "Hindi (Half-Yearly Test)", "Mathematics Yearly Exam"
 * - "Hindi_Marks", "Maths_Marks", "Science"
 */
export function parseExamHeader(headerName: string): { subject: string; examType: 'Half-Yearly Test' | 'Half-Yearly Exam' | 'Yearly Test' | 'Yearly Exam'; isMax: boolean } | null {
  const clean = headerName.replace(/["']/g, '').trim();
  if (!clean) return null;

  const isMax = /\b(max|maximum|total|maxmarks|max_marks)\b/i.test(clean);

  // Check known exam types in order of specificity
  let examType: 'Half-Yearly Test' | 'Half-Yearly Exam' | 'Yearly Test' | 'Yearly Exam' = 'Yearly Exam';
  let textWithoutExam = clean;

  if (/half[-_\s]?yearly[-_\s]?test|half[-_\s]?year[-_\s]?test|hy[-_\s]?test|half[-_\s]?test/i.test(clean)) {
    examType = 'Half-Yearly Test';
    textWithoutExam = clean.replace(/half[-_\s]?yearly[-_\s]?test|half[-_\s]?year[-_\s]?test|hy[-_\s]?test|half[-_\s]?test/gi, '');
  } else if (/half[-_\s]?yearly[-_\s]?exam|half[-_\s]?year[-_\s]?exam|hy[-_\s]?exam|half[-_\s]?yearly|half[-_\s]?year|hy/i.test(clean)) {
    examType = 'Half-Yearly Exam';
    textWithoutExam = clean.replace(/half[-_\s]?yearly[-_\s]?exam|half[-_\s]?year[-_\s]?exam|hy[-_\s]?exam|half[-_\s]?yearly|half[-_\s]?year|hy/gi, '');
  } else if (/yearly[-_\s]?test|annual[-_\s]?test|final[-_\s]?test|y[-_\s]?test/i.test(clean)) {
    examType = 'Yearly Test';
    textWithoutExam = clean.replace(/yearly[-_\s]?test|annual[-_\s]?test|final[-_\s]?test|y[-_\s]?test/gi, '');
  } else if (/yearly[-_\s]?exam|annual[-_\s]?exam|final[-_\s]?exam|annual|yearly|final/i.test(clean)) {
    examType = 'Yearly Exam';
    textWithoutExam = clean.replace(/yearly[-_\s]?exam|annual[-_\s]?exam|final[-_\s]?exam|annual|yearly|final/gi, '');
  } else if (/\btest\b/i.test(clean)) {
    examType = 'Half-Yearly Test';
    textWithoutExam = clean.replace(/\btest\b/gi, '');
  } else if (/\bexam\b/i.test(clean)) {
    examType = 'Half-Yearly Exam';
    textWithoutExam = clean.replace(/\bexam\b/gi, '');
  }

  // Strip trailing/leading keywords like "Obtained", "Max", "Marks", "Score", parentheses, underscores
  let subjectText = textWithoutExam
    .replace(/\b(obtained|obt|max|maximum|total|maxmarks|max_marks|marks|mark|score|points)\b/gi, '')
    .replace(/[()[\]_]/g, ' ')
    .trim();

  if (!subjectText) return null;

  // Disallow student general info field names from being misinterpreted as subjects
  const bannedKeywords = [
    'name', 'studentname', 'fullname', 'sr', 'srno', 'admission', 'admissionno', 'admno',
    'roll', 'rollno', 'class', 'grade', 'std', 'father', 'mother', 'gender', 'sex', 'dob',
    'mobile', 'phone', 'contact', 'aadhar', 'email', 'address', 'password', 'session',
    'stream', 'balance', 'dues', 'feebalance', 'photo', 'previousclass', 'prevclass'
  ];
  
  const cleanSubLower = subjectText.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (bannedKeywords.includes(cleanSubLower)) {
    return null;
  }

  const subject = normalizeSubject(subjectText);
  return { subject, examType, isMax };
}
