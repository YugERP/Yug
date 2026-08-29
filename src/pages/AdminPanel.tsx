import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Label, Input } from '../components/UI';
import { 
  Users, 
  GraduationCap, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Printer, 
  Building,
  CreditCard,
  Calendar,
  Award,
  Download,
  Smartphone,
  Check,
  FileText,
  Edit,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  X,
  ShieldCheck,
  CheckCheck,
  UploadCloud
} from 'lucide-react';
import type { Student, Teacher, User, ExamMark } from '../types';
import { StudentReportCard } from '../components/StudentReportCard';
import { normalizeGrade, isSameGrade, getDefaultSubjectsForGrade, parseExamHeader, normalizeSubject, isSameSubject, isValidPhotoUrl } from '../utils/gradeHelper';

// ERP modular components import
import { StudentRegistration } from '../components/erp/StudentRegistration';
import { AdmissionSlips } from '../components/erp/AdmissionSlips';
import { AdmitCardGenerator } from '../components/erp/AdmitCardGenerator';
import { FeeManagement } from '../components/erp/FeeManagement';
import { AttendanceTracker } from '../components/erp/AttendanceTracker';
import { ExamResults } from '../components/erp/ExamResults';
import { BulkResultsPrinter } from '../components/erp/BulkResultsPrinter';
import { IdCardPrinter } from '../components/erp/IdCardPrinter';
import { TcCcGenerator } from '../components/erp/TcCcGenerator';
import { StudentProgress } from '../components/erp/StudentProgress';
import { RecycleBin } from '../components/erp/RecycleBin';
import { ParentAccountManager } from '../components/erp/ParentAccountManager';

export function AdminPanel() {
  const { 
    currentUser,
    schools,
    students, 
    teachers, 
    users, 
    feeRecords, 
    issues, 
    academicSessions, 
    allowedSessions, 
    activeAcademicSession,
    setActiveAcademicSession,
    addAcademicSession, 
    editAcademicSession, 
    deleteAcademicSession, 
    importStudents, 
    deleteStudent, 
    addTeacher, 
    deleteTeacher, 
    resolveIssue, 
    addClerk, 
    deleteClerk, 
    importFeeRecords,
    sessionRequests,
    requestSessionApproval,
    marks,
    importMarks,
    attendances
  } = useStore();

  type ERP_TAB = 
    | 'overview' 
    | 'registration' 
    | 'admit-slips' 
    | 'admit-card'
    | 'fees' 
    | 'attendance' 
    | 'exams' 
    | 'idcard' 
    | 'tccc' 
    | 'progress'
    | 'recycle'
    | 'teachers' 
    | 'clerks' 
    | 'issues'
    | 'parents';

  const [activeTab, setActiveTab] = useState<ERP_TAB>('overview');

  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({ role: 'TEACHER', subjects: [], password: 'password123' });
  const [newClerk, setNewClerk] = useState<Partial<User>>({ role: 'CLERK', password: 'password123' });

  const [submittedStudent, setSubmittedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedReportCardStudent, setSelectedReportCardStudent] = useState<Student | null>(null);
  const [examsView, setExamsView] = useState<'entry' | 'print'>('entry');
  const [attendanceOverviewDate, setAttendanceOverviewDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Inside directory states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('All');
  const [showRegFormOption, setShowRegFormOption] = useState(false);

  // CSV Import with Duplicate Resolution Dialog State
  interface DuplicateImportItem {
    incomingStudent: Student;
    existingStudent: Student;
    marks: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[];
    matchReason: string;
  }

  interface NewImportItem {
    student: Student;
    marks: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[];
  }

  interface CsvImportPromptState {
    newItems: NewImportItem[];
    duplicateItems: DuplicateImportItem[];
    totalRows: number;
  }

  const [csvImportPrompt, setCsvImportPrompt] = useState<CsvImportPromptState | null>(null);

  const classes = ['All', 'Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const sortedStudentsToDisplay = [...students].reverse();
  let filteredDirectoryStudents = sortedStudentsToDisplay.filter(s => {
    const sPass = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                  (s.srNo && s.srNo.toLowerCase().includes(studentSearch.toLowerCase())) ||
                  (s.rollNo && String(s.rollNo).includes(studentSearch)) ||
                  (s.admissionNo && s.admissionNo.toLowerCase().includes(studentSearch.toLowerCase()));
    const cPass = studentClassFilter === 'All' ? true : isSameGrade(s.grade, studentClassFilter);
    return sPass && cPass;
  });

  if (studentSearch === '' && studentClassFilter === 'All') {
    filteredDirectoryStudents = filteredDirectoryStudents.slice(0, 50);
  }

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.name || !newTeacher.email || !newTeacher.subjects?.length || !newTeacher.password) return;
    addTeacher({ ...newTeacher, id: `t_${Date.now()}` } as Teacher);
    setNewTeacher({ role: 'TEACHER', subjects: [], password: 'password123' });
    alert('Faculty instructor successfully registered in school credentials database.');
  };

  const handleAddClerk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClerk.name || !newClerk.email || !newClerk.password) return;
    addClerk({ ...newClerk, id: `c_${Date.now()}` } as User);
    setNewClerk({ role: 'CLERK', password: 'password123' });
    alert('Clerk administrative login account successfully set.');
  };

  const handleStudentsCsvExport = () => {
    const examCombos = new Set<string>();
    marks.forEach(m => examCombos.add(`${m.subject}:::${m.examType}`));
    const dynamicExamCols = Array.from(examCombos).sort();

    const baseHeader = ['SR_No', 'Admission_No', 'Name', 'Gender', 'Father', 'Mother', 'DOB', 'Mobile', 'Aadhar', 'Email', 'Address', 'Class', 'RollNo', 'AcademicSession', 'PreviousClass', 'Stream', 'Password', 'FeeBalance', 'Photo_URL'];
    
    const dynamicHeaders = dynamicExamCols.flatMap(col => {
      const [subject, examType] = col.split(':::');
      return [`"${subject} ${examType} Obtained"`, `"${subject} ${examType} Max"`];
    });

    const header = [...baseHeader, ...dynamicHeaders];
    
    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = students.map(s => {
      const fullAddress = s.address || [s.presentVillageMohalla, s.presentPostOffice, s.presentDistrict, s.presentState, s.presentPinCode].filter(Boolean).join(', ') || '';
      const photoVal = isValidPhotoUrl(s.photoUrl) ? s.photoUrl : (isValidPhotoUrl(s.docStudentPhoto) ? s.docStudentPhoto : '');
      const sBase = [
        escapeCsv(s.srNo || ''),
        escapeCsv(s.admissionNo || ''),
        escapeCsv(s.name),
        escapeCsv(s.gender || ''),
        escapeCsv(s.fatherName || ''),
        escapeCsv(s.motherName || ''),
        escapeCsv(s.dob || ''),
        escapeCsv(s.mobile || ''),
        escapeCsv(s.aadhar || ''),
        escapeCsv(s.email || ''),
        escapeCsv(fullAddress),
        escapeCsv(s.grade),
        escapeCsv(s.rollNo),
        escapeCsv(s.academicSession || ''),
        escapeCsv(s.previousClass || ''),
        escapeCsv(s.stream || ''),
        escapeCsv(s.password || ''),
        escapeCsv(s.feeBalance !== undefined && !isNaN(s.feeBalance) ? s.feeBalance : 0),
        escapeCsv(photoVal || '')
      ];

      const sMarks = dynamicExamCols.flatMap(col => {
        const [subject, examType] = col.split(':::');
        const mk = marks.find(m => m.studentId === s.id && m.subject === subject && m.examType === examType);
        return [mk ? mk.marksObtained : '', mk ? mk.maxMarks : ''];
      });

      return [...sBase, ...sMarks];
    });

    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Helper to detect if an incoming student is a duplicate of any existing student
  const findDuplicateStudentMatch = (incoming: Partial<Student>): { existing: Student; reason: string } | null => {
    for (const existing of students) {
      if (existing.isDeleted) continue;

      // 1. Match by SR Number (if non-empty and not dummy)
      if (
        incoming.srNo && 
        existing.srNo && 
        incoming.srNo.trim().toLowerCase() === existing.srNo.trim().toLowerCase()
      ) {
        return { 
          existing, 
          reason: `SR No "${existing.srNo}" (मौजूदा छात्र: ${existing.name}, ${existing.grade})` 
        };
      }

      // 2. Match by Admission Number (if non-empty and not dummy)
      if (
        incoming.admissionNo && 
        existing.admissionNo && 
        incoming.admissionNo.trim().toLowerCase() === existing.admissionNo.trim().toLowerCase()
      ) {
        return { 
          existing, 
          reason: `Admission No "${existing.admissionNo}" (मौजूदा छात्र: ${existing.name}, ${existing.grade})` 
        };
      }

      // 3. Match by Name + Father Name + Class/Grade
      if (
        incoming.name && existing.name &&
        incoming.name.trim().toLowerCase() === existing.name.trim().toLowerCase() &&
        (incoming.fatherName || '').trim().toLowerCase() === (existing.fatherName || '').trim().toLowerCase() &&
        isSameGrade(incoming.grade, existing.grade)
      ) {
        return { 
          existing, 
          reason: `कक्षा ${existing.grade} में छात्र "${existing.name}" व पिता "${existing.fatherName || 'N/A'}" पहले से पंजीकृत हैं` 
        };
      }

      // 4. Match by Name + Father Name + Mother Name + Mobile
      if (
        incoming.name && existing.name &&
        incoming.name.trim().toLowerCase() === existing.name.trim().toLowerCase() &&
        (incoming.fatherName || '').trim().toLowerCase() === (existing.fatherName || '').trim().toLowerCase() &&
        (incoming.motherName || '').trim().toLowerCase() === (existing.motherName || '').trim().toLowerCase() &&
        (incoming.mobile || '').trim() && (existing.mobile || '').trim() &&
        (incoming.mobile || '').trim() === (existing.mobile || '').trim()
      ) {
        return { 
          existing, 
          reason: `छात्र नाम, माता-पिता का नाम और मोबाइल नंबर (${existing.mobile}) पूर्णतः समान है` 
        };
      }

      // 5. Match by Class + Roll No (in same academic session)
      if (
        isSameGrade(incoming.grade, existing.grade) &&
        incoming.rollNo && existing.rollNo &&
        String(incoming.rollNo).trim() === String(existing.rollNo).trim() &&
        (incoming.academicSession || activeAcademicSession || '') === (existing.academicSession || activeAcademicSession || '')
      ) {
        return { 
          existing, 
          reason: `सत्र ${existing.academicSession || activeAcademicSession} में कक्षा ${existing.grade} का रोल नंबर #${existing.rollNo} पहले से छात्र "${existing.name}" के पास है` 
        };
      }
    }
    return null;
  };

  const handleStudentsCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const parseLine = (line: string) => {
          const result: string[] = [];
          let inQuotes = false;
          let current = '';
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headerLine = parseLine(lines[0]);
        const headerMap: Record<string, number> = {};
        headerLine.forEach((h, idx) => {
          const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          headerMap[cleanH] = idx;
        });

        const getCol = (cols: string[], possibleKeys: string[], fallbackIdx?: number): string => {
          for (const key of possibleKeys) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (headerMap[cleanKey] !== undefined && cols[headerMap[cleanKey]] !== undefined) {
              return cols[headerMap[cleanKey]].replace(/^"|"$/g, '').trim();
            }
          }
          if (fallbackIdx !== undefined && cols[fallbackIdx] !== undefined) {
            return cols[fallbackIdx].replace(/^"|"$/g, '').trim();
          }
          return '';
        };

        const currentSession = activeAcademicSession || '2025-26';
        const newItems: NewImportItem[] = [];
        const duplicateItems: DuplicateImportItem[] = [];

        lines.slice(1).forEach((line, lineIdx) => {
          if (!line.trim()) return;
          const cols = parseLine(line);
          if (cols.length < 2) return;

          const rawName = getCol(cols, ['name', 'studentname', 'student_name', 'fullname', 'candidate_name'], 2) || (cols.length > 0 ? cols[0] : '');
          if (!rawName) return;

          const rawGrade = getCol(cols, ['class', 'grade', 'std', 'standard', 'classname'], 11) || (cols.length > 1 ? cols[1] : 'Class 1');
          const normalizedGrade = normalizeGrade(rawGrade);

          const rawSession = getCol(cols, ['academicsession', 'session', 'academic_session', 'year', 'sessionyear'], 13);
          const studentSession = rawSession ? rawSession.trim() : currentSession;

          const rawStream = getCol(cols, ['stream', 'group', 'branch', 'faculty'], 15);
          const rawRoll = getCol(cols, ['rollno', 'roll_no', 'roll', 'examrollno', 'rollnumber'], 12) || String(lineIdx + 1);
          const rawSr = getCol(cols, ['srno', 'sr_no', 'sr', 'serialno', 'srnumber'], 0) || `SR-${1000 + lineIdx + 1}`;
          const rawAdm = getCol(cols, ['admissionno', 'admission_no', 'admno', 'adm_no', 'regno', 'registrationno'], 1) || `ADM-${5000 + lineIdx + 1}`;

          const tempStudentId = `s_${Date.now()}_${lineIdx}_${Math.random().toString().slice(2, 6)}`;

          const parsedStudent: Student = {
            role: 'STUDENT',
            id: tempStudentId,
            schoolId: currentUser?.schoolId || '',
            srNo: rawSr,
            admissionNo: rawAdm,
            name: rawName,
            gender: (getCol(cols, ['gender', 'sex'], 3) as any) || 'Male',
            fatherName: getCol(cols, ['father', 'fathername', 'fathersname', 'father_name'], 4),
            motherName: getCol(cols, ['mother', 'mothername', 'mothersname', 'mother_name'], 5),
            dob: getCol(cols, ['dob', 'dateofbirth', 'birthdate'], 6),
            mobile: getCol(cols, ['mobile', 'phone', 'contact', 'mobileno', 'phoneno'], 7),
            aadhar: getCol(cols, ['aadhar', 'aadharno', 'aadhaar', 'uid'], 8),
            email: getCol(cols, ['email', 'emailid'], 9),
            address: getCol(cols, ['address', 'fulladdress', 'addr'], 10),
            grade: normalizedGrade,
            rollNo: rawRoll,
            academicSession: studentSession,
            previousClass: getCol(cols, ['previousclass', 'prevclass', 'prev_class'], 14),
            stream: rawStream as any,
            password: getCol(cols, ['password', 'pwd'], 16) || 'password123',
            feeBalance: Number(getCol(cols, ['feebalance', 'fee_balance', 'dues', 'balance'], 17) || 0),
            photoUrl: (() => {
              const rawP = getCol(cols, ['photourl', 'photo', 'photolink', 'image', 'picture', 'docstudentphoto', 'studentphoto']);
              if (isValidPhotoUrl(rawP)) return rawP.trim();
              if (cols[18] && isValidPhotoUrl(cols[18])) return cols[18].trim();
              return '';
            })(),
            subjects: getDefaultSubjectsForGrade(normalizedGrade, rawStream),
            isDeleted: false
          };

          // Extract all exam marks for this student row
          const rowMarksMap = new Map<string, Omit<ExamMark, 'id' | 'date' | 'schoolId'>>();
          
          for (let i = 0; i < cols.length; i++) {
            const colNameHeader = headerLine[i];
            if (!colNameHeader) continue;
            const parsedExam = parseExamHeader(colNameHeader);
            if (parsedExam && !parsedExam.isMax) {
              const val = Number(cols[i]);
              if (!isNaN(val) && cols[i] !== '') {
                const markKey = `${parsedExam.examType}:::${parsedExam.subject}`;
                const existingMark: Omit<ExamMark, 'id' | 'date' | 'schoolId'> = rowMarksMap.get(markKey) || {
                  studentId: tempStudentId,
                  teacherId: currentUser?.id || 'admin',
                  examType: parsedExam.examType,
                  subject: parsedExam.subject,
                  marksObtained: 0,
                  maxMarks: (parsedExam.examType === 'Half-Yearly Test' || parsedExam.examType === 'Yearly Test') ? 10 : 90,
                };

                // Find if there is an explicit Max column
                let explicitMax: number | undefined;
                if (i + 1 < cols.length && headerLine[i + 1]) {
                  const nextExam = parseExamHeader(headerLine[i + 1]);
                  if (nextExam && nextExam.isMax && isSameSubject(nextExam.subject, parsedExam.subject) && nextExam.isPractical === parsedExam.isPractical) {
                    const parsedMax = Number(cols[i + 1]);
                    if (!isNaN(parsedMax) && parsedMax > 0) {
                      explicitMax = parsedMax;
                    }
                  }
                }

                if (parsedExam.isPractical) {
                  existingMark.practicalMarks = val;
                  existingMark.practicalMaxMarks = explicitMax !== undefined ? explicitMax : 30;
                } else {
                  existingMark.marksObtained = val;
                  if (explicitMax !== undefined) {
                    existingMark.maxMarks = explicitMax;
                  }
                }

                rowMarksMap.set(markKey, existingMark);
              }
            }
          }

          const rowMarks: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[] = Array.from(rowMarksMap.values());

          // Check if this student matches any existing record
          const duplicateMatch = findDuplicateStudentMatch(parsedStudent);
          if (duplicateMatch) {
            const existing = duplicateMatch.existing;
            const existingId = existing.id;
            
            // Smart merge: preserve existing fields if incoming CSV fields are empty/blank
            const mergedIncomingStudent: Student = {
              ...existing,
              ...parsedStudent,
              id: existingId,
              schoolId: existing.schoolId || parsedStudent.schoolId,
              name: parsedStudent.name || existing.name,
              grade: parsedStudent.grade || existing.grade,
              srNo: parsedStudent.srNo || existing.srNo,
              admissionNo: parsedStudent.admissionNo || existing.admissionNo,
              fatherName: parsedStudent.fatherName || existing.fatherName,
              motherName: parsedStudent.motherName || existing.motherName,
              mobile: parsedStudent.mobile || existing.mobile,
              address: parsedStudent.address || existing.address,
              aadhar: parsedStudent.aadhar || existing.aadhar,
              email: parsedStudent.email || existing.email,
              gender: parsedStudent.gender || existing.gender,
              dob: parsedStudent.dob || existing.dob,
              rollNo: parsedStudent.rollNo || existing.rollNo,
              academicSession: parsedStudent.academicSession || existing.academicSession,
              stream: parsedStudent.stream || existing.stream,
              previousClass: parsedStudent.previousClass || existing.previousClass,
              feeBalance: parsedStudent.feeBalance !== undefined && !isNaN(parsedStudent.feeBalance) ? parsedStudent.feeBalance : existing.feeBalance,
              subjects: parsedStudent.subjects && parsedStudent.subjects.length > 0 ? parsedStudent.subjects : (existing.subjects || getDefaultSubjectsForGrade(existing.grade)),
              photoUrl: parsedStudent.photoUrl || (isValidPhotoUrl(existing.photoUrl) ? existing.photoUrl : (isValidPhotoUrl(existing.docStudentPhoto) ? existing.docStudentPhoto : '')) || '',
              isDeleted: false
            };

            duplicateItems.push({
              incomingStudent: mergedIncomingStudent,
              existingStudent: existing,
              marks: rowMarks.map(m => ({ ...m, studentId: existingId })),
              matchReason: duplicateMatch.reason
            });
          } else {
            newItems.push({
              student: parsedStudent,
              marks: rowMarks
            });
          }
        });

        const totalParsed = newItems.length + duplicateItems.length;
        if (totalParsed === 0) {
          alert('CSV फ़ाइल में कोई मान्य छात्र रिकॉर्ड नहीं मिला। (No valid student rows found in CSV file.)');
          return;
        }

        // If duplicate records exist, open the interactive confirmation modal
        if (duplicateItems.length > 0) {
          setCsvImportPrompt({
            newItems,
            duplicateItems,
            totalRows: totalParsed
          });
        } else {
          // No duplicates found, direct import of all new items
          const studentsToImport = newItems.map(item => item.student);
          const marksToImport = newItems.flatMap(item => item.marks);

          importStudents(studentsToImport);
          if (marksToImport.length > 0) {
            importMarks(marksToImport);
          }
          alert(`सफलतापूर्वक ${studentsToImport.length} नए छात्र और ${marksToImport.length} परीक्षा अंक (Marks) अपलोड किए गए। सभी परिणाम (Results) और रिपोर्ट कार्ड्स पर अपडेट हो चुके हैं।`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handler 1: Only import new records, skip duplicates
  const handleConfirmOnlyNew = () => {
    if (!csvImportPrompt) return;
    const studentsToImport = csvImportPrompt.newItems.map(item => item.student);
    const marksToImport = csvImportPrompt.newItems.flatMap(item => item.marks);

    if (studentsToImport.length > 0) {
      importStudents(studentsToImport);
    }
    if (marksToImport.length > 0) {
      importMarks(marksToImport);
    }

    const newCount = studentsToImport.length;
    const dupCount = csvImportPrompt.duplicateItems.length;
    const marksCount = marksToImport.length;
    setCsvImportPrompt(null);

    alert(`सफलतापूर्वक केवल ${newCount} नए छात्र रिकॉर्ड और उनके ${marksCount} परीक्षा अंक अपलोड किए गए। ${dupCount} डुप्लीकेट रिकॉर्ड छोड़ दिए गए।`);
  };

  // Handler 2: Allow duplicates, update existing records + add new records + sync all marks
  const handleConfirmAllowDuplicates = () => {
    if (!csvImportPrompt) return;
    const newStudents = csvImportPrompt.newItems.map(item => item.student);
    const updatedDuplicates = csvImportPrompt.duplicateItems.map(item => item.incomingStudent);
    const allStudents = [...newStudents, ...updatedDuplicates];

    const allMarks = [
      ...csvImportPrompt.newItems.flatMap(item => item.marks),
      ...csvImportPrompt.duplicateItems.flatMap(item => item.marks)
    ];

    if (allStudents.length > 0) {
      importStudents(allStudents);
    }
    if (allMarks.length > 0) {
      importMarks(allMarks);
    }

    const totalCount = allStudents.length;
    const marksCount = allMarks.length;
    setCsvImportPrompt(null);

    alert(`सफलतापूर्वक सभी ${totalCount} छात्र रिकॉर्ड (${newStudents.length} नए + ${updatedDuplicates.length} डुप्लीकेट अपडेटेड) और ${marksCount} परीक्षा अंक रिजल्ट और पोर्टल पर अपडेट कर दिए गए।`);
  };

  const handleCancelImport = () => {
    setCsvImportPrompt(null);
  };

  const currentSchool = schools.find(s => s.id === (currentUser?.schoolId || ''));
  const activeFeatures = currentSchool?.features;
  const checkFeature = (id: string) => !currentSchool || !activeFeatures || activeFeatures.includes(id);

  const menuTabs = [
    { id: 'overview', name: 'ERP dashboard', icon: Building, show: true },
    { id: 'registration', name: '1. Admission intake', icon: GraduationCap, show: checkFeature('registration') },
    { id: 'admit-slips', name: '2. Print slip receipts', icon: Printer, show: checkFeature('registration') },
    { id: 'admit-card', name: 'Admit Cards Generator', icon: FileText, show: checkFeature('admitcards') },
    { id: 'fees', name: '3. Fees collections', icon: CreditCard, show: checkFeature('fees') },
    { id: 'attendance', name: '4. Daily attendance', icon: Calendar, show: checkFeature('attendance') },
    { id: 'exams', name: '5. Exam grade cards', icon: Award, show: checkFeature('marks') },
    { id: 'idcard', name: '6. ID Badge prints', icon: Printer, show: checkFeature('idcard') },
    { id: 'tccc', name: '7. Cert signatures', icon: FileText, show: checkFeature('tc') },
    { id: 'progress', name: '8. Student Promotion', icon: TrendingUp, show: true },
    { id: 'recycle', name: '9. Recycle Bin', icon: Trash2, show: true },
    { id: 'parents', name: 'Parent Accounts', icon: Users, show: true },
    { id: 'teachers', name: 'Teacher catalog', icon: Users, show: true },
    { id: 'clerks', name: 'Staff coordinators', icon: Users, show: true },
    { id: 'issues', name: 'Admin support issues', icon: AlertCircle, show: true },
  ].filter(t => t.show);

  return (
    <div className="space-y-6">
      {/* School Branding Header */}
      {currentSchool && (
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 no-print">
          {currentSchool.logo && (
            <img src={currentSchool.logo} alt="School Logo" className="w-16 h-16 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold uppercase text-slate-800 font-serif leading-tight">{currentSchool.name}</h1>
            <p className="text-xs font-bold text-slate-500 tracking-wide">Admin Portal</p>
          </div>
        </div>
      )}
      
      {/* Horizontally scrolling beautifully padded menu bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar no-print">
        {menuTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'registration') {
                  setSubmittedStudent(null);
                }
              }}
              className={`px-3 py-1.5 font-bold rounded-lg text-[10.5px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 border ${activeTab === tab.id ? 'bg-indigo-650 border-indigo-700 bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 bg-white border-slate-205'}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* QUICK ACADEMIC SESSION ACTION SWITCHER */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md animate-pulse">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-indigo-900 tracking-wide uppercase flex items-center gap-2">
              Current Active View Session: 
              <span className="bg-indigo-200 text-indigo-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-indigo-300">
                {activeAcademicSession}
              </span>
            </h2>
            <p className="text-[10px] text-indigo-700 leading-normal font-medium mt-0.5">
              Looking at Fee Receipts, PDF printouts and student data for session <strong className="font-extrabold">{activeAcademicSession}</strong>.
            </p>
            <p className="text-[9px] text-indigo-600 italic">
              (यदि आप पुराने या नए साल के बच्चों की रसीद या डाटा देखना चाहते हैं, तो दाईं ओर से सत्र बदलें)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto bg-white p-1.5 rounded-lg border border-indigo-150 shadow-sm">
          <label htmlFor="session-switcher" className="text-[10.5px] font-extrabold text-slate-700 whitespace-nowrap pl-2 uppercase tracking-tight">
            Switch Session:
          </label>
          <select
            id="session-switcher"
            value={activeAcademicSession}
            onChange={(e) => setActiveAcademicSession(e.target.value)}
            className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-extrabold text-xs rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-505 cursor-pointer outline-none transition-all"
          >
            {academicSessions.map(session => (
              <option key={session} value={session} className="font-bold">
                Session {session} {session === activeAcademicSession ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABS RESOLUTIONS */}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 no-print">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><GraduationCap className="h-6 w-6"/></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Enrolled Registrar</p>
                <p className="text-xl font-black text-slate-800">{students.length} students</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><Users className="h-6 w-6"/></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Faculty Members</p>
                <p className="text-xl font-black text-slate-800">{teachers.length} teachers</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><CreditCard className="h-6 w-6"/></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Total Receipts</p>
                <p className="text-xl font-black text-slate-800">₹{feeRecords.reduce((a, b) => a + b.amount, 0).toLocaleString()}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><AlertCircle className="h-6 w-6"/></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">feedback tickets</p>
                <p className="text-xl font-black text-slate-800">{issues.filter(i => i.status === 'Open').length} pending</p>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              Academic Sessions Configuration
            </h3>
            
            <div className="mb-6 bg-slate-50 border border-emerald-100 p-4 rounded-lg">
              <Label className="mb-2 block font-semibold text-emerald-800">Active Academic Session</Label>
              <div className="flex items-center gap-3">
                <select 
                  value={activeAcademicSession}
                  onChange={(e) => setActiveAcademicSession(e.target.value)}
                  className="flex h-10 w-full md:w-1/3 items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  {allowedSessions.map(session => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">All data currently shown relates to this session.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="flex-1 min-w-[200px]">
                <Label>New Session (e.g. 2026-27)</Label>
                <Input value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} placeholder="e.g. 2026-27" />
              </div>
              <Button 
                onClick={() => {
                  if (newSessionName.trim()) {
                    addAcademicSession(newSessionName.trim());
                    setNewSessionName('');
                  }
                }} 
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Add Session
              </Button>
            </div>
          </Card>

          {/* TODAY'S ATTENDANCE HIGHLIGHTS & REAL-TIME STATUS (आज की उपस्थिति स्थिति) */}
          <Card className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                  Attendance Real-Time Tracker Overview (आज की उपस्थिति लाइव स्थिति)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  View marked attendance presence status and matching names of all teachers, staff, and students.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Label htmlFor="overviewDate" className="text-xs font-bold text-slate-600 whitespace-nowrap m-0">Select Date Check:</Label>
                <input 
                  id="overviewDate"
                  type="date" 
                  value={attendanceOverviewDate} 
                  onChange={(e) => setAttendanceOverviewDate(e.target.value)} 
                  className="text-xs bg-white border border-slate-205 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-bold border-slate-300"
                />
              </div>
            </div>

            {/* Matrix Split layouts for Staff and Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
              
              {/* STAFF SECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                  <h4 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    👥 Teachers & Clerk Presence Status
                  </h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold font-mono">
                    Staff Total: {[...users.filter(u => u.role === 'TEACHER' || u.role === 'CLERK'), ...teachers].length}
                  </span>
                </div>

                <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-50/20 max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {[...users.filter(u => u.role === 'TEACHER' || u.role === 'CLERK'), ...teachers].length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center font-sans">No staff or teachers registered in the system.</p>
                  ) : (
                    [...users.filter(u => u.role === 'TEACHER' || u.role === 'CLERK'), ...teachers].map(staff => {
                      const record = (attendances || []).find(a => a.userId === staff.id && a.date === attendanceOverviewDate);
                      const status = record ? record.status : 'Not Marked';

                      return (
                        <div key={staff.id} className="p-3 bg-white flex items-center justify-between text-xs transition-colors hover:bg-slate-50 font-sans">
                          <div>
                            <span className="font-extrabold text-slate-800 block text-xs">{staff.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span className="uppercase font-bold text-[8px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                                {staff.role}
                              </span>
                              | {staff.email}
                            </span>
                          </div>

                          <div>
                            {status === 'Present' && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 font-mono">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Present
                              </span>
                            )}
                            {status === 'Absent' && (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 font-mono">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Absent
                              </span>
                            )}
                            {(status === 'Excused' || status === 'Leave') && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 font-mono">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> On Leave
                              </span>
                            )}
                            {status === 'Not Marked' && (
                              <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 font-mono">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Unmarked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* STUDENTS SECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                  <h4 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    🎓 Student Daily Attendance Overview
                  </h4>
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold font-mono">
                    Absent: {students.filter(st => {
                      const record = (attendances || []).find(a => (a.studentId === st.id || a.userId === st.id) && a.date === attendanceOverviewDate);
                      return record && record.status === 'Absent';
                    }).length}
                  </span>
                </div>

                {/* Real-time counters for students */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-emerald-800 block">Present today</span>
                    <span className="text-sm font-black text-emerald-950 font-mono">
                      {students.filter(st => {
                        const record = (attendances || []).find(a => (a.studentId === st.id || a.userId === st.id) && a.date === attendanceOverviewDate);
                        return record && record.status === 'Present';
                      }).length}
                    </span>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-rose-800 block">Absent today</span>
                    <span className="text-sm font-black text-rose-950 font-mono">
                      {students.filter(st => {
                        const record = (attendances || []).find(a => (a.studentId === st.id || a.userId === st.id) && a.date === attendanceOverviewDate);
                        return record && record.status === 'Absent';
                      }).length}
                    </span>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-amber-800 block">On Leave today</span>
                    <span className="text-sm font-black text-amber-950 font-mono">
                      {students.filter(st => {
                        const record = (attendances || []).find(a => (a.studentId === st.id || a.userId === st.id) && a.date === attendanceOverviewDate);
                        return record && (record.status === 'Excused' || record.status === 'Leave');
                      }).length}
                    </span>
                  </div>
                </div>

                {/* Sub list of Absent Students */}
                <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-50/20 max-h-[195px] overflow-y-auto divide-y divide-slate-100 font-sans">
                  {students.filter(st => {
                    const record = (attendances || []).find(a => (a.studentId === st.id || a.userId === st.id) && a.date === attendanceOverviewDate);
                    return record && (record.status === 'Absent' || record.status === 'Excused' || record.status === 'Leave');
                  }).length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center font-sans">No student absentees on this date. Perfect presence!</p>
                  ) : (
                    students.filter(st => {
                      const record = (attendances || []).find(a => (a.studentId === st.id || a.userId === st.id) && a.date === attendanceOverviewDate);
                      return record && (record.status === 'Absent' || record.status === 'Excused' || record.status === 'Leave');
                    }).map(st => {
                      const record = (attendances || []).find(a => (a.studentId === st.id || a.userId === st.id) && a.date === attendanceOverviewDate);
                      const status = record?.status;

                      return (
                        <div key={st.id} className="p-2.5 bg-white flex items-center justify-between text-xs font-sans">
                          <div>
                            <span className="font-extrabold text-slate-800 block">{st.name}</span>
                            <span className="text-[10px] text-slate-400">
                              Grade: <span className="font-bold text-slate-600">{st.grade}</span> | Roll No: <span className="font-bold text-slate-600 font-mono">{st.rollNo}</span>
                            </span>
                          </div>

                          <div>
                            {status === 'Absent' ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase font-mono tracking-wide">
                                Absent
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase font-mono tracking-wide">
                                On Leave
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </Card>
        </div>
      )}

      {/* STUDENT REGISTRATION TAB */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4 no-print">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
                Student Registration Center
              </h2>
              
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => {
                    setShowRegFormOption(false);
                    setEditingStudent(null);
                  }}
                  className={`px-3 py-1.5 border rounded-lg font-bold transition-all ${(!showRegFormOption && !editingStudent) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Roster Database directory
                </button>
                <button
                  onClick={() => {
                    setShowRegFormOption(true);
                    setSubmittedStudent(null);
                    setEditingStudent(null);
                  }}
                  className={`px-3 py-1.5 border rounded-lg font-bold transition-all ${(showRegFormOption && !editingStudent) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  + Add Provisional Student Admission
                </button>
              </div>
            </div>

            {editingStudent ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-xs uppercase font-extrabold text-indigo-700 tracking-wider">Student Profile Editor (प्रोफ़ाइल संशोधन)</h3>
                    <p className="text-[11px] text-indigo-900 mt-0.5">Modifying registrar record parameters for: <span className="font-extrabold bg-indigo-100 px-1.5 py-0.5 rounded ml-1 text-slate-900">{editingStudent.name}</span></p>
                  </div>
                  <Button
                    onClick={() => setEditingStudent(null)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-bold px-3 py-1.5 flex items-center gap-1 shrink-0"
                  >
                    Back to directory (लौटें)
                  </Button>
                </div>
                <StudentRegistration 
                  studentToEdit={editingStudent}
                  onCancel={() => setEditingStudent(null)}
                  onSuccess={(updatedSt) => {
                    setEditingStudent(null);
                    alert(`Student profile for "${updatedSt.name}" has been successfully updated.`);
                  }}
                />
              </div>
            ) : showRegFormOption ? (
              submittedStudent ? (
                <div className="space-y-4 no-print border p-4 bg-emerald-50 rounded-lg border-emerald-200">
                  <div className="flex justify-between items-center bg-white p-4 border rounded flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase">Provisional Class Admission Registered!</h4>
                      <p className="text-[11px] text-slate-500">Student {submittedStudent.name} successfully configured inside school systems.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        setEditingStudent(submittedStudent);
                        setSubmittedStudent(null);
                        setShowRegFormOption(false);
                      }} className="bg-amber-600 hover:bg-amber-700 font-bold text-xs gap-1">
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit student data</span>
                      </Button>
                      <Button onClick={() => {
                        setActiveTab('admit-slips');
                      }} className="bg-indigo-600 font-bold hover:bg-indigo-700 text-xs gap-1">
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print provisional Slip Receipt</span>
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => setSubmittedStudent(null)} className="w-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 font-bold text-xs mt-2">Register alternative student</Button>
                </div>
              ) : (
                <StudentRegistration onSuccess={(st) => {
                  setSubmittedStudent(st);
                  setShowRegFormOption(false);
                  setActiveTab('admit-slips');
                }} />
              )
            ) : (
              /* Directory Search lists */
              <div className="space-y-4 no-print">
                <div className="flex justify-between items-end gap-4 bg-slate-50 p-4 border rounded flex-wrap">
                  <div className="flex gap-3 flex-1 flex-wrap">
                    <div className="min-w-[150px]">
                      <Label>Standard Class Filters</Label>
                      <Input as="select" value={studentClassFilter} onChange={e => setStudentClassFilter(e.target.value)}>
                        {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                      </Input>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label>Search by Student Name / SR No</Label>
                      <input 
                        type="text" 
                        placeholder="Search student profile list..." 
                        value={studentSearch} 
                        onChange={e => setStudentSearch(e.target.value)} 
                        className="w-full text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" onClick={handleStudentsCsvExport} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 h-auto">Export CSV</Button>
                    <Label className="cursor-pointer bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 text-xs px-3 py-1.5 rounded mb-0">
                      Import CSV
                      <input type="file" accept=".csv" className="hidden" onChange={handleStudentsCsvImport} />
                    </Label>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                  <span>{studentSearch === '' && studentClassFilter === 'All' ? 'Showing latest 10 admissions. Use filters to search full database.' : `Found ${filteredDirectoryStudents.length} results`}</span>
                </div>
                {/* Directory table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] border rounded border-slate-200">
                  <table className="w-full text-left text-[11px] text-slate-650">
                    <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3">Photo</th>
                        <th className="px-4 py-3">SR No</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Class Enrolled</th>
                        <th className="px-4 py-3">Mobile Contact</th>
                        <th className="px-4 py-3 text-right">Ledger Options</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredDirectoryStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 italic text-slate-400">No matching student profiles registered yet.</td>
                        </tr>
                      ) : filteredDirectoryStudents.map(st => (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2">
                            {isValidPhotoUrl(st.docStudentPhoto || st.photoUrl) ? (
                              <img 
                                src={(isValidPhotoUrl(st.docStudentPhoto) ? st.docStudentPhoto : st.photoUrl) || ''} 
                                alt="" 
                                className="w-[32px] h-[32px] rounded-lg object-cover border" 
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-[32px] h-[32px] rounded-lg bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">Empty</div>
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono font-bold text-slate-700">{st.srNo || 'N/A'}</td>
                          <td className="px-4 py-2">
                            <span className="font-extrabold text-slate-900 text-xs block">{st.name}</span>
                            {st.studentNameHindi && <span className="block text-[9px] text-indigo-750 font-sans mt-0.5">{st.studentNameHindi}</span>}
                          </td>
                          <td className="px-4 py-2">
                            <span className="font-bold text-slate-800 text-[10px]">{st.grade}</span>
                            <span className="block text-[9px] text-slate-450 font-mono">RollNo: {st.rollNo}</span>
                            {st.academicHistory && st.academicHistory.length > 0 && (
                              <span 
                                className="inline-block text-[8px] bg-indigo-50/60 border border-indigo-150 text-indigo-700 px-1 py-0.5 mt-1 rounded font-bold uppercase tracking-wider cursor-help" 
                                title={st.academicHistory.map(h => `Session: ${h.academicSession} | Grade: ${h.grade} | Status: ${h.resultStatus || 'N/A'}`).join('\n')}
                              >
                                🎓 {st.academicHistory.length} Promoted Term{st.academicHistory.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-slate-600 font-mono font-medium">{st.fatherMobile || st.mobile || 'N/A'}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button 
                                onClick={() => {
                                  setEditingStudent(st);
                                  setShowRegFormOption(false);
                                  setSubmittedStudent(null);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} 
                                className="text-amber-700 hover:text-amber-850 p-1 bg-amber-50 border border-amber-150 rounded text-[9.5px] font-black uppercase flex items-center gap-0.5" 
                                title="Edit Student Profile details"
                              >
                                <Edit className="h-3.5 w-3.5"/>
                                <span>Edit details</span>
                              </button>
                              <button 
                                onClick={() => setSelectedReportCardStudent(st)} 
                                className="text-indigo-650 hover:text-indigo-850 p-1 bg-indigo-50 border border-indigo-100 rounded text-[9.5px] font-black uppercase flex items-center gap-0.5" 
                                title="Exam Report Document Transcript"
                              >
                                <Award className="h-3.5 w-3.5"/>
                                <span>Exam Report Card</span>
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Are you absolutely sure you want to permanently delete the registrar file of ${st.name}? This action is irreversible!`)) {
                                    deleteStudent(st.id);
                                  }
                                }} 
                                className="text-rose-500 hover:text-rose-600 p-1.5 bg-rose-50 hover:bg-rose-100 rounded border border-rose-100" 
                                title="Delete registrar"
                              >
                                <Trash2 className="h-3.5 w-3.5"/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ADMISSION SLIPS TAB */}
      {activeTab === 'admit-slips' && (
        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b pb-2 no-print">
            <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
            Admission Confirmation Receipts
          </h2>
          <AdmissionSlips 
            initialStudent={submittedStudent} 
            onEdit={(st) => {
              setEditingStudent(st);
              setShowRegFormOption(false);
              setSubmittedStudent(null);
              setActiveTab('registration');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </Card>
      )}

      {/* ADMIT CARDS TAB */}
      {activeTab === 'admit-card' && (
        <Card className="p-6 bg-slate-50">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b pb-2 no-print">
            <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
            Examination Admit Cards Generator
          </h2>
          <AdmitCardGenerator />
        </Card>
      )}

      {/* FEES TAB */}
      {activeTab === 'fees' && (
        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b pb-2 no-print">
            <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
            Institution Fees Collections activity
          </h2>
          <FeeManagement />
        </Card>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b pb-2 no-print">
            <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
            Institution Daily Attendance roll registers
          </h2>
          <AttendanceTracker />
        </Card>
      )}

      {/* EXAMS GRADES TAB */}
      {activeTab === 'exams' && (
        <Card className="p-6 print:p-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 mb-4 gap-4 no-print">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
              Student Examination & Report Cards
            </h2>
            
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setExamsView('entry')}
                className={`px-3 py-1 text-[10.5px] font-bold uppercase rounded-md transition-all ${examsView === 'entry' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Enter Marks Ledger
              </button>
              <button
                onClick={() => setExamsView('print')}
                className={`px-3 py-1 text-[10.5px] font-bold uppercase rounded-md transition-all ${examsView === 'print' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Print Report Cards (Bulk & Single)
              </button>
            </div>
          </div>

          {examsView === 'entry' ? <ExamResults /> : <BulkResultsPrinter />}
        </Card>
      )}

      {/* ID BADGE TAB */}
      {activeTab === 'idcard' && (
        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b pb-2 no-print">
            <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
            Class pocket ID Cards layout printing
          </h2>
          <IdCardPrinter />
        </Card>
      )}

      {/* CERTIFICATION TC / CC TAB */}
      {activeTab === 'tccc' && (
        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b pb-2 no-print">
            <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
            Transfer & Character certifications Desk
          </h2>
          <TcCcGenerator />
        </Card>
      )}

      {/* STUDENT PROGRESS & PROMOTIONS TAB */}
      {activeTab === 'progress' && (
        <Card className="p-6">
          <StudentProgress />
        </Card>
      )}

      {/* RECYCLE BIN TAB */}
      {activeTab === 'recycle' && (
        <Card className="p-6">
          <RecycleBin />
        </Card>
      )}

      {/* PARENTS ACOUNTS TAB */}
      {activeTab === 'parents' && (
        <ParentAccountManager />
      )}

      {/* TEACHERS TAB */}
      {activeTab === 'teachers' && (
        <Card className="p-6 no-print">
          <h2 className="text-sm font-bold mb-4 text-slate-700 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
            Add New Teacher Faculty
          </h2>
          <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 items-end">
            <div><Label>Name</Label><Input value={newTeacher.name || ''} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} required /></div>
            <div><Label>Email</Label><Input type="email" value={newTeacher.email || ''} onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} required /></div>
            <div><Label>Password</Label><Input value={newTeacher.password || ''} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} required /></div>
            <div><Label>Subjects taught</Label><Input value={newTeacher.subjects?.join(', ') || ''} onChange={e => setNewTeacher({...newTeacher, subjects: e.target.value.split(',').map(s=>s.trim())})} placeholder="e.g. Hindi, Math" required /></div>
            <div className="flex justify-end font-bold text-xs"><Button type="submit" className="w-full">Register Instructor</Button></div>
          </form>

          <div className="overflow-x-auto border-t border-slate-100 pt-4">
            <table className="w-full text-left text-[12px] text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Password</th><th className="px-4 py-3">Subjects taught</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 border-b border-slate-50">
                    <td className="px-4 py-2 font-bold text-slate-800">{t.name}</td>
                    <td className="px-4 py-2 font-mono text-[11px]">{t.email}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-slate-500">{t.password}</td>
                    <td className="px-4 py-2 font-semibold text-slate-705">{t.subjects.join(', ')}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => deleteTeacher(t.id)} className="text-rose-500 hover:text-rose-600 p-1" title="Delete Teacher"><Trash2 className="h-4 w-4"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CLERKS TAB */}
      {activeTab === 'clerks' && (
        <Card className="p-6 no-print">
          <h2 className="text-sm font-bold mb-4 text-slate-700 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
            Add New Staff Clerk
          </h2>
          <form onSubmit={handleAddClerk} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
            <div><Label>Clerk Name</Label><Input value={newClerk.name || ''} onChange={e => setNewClerk({...newClerk, name: e.target.value})} required /></div>
            <div><Label>Email</Label><Input type="email" value={newClerk.email || ''} onChange={e => setNewClerk({...newClerk, email: e.target.value})} required /></div>
            <div><Label>Password</Label><Input value={newClerk.password || ''} onChange={e => setNewClerk({...newClerk, password: e.target.value})} required /></div>
            <div className="flex justify-end font-bold text-xs"><Button type="submit" className="w-full bg-indigo-650">Register Clerk Account</Button></div>
          </form>

          <div className="overflow-x-auto border-t border-slate-100 pt-4">
            <table className="w-full text-left text-[12px] text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
                <tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.filter(u => u.role === 'CLERK').map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 border-b border-slate-50">
                    <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{c.id}</td>
                    <td className="px-4 py-2 font-bold text-slate-800">{c.name}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{c.email}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => deleteClerk(c.id)} className="text-rose-500 hover:text-rose-600 p-1" title="Delete Clerk"><Trash2 className="h-4 w-4"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SUPPORT ISSUES TAB */}
      {activeTab === 'issues' && (
        <Card className="p-6 no-print">
          <h2 className="text-lg font-bold mb-4">Support & Feedback desk Issues</h2>
          {issues.length === 0 ? (
             <div className="text-center py-10 text-slate-500 text-xs italic">No issues reported inside the institution feed currently.</div>
          ) : (
            <div className="space-y-4">
              {issues.map(issue => (
                <div key={issue.id} className={`p-4 rounded-lg border ${issue.status === 'Open' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'} flex justify-between items-start`}>
                  <div>
                    <div className="flex gap-2 items-center mb-2">
                       <span className="font-bold text-sm text-slate-900">{issue.fromUserName}</span>
                       <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">{issue.fromUserRole}</span>
                       <span className="text-xs text-slate-500">{new Date(issue.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-850 text-sm font-medium">{issue.description}</p>
                  </div>
                  {issue.status === 'Open' ? (
                     <Button variant="outline" className="text-xs py-1" onClick={() => resolveIssue(issue.id)}>Mark Resolved</Button>
                  ) : (
                     <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded border border-green-200"><CheckCircle className="h-3.5 w-3.5"/> Resolved</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {selectedReportCardStudent && (
        <StudentReportCard 
          student={selectedReportCardStudent} 
          onClose={() => setSelectedReportCardStudent(null)} 
        />
      )}

      {/* CSV IMPORT DUPLICATE RECORDS CONFIRMATION MODAL */}
      {csvImportPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide">
                    डुप्लीकेट रिकॉर्ड पाए गए (Duplicate Records Detected)
                  </h3>
                  <p className="text-xs text-amber-100 font-medium">
                    CSV फ़ाइल में कुल {csvImportPrompt.totalRows} में से {csvImportPrompt.duplicateItems.length} डुप्लीकेट रिकॉर्ड मिले हैं।
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCancelImport}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary KPI Badges */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500">कुल फ़ाइल रिकॉर्ड</span>
                  <p className="text-xl font-black text-slate-800">{csvImportPrompt.totalRows}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">नए छात्र (New)</span>
                  <p className="text-xl font-black text-emerald-800">{csvImportPrompt.newItems.length}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700">डुप्लीकेट (Duplicates)</span>
                  <p className="text-xl font-black text-amber-800">{csvImportPrompt.duplicateItems.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700">कुल परीक्षा मार्क्स</span>
                  <p className="text-xl font-black text-blue-800">
                    {csvImportPrompt.newItems.flatMap(x => x.marks).length + csvImportPrompt.duplicateItems.flatMap(x => x.marks).length}
                  </p>
                </div>
              </div>

              {/* Duplicate Records Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold text-slate-700">
                    पहचाने गए डुप्लीकेट छात्र विवरण ({csvImportPrompt.duplicateItems.length} Records):
                  </Label>
                  <span className="text-[11px] text-slate-500">
                    (Matching SR No, Adm No, Name, or Roll No)
                  </span>
                </div>
                
                <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto overflow-x-auto bg-slate-50/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">छात्र नाम (Student)</th>
                        <th className="px-3 py-2">कक्षा (Grade)</th>
                        <th className="px-3 py-2">पिता का नाम (Father)</th>
                        <th className="px-3 py-2">SR / Adm No</th>
                        <th className="px-3 py-2">मिलान का कारण (Match Reason)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {csvImportPrompt.duplicateItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-800">
                            {item.incomingStudent.name}
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-medium">
                            {item.incomingStudent.grade}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {item.incomingStudent.fatherName || '-'}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                            {item.incomingStudent.srNo || item.incomingStudent.admissionNo || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-700" />
                              {item.matchReason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User Confirmation Question & Instructions */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  क्या आप डुप्लीकेट रिकॉर्ड को भी अपलोड / अपडेट करना चाहते हैं?
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-1">
                  <li>
                    <strong className="text-emerald-700">केवल नए रिकॉर्ड (New Only):</strong> केवल {csvImportPrompt.newItems.length} नए छात्र और उनके अंक अपलोड होंगे। डुप्लीकेट रिकॉर्ड छोड़ दिए जाएंगे।
                  </li>
                  <li>
                    <strong className="text-blue-700">डुप्लीकेट भी अनुमति दें (Allow Duplicates):</strong> नए छात्र जोड़े जाएंगे और डुप्लीकेट छात्रों का डेटा व परीक्षा अंक (Marks) अपडेट हो जाएंगे।
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelImport}
                  className="w-full sm:w-auto text-xs px-4 py-2"
                >
                  रद्द करें (Cancel)
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmOnlyNew}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  केवल नए रिकॉर्ड अपलोड करें ({csvImportPrompt.newItems.length} New Only)
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmAllowDuplicates}
                  className="w-full sm:w-auto bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs px-4 py-2 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCheck className="w-4 h-4" />
                  हाँ, डुप्लीकेट भी अनुमति दें और अपडेट करें ({csvImportPrompt.totalRows} All)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
