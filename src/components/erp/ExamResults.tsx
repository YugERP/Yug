import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type ExamType, type ExamMark } from '../../types';
import { 
  Award, CheckCircle, Search, Save, Calendar, CheckSquare, Sparkles, 
  Layers, Users, User, ChevronLeft, ChevronRight, Sliders, Grid, BookOpen,
  ArrowRight, RefreshCw, Check, FlaskConical, Trash2
} from 'lucide-react';
import { 
  normalizeGrade, isSameGrade, getDefaultSubjectsForGrade, ALL_STANDARD_CLASSES, 
  isSameSubject, normalizeSubject, isPracticalSubject, getDefaultPracticalMaxMarks 
} from '../../utils/gradeHelper';

type EntryMode = 'single-subject' | 'student-mixed' | 'class-matrix' | 'attendance';

const PRESET_MAX_MARKS = [10, 20, 25, 30, 50, 60, 70, 80, 90, 100];
const PRESET_PRACTICAL_MAX_MARKS = [10, 15, 20, 25, 30, 40, 50];

export function ExamResults() {
  const { students, marks, addMark, importMarks, deleteMark, deleteSubjectMarks, deleteStudentAllMarks, updateStudent, currentUser } = useStore();
  const [activeMode, setActiveMode] = useState<EntryMode>('single-subject');
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [examType, setExamType] = useState<ExamType>('Half-Yearly Test');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk max marks tool state for Single Subject mode
  const [bulkMaxMarksInput, setBulkMaxMarksInput] = useState<number>(10);
  const [bulkPracticalMaxMarksInput, setBulkPracticalMaxMarksInput] = useState<number>(30);
  const [forceShowPractical, setForceShowPractical] = useState<boolean>(false);
  const [applyToAllSubjectsForExam, setApplyToAllSubjectsForExam] = useState<boolean>(true);

  // Filter students by class (memoized to prevent infinite re-renders)
  const classStudents = React.useMemo(() => {
    return students
      .filter(s => !s.isDeleted && (s.grade === selectedClass || isSameGrade(s.grade, selectedClass)))
      .sort((a, b) => {
        const rA = Number(a.rollNo);
        const rB = Number(b.rollNo);
        if (!isNaN(rA) && !isNaN(rB)) return rA - rB;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [students, selectedClass]);

  const filteredStudents = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return classStudents;
    return classStudents.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.rollNo && String(s.rollNo).includes(q)) ||
      (s.srNo && s.srNo.toLowerCase().includes(q)) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(q))
    );
  }, [classStudents, searchQuery]);

  // Dynamically compile subjects based on class standards and student enrollment choices
  const subjects = React.useMemo(() => {
    const classSubjectsSet = new Set<string>();
    getDefaultSubjectsForGrade(selectedClass).forEach(sub => classSubjectsSet.add(sub));
    classStudents.forEach(st => {
      if (st.subjects && Array.isArray(st.subjects)) {
        st.subjects.forEach(sub => classSubjectsSet.add(sub));
      }
      if (st.optionalSubject) {
        classSubjectsSet.add(st.optionalSubject);
      }
    });
    return classSubjectsSet.size > 0 
      ? Array.from(classSubjectsSet)
      : ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Drawing', 'G.K Moral', 'Reasoning', 'P.T.', 'Sanskrit', 'Computer Science', 'Urdu', 'Home Science'];
  }, [selectedClass, classStudents]);

  const [subject, setSubject] = useState(subjects[0] || 'Hindi');

  // Keep subject in sync if list changes
  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(subject)) {
      setSubject(subjects[0]);
    }
  }, [subjects, subject]);

  // Check if current subject or exam has practical component
  const isSubjectPractical = isPracticalSubject(subject);
  const isExamTypePracticalOnly = examType === 'Half-Yearly Practical' || examType === 'Yearly Practical' || examType === 'Practical Exam';
  const isPracticalActive = isExamTypePracticalOnly || isSubjectPractical || forceShowPractical;

  // Set smart default for bulkMaxMarksInput when examType or subject changes
  useEffect(() => {
    if (examType === 'Half-Yearly Test' || examType === 'Yearly Test') {
      setBulkMaxMarksInput(10);
    } else if (isExamTypePracticalOnly) {
      setBulkMaxMarksInput(30);
      setBulkPracticalMaxMarksInput(30);
    } else if (isSubjectPractical) {
      setBulkMaxMarksInput(60);
      setBulkPracticalMaxMarksInput(30);
    } else {
      setBulkMaxMarksInput(90);
    }
  }, [examType, subject, isSubjectPractical, isExamTypePracticalOnly]);

  // -------------------------------------------------------------
  // MODE 1: SINGLE SUBJECT LOCAL STATE
  // -------------------------------------------------------------
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});
  const [maxMarksMap, setMaxMarksMap] = useState<Record<string, number>>({});
  const [practicalMarksMap, setPracticalMarksMap] = useState<Record<string, number>>({});
  const [practicalMaxMarksMap, setPracticalMaxMarksMap] = useState<Record<string, number>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // -------------------------------------------------------------
  // MODE 2: STUDENT 4-IN-1 MIXED EXAMS STATE
  // -------------------------------------------------------------
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Set default selected student
  useEffect(() => {
    if (classStudents.length > 0) {
      if (!selectedStudentId || !classStudents.some(s => s.id === selectedStudentId)) {
        setSelectedStudentId(classStudents[0].id);
      }
    } else if (selectedStudentId !== '') {
      setSelectedStudentId('');
    }
  }, [classStudents, selectedStudentId]);

  // Column bulk max marks for 4-in-1 student mixed sheet
  const [studentMixedMaxMarks, setStudentMixedMaxMarks] = useState<{
    'Half-Yearly Test': number;
    'Half-Yearly Exam': number;
    'Yearly Test': number;
    'Yearly Exam': number;
  }>({
    'Half-Yearly Test': 10,
    'Half-Yearly Exam': 90,
    'Yearly Test': 10,
    'Yearly Exam': 90
  });

  // Local grid of marks for currently selected student in Mode 2:
  // key format: `${subject}:::${examType}:::obt` or `...:::max` or `...:::oralObt` or `...:::oralMax` or `...:::pracObt` or `...:::pracMax`
  const [studentMixedMarks, setStudentMixedMarks] = useState<Record<string, number>>({});
  const [isStudentMixedSaved, setIsStudentMixedSaved] = useState(false);
  const [isStudentMixedSaving, setIsStudentMixedSaving] = useState(false);

  // Initialize Mode 2 student mixed marks when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) return;
    const initialMap: Record<string, number> = {};
    const stMarks = marks.filter(m => m.studentId === selectedStudentId);

    const examTypesList: ExamType[] = ['Half-Yearly Test', 'Half-Yearly Exam', 'Yearly Test', 'Yearly Exam'];

    subjects.forEach(sub => {
      const subHasPrac = isPracticalSubject(sub);
      examTypesList.forEach(et => {
        const found = stMarks.find(m => isSameSubject(m.subject, sub) && m.examType === et);
        // Also check if dedicated practical record exists
        const pracEt: ExamType | null = et === 'Half-Yearly Exam' ? 'Half-Yearly Practical' : et === 'Yearly Exam' ? 'Yearly Practical' : null;
        const foundPrac = pracEt ? stMarks.find(m => isSameSubject(m.subject, sub) && m.examType === pracEt) : null;

        const defaultTheoryMax = (et === 'Half-Yearly Test' || et === 'Yearly Test') ? 10 : subHasPrac ? 60 : 90;
        const defaultPracMax = subHasPrac ? 30 : 0;

        initialMap[`${sub}:::${et}:::obt`] = found ? found.marksObtained : 0;
        initialMap[`${sub}:::${et}:::max`] = found ? found.maxMarks : defaultTheoryMax;

        const oObt = found?.oralMarks !== undefined ? found.oralMarks : 0;
        const oMax = found?.oralMaxMarks !== undefined ? found.oralMaxMarks : 0;
        initialMap[`${sub}:::${et}:::oralObt`] = oObt;
        initialMap[`${sub}:::${et}:::oralMax`] = oMax;

        const pObt = found?.practicalMarks !== undefined ? found.practicalMarks : (foundPrac ? foundPrac.marksObtained : 0);
        const pMax = found?.practicalMaxMarks !== undefined ? found.practicalMaxMarks : (foundPrac ? foundPrac.maxMarks : defaultPracMax);

        initialMap[`${sub}:::${et}:::pracObt`] = pObt;
        initialMap[`${sub}:::${et}:::pracMax`] = pMax;
      });
    });

    setStudentMixedMarks(initialMap);
    setIsStudentMixedSaved(false);
  }, [selectedStudentId, selectedClass, marks, subjects]);

  // -------------------------------------------------------------
  // MODE 3: CLASS MASTER GRID STATE
  // -------------------------------------------------------------
  const [matrixMarks, setMatrixMarks] = useState<Record<string, { obt: number; max: number }>>({});
  const [isMatrixSaved, setIsMatrixSaved] = useState(false);
  const [isMatrixSaving, setIsMatrixSaving] = useState(false);

  useEffect(() => {
    const map: Record<string, { obt: number; max: number }> = {};
    const defaultMax = (examType === 'Half-Yearly Test' || examType === 'Yearly Test') ? 10 : isExamTypePracticalOnly ? 30 : 90;

    classStudents.forEach(st => {
      subjects.forEach(sub => {
        const found = marks.find(m => m.studentId === st.id && m.examType === examType && isSameSubject(m.subject, sub));
        map[`${st.id}:::${sub}`] = {
          obt: found ? found.marksObtained : 0,
          max: found ? found.maxMarks : defaultMax
        };
      });
    });
    setMatrixMarks(map);
    setIsMatrixSaved(false);
  }, [selectedClass, examType, marks, subjects, classStudents, isExamTypePracticalOnly]);

  // -------------------------------------------------------------
  // MODE 4: ATTENDANCE LEDGER STATE
  // -------------------------------------------------------------
  const [attendancePresentMap, setAttendancePresentMap] = useState<Record<string, number>>({});
  const [attendanceTotalMap, setAttendanceTotalMap] = useState<Record<string, number>>({});
  const [bulkTotalDays, setBulkTotalDays] = useState<string>('220');
  const [isAttendanceSaved, setIsAttendanceSaved] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const existingGrades = Array.from(new Set(students.filter(s => !s.isDeleted).map(s => normalizeGrade(s.grade))));
  const classes = Array.from(new Set([...ALL_STANDARD_CLASSES, ...existingGrades]));
  const examTypes: ExamType[] = [
    'Half-Yearly Test', 
    'Half-Yearly Exam', 
    'Half-Yearly Practical', 
    'Yearly Test', 
    'Yearly Exam', 
    'Yearly Practical', 
    'Practical Exam'
  ];

  // -------------------------------------------------------------
  // HELPERS & HANDLERS: SINGLE SUBJECT (MODE 1)
  // -------------------------------------------------------------
  const getObtainedMarks = (studentId: string) => {
    if (marksMap[studentId] !== undefined) return marksMap[studentId];
    const existing = marks.find(m => m.studentId === studentId && m.examType === examType && isSameSubject(m.subject, subject));
    return existing ? existing.marksObtained : 0;
  };

  const getMaxMarks = (studentId: string) => {
    if (maxMarksMap[studentId] !== undefined) return maxMarksMap[studentId];
    const existing = marks.find(m => m.studentId === studentId && m.examType === examType && isSameSubject(m.subject, subject));
    if (existing) return existing.maxMarks;
    if (examType === 'Half-Yearly Test' || examType === 'Yearly Test') return 10;
    if (isExamTypePracticalOnly) return 30;
    if (isSubjectPractical) return 60;
    return 90;
  };

  const getPracticalMarks = (studentId: string) => {
    if (practicalMarksMap[studentId] !== undefined) return practicalMarksMap[studentId];
    const existing = marks.find(m => m.studentId === studentId && (m.examType === examType || (isExamTypePracticalOnly && (m.examType === 'Half-Yearly Exam' || m.examType === 'Yearly Exam'))) && isSameSubject(m.subject, subject));
    if (existing && existing.practicalMarks !== undefined) return existing.practicalMarks;
    if (existing && isExamTypePracticalOnly) return existing.marksObtained;
    return 0;
  };

  const getPracticalMaxMarks = (studentId: string) => {
    if (practicalMaxMarksMap[studentId] !== undefined) return practicalMaxMarksMap[studentId];
    const existing = marks.find(m => m.studentId === studentId && (m.examType === examType || (isExamTypePracticalOnly && (m.examType === 'Half-Yearly Exam' || m.examType === 'Yearly Exam'))) && isSameSubject(m.subject, subject));
    if (existing && existing.practicalMaxMarks !== undefined) return existing.practicalMaxMarks;
    if (existing && isExamTypePracticalOnly) return existing.maxMarks;
    return bulkPracticalMaxMarksInput || 30;
  };

  const handleMarkChange = (studentId: string, value: string) => {
    const val = Number(value);
    setMarksMap(prev => ({
      ...prev,
      [studentId]: isNaN(val) ? 0 : val
    }));
    setIsSaved(false);
  };

  const handleMaxMarkChange = (studentId: string, value: string) => {
    const val = Number(value);
    setMaxMarksMap(prev => ({
      ...prev,
      [studentId]: isNaN(val) ? 0 : val
    }));
    setIsSaved(false);
  };

  const handlePracticalMarkChange = (studentId: string, value: string) => {
    const val = Number(value);
    setPracticalMarksMap(prev => ({
      ...prev,
      [studentId]: isNaN(val) ? 0 : val
    }));
    setIsSaved(false);
  };

  const handlePracticalMaxMarkChange = (studentId: string, value: string) => {
    const val = Number(value);
    setPracticalMaxMarksMap(prev => ({
      ...prev,
      [studentId]: isNaN(val) ? 0 : val
    }));
    setIsSaved(false);
  };

  // ONE-CLICK BULK APPLY MAX MARKS TO ALL STUDENTS
  const handleApplyBulkMaxMarks = (newMax?: number) => {
    const targetMax = newMax !== undefined ? newMax : Number(bulkMaxMarksInput);
    if (isNaN(targetMax) || targetMax <= 0) {
      alert('कृपया वैध अधिकतम अंक (Max Marks) दर्ज करें!');
      return;
    }

    const updatedMaxMap: Record<string, number> = { ...maxMarksMap };
    classStudents.forEach(st => {
      updatedMaxMap[st.id] = targetMax;
    });

    setMaxMarksMap(updatedMaxMap);
    setBulkMaxMarksInput(targetMax);
    setIsSaved(false);
  };

  const handleApplyBulkPracticalMaxMarks = (newMax?: number) => {
    const targetMax = newMax !== undefined ? newMax : Number(bulkPracticalMaxMarksInput);
    if (isNaN(targetMax) || targetMax <= 0) {
      alert('कृपया वैध प्रायोगिक अधिकतम अंक (Practical Max Marks) दर्ज करें!');
      return;
    }

    const updatedPracMaxMap: Record<string, number> = { ...practicalMaxMarksMap };
    classStudents.forEach(st => {
      updatedPracMaxMap[st.id] = targetMax;
    });

    setPracticalMaxMarksMap(updatedPracMaxMap);
    setBulkPracticalMaxMarksInput(targetMax);
    setIsSaved(false);
  };

  // Submit single subject marks for all class students
  const handleSubmitSingleSubjectMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (classStudents.length === 0) return;

    setIsSaving(true);
    try {
      const marksToSave: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[] = [];

      classStudents.forEach(st => {
        const hasMain = st.subjects && st.subjects.some(s => isSameSubject(s, subject));
        const hasOpt = st.optionalSubject && isSameSubject(st.optionalSubject, subject);
        if (subjects.length > 0 && !hasMain && !hasOpt && (st.subjects && st.subjects.length > 0)) {
          // Skip if student doesn't have this subject
          return;
        }

        const marksObtained = getObtainedMarks(st.id);
        const maxMarks = getMaxMarks(st.id);
        const pracObt = getPracticalMarks(st.id);
        const pracMax = getPracticalMaxMarks(st.id);

        if (isExamTypePracticalOnly) {
          marksToSave.push({
            studentId: st.id,
            teacherId: currentUser?.id || 'admin',
            examType,
            subject: normalizeSubject(subject),
            marksObtained: marksObtained || pracObt,
            maxMarks: maxMarks || pracMax,
            practicalMarks: pracObt || marksObtained,
            practicalMaxMarks: pracMax || maxMarks
          });
        } else {
          marksToSave.push({
            studentId: st.id,
            teacherId: currentUser?.id || 'admin',
            examType,
            subject: normalizeSubject(subject),
            marksObtained,
            maxMarks,
            practicalMarks: isPracticalActive ? pracObt : undefined,
            practicalMaxMarks: isPracticalActive ? pracMax : undefined
          });
        }
      });

      if (marksToSave.length > 0) {
        await importMarks(marksToSave);
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (err) {
      console.error('Failed to save subject marks:', err);
      alert('अंक सुरक्षित करने में त्रुटि हुई।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSubjectMarks = async () => {
    if (!window.confirm(`क्या आप वाकई इस कक्षा के सभी छात्रों के लिए "${subject}" (${examType}) के अंक हटाना / रीसेट करना चाहते हैं? इससे यह विषय रिपोर्ट कार्ड से खाली हो जाएगा।`)) {
      return;
    }
    setIsSaving(true);
    try {
      const studentIds = classStudents.map(s => s.id);
      await deleteSubjectMarks(studentIds, subject, examType);
      setMarksMap({});
      setMaxMarksMap({});
      setPracticalMarksMap({});
      setPracticalMaxMarksMap({});
      setIsSaved(false);
      alert(`"${subject}" (${examType}) के अंक सफलतापूर्वक हटा दिए गए हैं।`);
    } catch (err) {
      console.error('Failed to clear subject marks:', err);
      alert('अंक हटाने में त्रुटि हुई।');
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HELPERS & HANDLERS: STUDENT 4-IN-1 MIXED (MODE 2)
  // -------------------------------------------------------------
  const handleStudentMixedMarkChange = (
    sub: string, 
    et: ExamType, 
    field: 'obt' | 'max' | 'oralObt' | 'oralMax' | 'pracObt' | 'pracMax', 
    val: number
  ) => {
    setStudentMixedMarks(prev => ({
      ...prev,
      [`${sub}:::${et}:::${field}`]: isNaN(val) ? 0 : val
    }));
    setIsStudentMixedSaved(false);
  };

  const handleApplyColumnMaxMarksInStudentMixed = (et: ExamType, maxVal: number) => {
    setStudentMixedMaxMarks(prev => ({
      ...prev,
      [et]: maxVal
    }));

    const updated = { ...studentMixedMarks };
    subjects.forEach(sub => {
      updated[`${sub}:::${et}:::max`] = maxVal;
    });
    setStudentMixedMarks(updated);
    setIsStudentMixedSaved(false);
  };

  const handleSaveStudentMixedMarks = async () => {
    if (!selectedStudentId) return;
    setIsStudentMixedSaving(true);
    try {
      const marksToSave: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[] = [];
      const examTypesList: ExamType[] = ['Half-Yearly Test', 'Half-Yearly Exam', 'Yearly Test', 'Yearly Exam'];

      subjects.forEach(sub => {
        const subHasPrac = isPracticalSubject(sub);
        examTypesList.forEach(et => {
          const isTest = et === 'Half-Yearly Test' || et === 'Yearly Test';
          const defaultTheoryMax = isTest ? 10 : subHasPrac ? 60 : 90;

          const obt = studentMixedMarks[`${sub}:::${et}:::obt`] ?? 0;
          const max = studentMixedMarks[`${sub}:::${et}:::max`] ?? defaultTheoryMax;

          const oralObt = studentMixedMarks[`${sub}:::${et}:::oralObt`];
          const oralMax = studentMixedMarks[`${sub}:::${et}:::oralMax`];

          const pracObt = studentMixedMarks[`${sub}:::${et}:::pracObt`];
          const pracMax = studentMixedMarks[`${sub}:::${et}:::pracMax`];

          const hasOral = (oralObt !== undefined && oralObt > 0) || (oralMax !== undefined && oralMax > 0);
          const hasPrac = (pracObt !== undefined && pracObt > 0) || (pracMax !== undefined && pracMax > 0) || (!isTest && subHasPrac);

          marksToSave.push({
            studentId: selectedStudentId,
            teacherId: currentUser?.id || 'admin',
            examType: et,
            subject: normalizeSubject(sub),
            marksObtained: Number(obt),
            maxMarks: Number(max),
            oralMarks: hasOral ? Number(oralObt || 0) : undefined,
            oralMaxMarks: hasOral ? Number(oralMax || 20) : undefined,
            practicalMarks: hasPrac ? Number(pracObt || 0) : undefined,
            practicalMaxMarks: hasPrac ? Number(pracMax || 30) : undefined
          });
        });
      });

      await importMarks(marksToSave);
      setIsStudentMixedSaved(true);
      setTimeout(() => setIsStudentMixedSaved(false), 4000);
    } catch (err) {
      console.error('Failed to save student mixed marks:', err);
      alert('अंक सुरक्षित करने में त्रुटि हुई।');
    } finally {
      setIsStudentMixedSaving(false);
    }
  };

  const handleClearStudentAllMarks = async () => {
    if (!selectedStudentId) return;
    const stName = currentSelectedStudent?.name || 'इस छात्र';
    if (!window.confirm(`क्या आप वाकई ${stName} के सभी परीक्षाओं (Half-Yearly & Yearly) के अंक हटाना / रीसेट करना चाहते हैं?`)) {
      return;
    }
    setIsStudentMixedSaving(true);
    try {
      await deleteStudentAllMarks(selectedStudentId);
      const initialMap: Record<string, number> = {};
      const examTypesList: ExamType[] = ['Half-Yearly Test', 'Half-Yearly Exam', 'Yearly Test', 'Yearly Exam'];
      subjects.forEach(sub => {
        const subHasPrac = isPracticalSubject(sub);
        examTypesList.forEach(et => {
          const defaultTheoryMax = (et === 'Half-Yearly Test' || et === 'Yearly Test') ? 10 : subHasPrac ? 60 : 90;
          initialMap[`${sub}:::${et}:::obt`] = 0;
          initialMap[`${sub}:::${et}:::max`] = defaultTheoryMax;
          initialMap[`${sub}:::${et}:::oralObt`] = 0;
          initialMap[`${sub}:::${et}:::oralMax`] = 0;
          initialMap[`${sub}:::${et}:::pracObt`] = 0;
          initialMap[`${sub}:::${et}:::pracMax`] = subHasPrac ? 30 : 0;
        });
      });
      setStudentMixedMarks(initialMap);
      setIsStudentMixedSaved(false);
      alert(`${stName} के सभी अंक सफलतापूर्वक हटा दिए गए हैं।`);
    } catch (err) {
      console.error('Failed to clear student marks:', err);
      alert('अंक हटाने में त्रुटि हुई।');
    } finally {
      setIsStudentMixedSaving(false);
    }
  };

  const handleNavigateStudent = (direction: 'prev' | 'next') => {
    const currentIndex = classStudents.findIndex(s => s.id === selectedStudentId);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
      setSelectedStudentId(classStudents[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < classStudents.length - 1) {
      setSelectedStudentId(classStudents[currentIndex + 1].id);
    }
  };

  // -------------------------------------------------------------
  // HELPERS & HANDLERS: CLASS MASTER GRID (MODE 3)
  // -------------------------------------------------------------
  const handleMatrixChange = (stId: string, sub: string, field: 'obt' | 'max', val: number) => {
    setMatrixMarks(prev => {
      const cur = prev[`${stId}:::${sub}`] || { obt: 0, max: 100 };
      return {
        ...prev,
        [`${stId}:::${sub}`]: {
          ...cur,
          [field]: isNaN(val) ? 0 : val
        }
      };
    });
    setIsMatrixSaved(false);
  };

  const handleApplyMatrixBulkMaxMarks = (newMax: number) => {
    setBulkMaxMarksInput(newMax);
    const updated = { ...matrixMarks };
    classStudents.forEach(st => {
      subjects.forEach(sub => {
        const cur = updated[`${st.id}:::${sub}`] || { obt: 0, max: newMax };
        updated[`${st.id}:::${sub}`] = {
          ...cur,
          max: newMax
        };
      });
    });
    setMatrixMarks(updated);
    setIsMatrixSaved(false);
  };

  const handleSaveMatrixMarks = async () => {
    if (classStudents.length === 0) return;
    setIsMatrixSaving(true);
    try {
      const marksToSave: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[] = [];

      classStudents.forEach(st => {
        subjects.forEach(sub => {
          const cell = matrixMarks[`${st.id}:::${sub}`];
          if (cell) {
            const defaultMax = (examType === 'Half-Yearly Test' || examType === 'Yearly Test') ? 10 : isExamTypePracticalOnly ? 30 : 90;
            const isPrac = isExamTypePracticalOnly || isPracticalSubject(sub);
            marksToSave.push({
              studentId: st.id,
              teacherId: currentUser?.id || 'admin',
              examType,
              subject: normalizeSubject(sub),
              marksObtained: Number(cell.obt || 0),
              maxMarks: Number(cell.max || defaultMax),
              practicalMarks: isPrac ? Number(cell.obt || 0) : undefined,
              practicalMaxMarks: isPrac ? Number(cell.max || defaultMax) : undefined
            });
          }
        });
      });

      await importMarks(marksToSave);
      setIsMatrixSaved(true);
      setTimeout(() => setIsMatrixSaved(false), 4000);
    } catch (err) {
      console.error('Failed to save master grid marks:', err);
      alert('अंक सुरक्षित करने में त्रुटि हुई।');
    } finally {
      setIsMatrixSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HELPERS & HANDLERS: ATTENDANCE LEDGER (MODE 4)
  // -------------------------------------------------------------
  const getStudentPresentDays = (st: Student): number => {
    if (attendancePresentMap[st.id] !== undefined) return attendancePresentMap[st.id];
    return st.reportCardPresentDays !== undefined && st.reportCardPresentDays !== null ? st.reportCardPresentDays : 194;
  };

  const getStudentTotalDays = (st: Student): number => {
    if (attendanceTotalMap[st.id] !== undefined) return attendanceTotalMap[st.id];
    return st.reportCardTotalDays !== undefined && st.reportCardTotalDays !== null ? st.reportCardTotalDays : 220;
  };

  const handlePresentDaysChange = (studentId: string, value: string) => {
    const val = parseInt(value, 10);
    setAttendancePresentMap(prev => ({
      ...prev,
      [studentId]: isNaN(val) ? 0 : val
    }));
    setIsAttendanceSaved(false);
  };

  const handleTotalDaysChange = (studentId: string, value: string) => {
    const val = parseInt(value, 10);
    setAttendanceTotalMap(prev => ({
      ...prev,
      [studentId]: isNaN(val) ? 0 : val
    }));
    setIsAttendanceSaved(false);
  };

  const handleApplyBulkTotalDays = () => {
    const total = parseInt(bulkTotalDays, 10);
    if (isNaN(total) || total <= 0) {
      alert('कृपया कुल कार्य दिवस (Total Working Days) का सही नंबर दर्ज करें।');
      return;
    }
    const newTotalMap: Record<string, number> = { ...attendanceTotalMap };
    classStudents.forEach(st => {
      newTotalMap[st.id] = total;
    });
    setAttendanceTotalMap(newTotalMap);
    setIsAttendanceSaved(false);
  };

  const handleMarkFullAttendance = (st: Student) => {
    const total = getStudentTotalDays(st);
    setAttendancePresentMap(prev => ({
      ...prev,
      [st.id]: total
    }));
    setIsAttendanceSaved(false);
  };

  const handleSaveAttendance = async () => {
    if (classStudents.length === 0) return;
    setAttendanceSaving(true);
    try {
      for (const st of classStudents) {
        const presentDays = getStudentPresentDays(st);
        const totalDays = getStudentTotalDays(st);
        await updateStudent(st.id, {
          reportCardPresentDays: presentDays,
          reportCardTotalDays: totalDays
        });
      }
      setIsAttendanceSaved(true);
      setTimeout(() => setIsAttendanceSaved(false), 5000);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('उपस्थिति सुरक्षित करने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setAttendanceSaving(false);
    }
  };

  const currentSelectedStudent = classStudents.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* TOP NAVIGATION / MODE SWITCHER                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Mode 1: Single Subject Quick Marks */}
          <button
            type="button"
            onClick={() => setActiveMode('single-subject')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'single-subject'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>1. विषयवार प्रविष्टि (Subject-wise Fast Entry)</span>
          </button>

          {/* Mode 2: Student 4-in-1 Mixed Exams */}
          <button
            type="button"
            onClick={() => setActiveMode('student-mixed')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'student-mixed'
                ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-300'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. 4-इन-1 छात्र मार्कशीट (All 4 Exams Mixed)</span>
            <span className="bg-purple-300/40 text-white text-[9px] px-1 py-0.2 rounded font-black">
              New
            </span>
          </button>

          {/* Mode 3: Class Master Grid */}
          <button
            type="button"
            onClick={() => setActiveMode('class-matrix')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'class-matrix'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>3. कक्षा मास्टर ग्रिड (All Subjects Matrix)</span>
          </button>

          {/* Mode 4: Report Card Attendance */}
          <button
            type="button"
            onClick={() => setActiveMode('attendance')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'attendance'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>4. उपस्थिति लेजर (Attendance Sync)</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold px-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{classStudents.length} छात्र ({selectedClass})</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL CLASS FILTER BAR                                       */}
      {/* ------------------------------------------------------------- */}
      <Card className="p-3.5 bg-slate-50/90 border border-slate-200 flex flex-wrap gap-3 items-end">
        <div className="w-44">
          <Label className="font-bold text-slate-700 flex items-center gap-1 text-xs">
            <Users className="w-3.5 h-3.5 text-indigo-600" /> Target Class
          </Label>
          <Input 
            as="select" 
            value={selectedClass} 
            onChange={e => {
              setSelectedClass(e.target.value);
              setMarksMap({});
              setMaxMarksMap({});
              setAttendancePresentMap({});
              setAttendanceTotalMap({});
              setIsSaved(false);
              setIsAttendanceSaved(false);
            }}
          >
            {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
          </Input>
        </div>

        {/* Exam & Subject pickers for Mode 1 */}
        {activeMode === 'single-subject' && (
          <>
            <div className="w-48">
              <Label className="font-bold text-slate-700 text-xs">Exam Type / Scheme</Label>
              <Input 
                as="select" 
                value={examType} 
                onChange={e => {
                  setExamType(e.target.value as ExamType);
                  setMarksMap({});
                  setMaxMarksMap({});
                  setIsSaved(false);
                }}
              >
                {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
              </Input>
            </div>

            <div className="w-48">
              <Label className="font-bold text-slate-700 text-xs">Subject Paper</Label>
              <Input 
                as="select" 
                value={subject} 
                onChange={e => {
                  setSubject(e.target.value);
                  setMarksMap({});
                  setMaxMarksMap({});
                  setIsSaved(false);
                }}
              >
                {subjects.map(sb => <option key={sb} value={sb}>{sb}</option>)}
              </Input>
            </div>
          </>
        )}

        {/* Exam picker for Mode 3 */}
        {activeMode === 'class-matrix' && (
          <div className="w-52">
            <Label className="font-bold text-slate-700 text-xs">Exam Scheme for Matrix</Label>
            <Input 
              as="select" 
              value={examType} 
              onChange={e => {
                setExamType(e.target.value as ExamType);
                setIsMatrixSaved(false);
              }}
            >
              {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
            </Input>
          </div>
        )}

        {/* Student picker for Mode 2 */}
        {activeMode === 'student-mixed' && (
          <div className="flex-1 min-w-[220px]">
            <Label className="font-bold text-slate-700 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-purple-600" /> Select Student</span>
              {classStudents.length > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  Roll: {currentSelectedStudent?.rollNo || '-'} | SR: {currentSelectedStudent?.srNo || '-'}
                </span>
              )}
            </Label>
            <div className="flex items-center gap-1.5">
              <Input 
                as="select" 
                value={selectedStudentId} 
                onChange={e => setSelectedStudentId(e.target.value)}
                className="flex-1 font-bold text-slate-800"
              >
                {classStudents.map(st => (
                  <option key={st.id} value={st.id}>
                    Roll {st.rollNo || '-'} - {st.name} ({st.fatherName ? `S/o ${st.fatherName}` : st.grade})
                  </option>
                ))}
              </Input>
              <button
                type="button"
                onClick={() => handleNavigateStudent('prev')}
                disabled={classStudents.findIndex(s => s.id === selectedStudentId) <= 0}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Student"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => handleNavigateStudent('next')}
                disabled={classStudents.findIndex(s => s.id === selectedStudentId) >= classStudents.length - 1}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next Student"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        )}

        {/* Search student box */}
        <div className="flex-1 min-w-[160px]">
          <Label className="font-bold text-slate-700 text-xs">Search Student</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input 
              type="text" 
              placeholder="Filter by name, roll no..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODE 1: SINGLE SUBJECT QUICK MARKS ENTRY + BULK MAX MARKS SETTER          */}
      {/* ========================================================================= */}
      {activeMode === 'single-subject' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-4">
          {/* ⚡ PROMINENT BULK MAX MARKS TOOLBAR ⚡ */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-3.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3 border border-indigo-700/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-inner">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-100 flex items-center gap-1.5">
                    <span>1-Click Bulk Max Marks Updater (अधिकतम अंक एक साथ सेट करें)</span>
                  </h4>
                  {isPracticalActive && (
                    <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase flex items-center gap-1">
                      <FlaskConical className="w-3 h-3" /> Practical Active
                    </span>
                  )}
                  <span className="bg-amber-400 text-slate-950 text-[9.5px] font-black px-1.5 py-0.2 rounded uppercase">
                    Auto-Fill All
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 mt-0.5">
                  सभी छात्रों के लिए थ्योरी {isPracticalActive ? 'व प्रैक्टिकल के ' : ''}अधिकतम अंक एक बार में अपडेट करें:
                </p>
              </div>
            </div>

            {/* Quick Presets & Bulk Update Input */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Theory Max */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-800/90 p-1.5 px-2.5 rounded-lg border border-slate-700">
                <span className="text-[11px] font-bold text-slate-200">
                  {isPracticalActive ? 'Theory Max:' : 'Max Marks:'}
                </span>
                
                {/* Manual Input */}
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={bulkMaxMarksInput}
                  onChange={e => setBulkMaxMarksInput(Number(e.target.value))}
                  className="w-14 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded py-1 px-1 border border-indigo-400 focus:outline-none"
                />

                {/* Quick Chips */}
                <div className="flex items-center gap-1">
                  {PRESET_MAX_MARKS.map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyBulkMaxMarks(val)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        bulkMaxMarksInput === val
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                      title={`Click to set Max Marks to ${val} for all`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={() => handleApplyBulkMaxMarks()}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black px-2.5 py-1 rounded shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Set Theory</span>
                </button>
              </div>

              {/* Practical Max (if practical is active) */}
              {isPracticalActive && (
                <div className="flex flex-wrap items-center gap-2 bg-emerald-950/80 p-1.5 px-2.5 rounded-lg border border-emerald-700/60">
                  <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-400" /> Practical Max:
                  </span>
                  
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkPracticalMaxMarksInput}
                    onChange={e => setBulkPracticalMaxMarksInput(Number(e.target.value))}
                    className="w-12 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded py-1 px-1 border border-emerald-400 focus:outline-none"
                  />

                  <div className="flex items-center gap-1">
                    {PRESET_PRACTICAL_MAX_MARKS.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleApplyBulkPracticalMaxMarks(val)}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                          bulkPracticalMaxMarksInput === val
                            ? 'bg-emerald-400 text-slate-950 font-black shadow-xs'
                            : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                        }`}
                        title={`Click to set Practical Max Marks to ${val} for all`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyBulkPracticalMaxMarks()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-2.5 py-1 rounded shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Set Practical</span>
                  </button>
                </div>
              )}

              {/* Toggle Practical Column button for any subject */}
              <button
                type="button"
                onClick={() => setForceShowPractical(!forceShowPractical)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  forceShowPractical 
                    ? 'bg-emerald-500 text-white border-emerald-400' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                }`}
                title="Toggle practical marks entry for this subject"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>{forceShowPractical ? 'Practical Active' : '+ Practical'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitSingleSubjectMarks} className="space-y-4">
            <div className="flex flex-wrap justify-between items-center border-b pb-2 gap-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                <Award className="w-4 h-4 text-indigo-600"/> 
                <span>Subject Result Sheet ({subject}) - {selectedClass}</span>
                {isPracticalActive && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    Theory + Practical Mode
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border border-indigo-100">
                  {examType}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  Max: <strong className="text-indigo-700">{bulkMaxMarksInput}</strong>
                  {isPracticalActive && <span className="text-emerald-700 font-bold ml-1">+ {bulkPracticalMaxMarksInput} Prac</span>}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px] text-slate-600">
                <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 w-16">Roll No</th>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-4 py-2.5">SR / Admn No</th>
                    
                    {/* Theory Columns */}
                    <th className="px-3 py-2.5 text-center w-32 bg-indigo-50/50 text-indigo-900 font-bold">
                      {isPracticalActive ? 'Theory Max (लिखित)' : 'Max Marks (अधिकतम)'}
                    </th>
                    <th className="px-3 py-2.5 text-center w-36 bg-amber-50/40 text-amber-950 font-bold">
                      {isPracticalActive ? 'Theory Obt (लिखित)' : 'Marks Obtained (प्राप्तांक)'}
                    </th>

                    {/* Practical Columns (when active) */}
                    {isPracticalActive && (
                      <>
                        <th className="px-3 py-2.5 text-center w-28 bg-emerald-50/60 text-emerald-950 font-bold border-l border-emerald-100">
                          Prac Max (प्रायोगिक)
                        </th>
                        <th className="px-3 py-2.5 text-center w-32 bg-teal-50/60 text-teal-950 font-bold border-r border-emerald-100">
                          Prac Obt (प्रायोगिक)
                        </th>
                        <th className="px-3 py-2.5 text-center w-28 bg-slate-100 text-slate-800 font-bold">
                          Total Score (कुल)
                        </th>
                      </>
                    )}

                    <th className="px-4 py-2.5 text-center w-28">Result Status</th>
                    <th className="px-4 py-2.5 text-center w-28">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={isPracticalActive ? 10 : 7} className="text-center py-10 italic text-slate-400">
                        {selectedClass} में कोई छात्र नामांकित नहीं है। पहले छात्रों का पंजीकरण करें।
                      </td>
                    </tr>
                  ) : (() => {
                    const studentsHavingSubject = filteredStudents.filter(st => {
                      const hasMain = st.subjects && st.subjects.some(s => isSameSubject(s, subject));
                      const hasOpt = st.optionalSubject && isSameSubject(st.optionalSubject, subject);
                      if (subjects.length === 0) return true;
                      if (!st.subjects || st.subjects.length === 0) return true;
                      return hasMain || hasOpt;
                    });

                    if (studentsHavingSubject.length === 0) {
                      return (
                        <tr>
                          <td colSpan={isPracticalActive ? 10 : 7} className="text-center py-6 italic text-slate-400">
                            कोई छात्र खोज से मेल नहीं खाता या {subject} विषय का चयन नहीं किया है।
                          </td>
                        </tr>
                      );
                    }

                    return studentsHavingSubject.map(st => {
                      const mObt = getObtainedMarks(st.id);
                      const mMax = getMaxMarks(st.id);
                      const mPracObt = getPracticalMarks(st.id);
                      const mPracMax = getPracticalMaxMarks(st.id);

                      const totalObt = isPracticalActive ? (mObt + mPracObt) : mObt;
                      const totalMax = isPracticalActive ? (mMax + mPracMax) : mMax;
                      const pct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
                      const isFail = pct < 33;
                      const pDays = getStudentPresentDays(st);
                      const tDays = getStudentTotalDays(st);
                      const attPct = tDays > 0 ? Math.round((pDays / tDays) * 100) : 0;
                      
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 font-mono font-bold text-slate-700">{st.rollNo || '-'}</td>
                          <td className="px-4 py-2 font-black text-slate-800 text-xs">
                            {st.name}
                            {st.fatherName && <span className="block text-[9.5px] font-normal text-slate-400 font-sans">S/o {st.fatherName}</span>}
                          </td>
                          <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{st.srNo || st.admissionNo || 'N/A'}</td>
                          
                          {/* Theory Max marks */}
                          <td className="px-3 py-1.5 text-center bg-indigo-50/20">
                            <input
                              type="number"
                              min="1"
                              value={mMax}
                              onChange={e => handleMaxMarkChange(st.id, e.target.value)}
                              className="w-16 text-center font-mono font-black bg-white text-xs border border-indigo-300 rounded py-1 px-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-indigo-900 shadow-2xs"
                            />
                          </td>

                          {/* Theory Obtained marks */}
                          <td className="px-3 py-1.5 text-center bg-amber-50/20">
                            <input
                              type="number"
                              min="0"
                              max={mMax}
                              value={mObt}
                              onChange={e => handleMarkChange(st.id, e.target.value)}
                              className={`w-18 text-center font-mono font-black text-xs border rounded py-1 px-1 focus:outline-none focus:bg-white shadow-2xs ${
                                isFail 
                                  ? 'border-rose-300 bg-rose-50 text-rose-700 focus:ring-1 focus:ring-rose-400' 
                                  : 'border-emerald-300 bg-emerald-50/40 text-emerald-800 focus:ring-1 focus:ring-emerald-400'
                              }`}
                            />
                          </td>

                          {/* Practical Max & Obt */}
                          {isPracticalActive && (
                            <>
                              <td className="px-3 py-1.5 text-center bg-emerald-50/20 border-l border-emerald-100">
                                <input
                                  type="number"
                                  min="0"
                                  value={mPracMax}
                                  onChange={e => handlePracticalMaxMarkChange(st.id, e.target.value)}
                                  className="w-14 text-center font-mono font-bold bg-white text-xs border border-emerald-300 rounded py-1 px-1 focus:outline-none text-emerald-900"
                                />
                              </td>
                              <td className="px-3 py-1.5 text-center bg-teal-50/20 border-r border-emerald-100">
                                <input
                                  type="number"
                                  min="0"
                                  max={mPracMax}
                                  value={mPracObt}
                                  onChange={e => handlePracticalMarkChange(st.id, e.target.value)}
                                  className="w-14 text-center font-mono font-black bg-white text-xs border border-teal-300 rounded py-1 px-1 focus:outline-none text-teal-900"
                                />
                              </td>
                              <td className="px-3 py-2 text-center bg-slate-50 font-mono font-bold text-xs">
                                <span className="text-slate-800">{totalObt}</span>
                                <span className="text-slate-400 text-[10px]"> / {totalMax}</span>
                              </td>
                            </>
                          )}

                          {/* Result status */}
                          <td className="px-4 py-2 text-center">
                            {isFail ? (
                              <span className="text-[8.5px] uppercase font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 leading-none">
                                Fail ({Math.round(pct)}%)
                              </span>
                            ) : (
                              <span className="text-[8.5px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 leading-none">
                                Passed ({Math.round(pct)}%)
                              </span>
                            )}
                          </td>

                          {/* Attendance */}
                          <td className="px-4 py-2 text-center">
                            <span 
                              className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border ${
                                attPct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                              title={`${pDays} out of ${tDays} days attended`}
                            >
                              {pDays}/{tDays} ({attPct}%)
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {classStudents.length > 0 && (
              <div className="pt-3 flex flex-wrap justify-between items-center border-t border-slate-100 gap-3">
                <span className="text-[10.5px] text-slate-500 italic">
                  * <strong>Submit Subject Marksheet</strong> बटन दबाते ही डेटा सुरक्षित हो जाएगा और रिपोर्ट कार्ड्स पर तुरंत अपडेट हो जाएगा।
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClearSubjectMarks}
                    disabled={isSaving}
                    className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Clear Marks ({subject})</span>
                  </button>

                  {isSaved && (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 border border-emerald-200 rounded-lg shadow-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{subject} अंक सफलतापूर्वक सुरक्षित हो गए!</span>
                    </span>
                  )}
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'सुरक्षित हो रहा है...' : `Submit Marksheet (${subject})`}</span>
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: STUDENT 4-IN-1 MIXED EXAMS SHEET (ALL TESTS & EXAMS COMBINED)     */}
      {/* ========================================================================= */}
      {activeMode === 'student-mixed' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-4">
          {/* Header with Student Info & Column Max Setters */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl shadow-xs space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 rounded-xl text-white shadow-inner">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <span>समेकित 4-इन-1 छात्र मार्कशीट: {currentSelectedStudent?.name || 'Student'}</span>
                    <span className="bg-amber-400 text-slate-950 text-[9.5px] font-black px-2 py-0.5 rounded uppercase">
                      All 4 Exams in 1 Screen
                    </span>
                  </h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    इस छात्र के सभी विषयों के <strong>Half-Yearly Test, Half-Yearly Exam (Theory + Practical), Yearly Test, Yearly Exam (Theory + Practical)</strong> एक ही स्क्रीन पर एक साथ भरें और अपडेट करें।
                  </p>
                </div>
              </div>

              {/* Prev / Next & Reset buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearStudentAllMarks}
                  disabled={isStudentMixedSaving}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg border border-rose-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                  title="Clear all exam marks for this student"
                >
                  <Trash2 className="w-3.5 h-3.5" /> <span>Reset All Marks</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateStudent('prev')}
                  disabled={classStudents.findIndex(s => s.id === selectedStudentId) <= 0}
                  className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> <span>Prev Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateStudent('next')}
                  disabled={classStudents.findIndex(s => s.id === selectedStudentId) >= classStudents.length - 1}
                  className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Next Student</span> <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Column Max Marks Setter Bar for each component */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-purple-800/60">
              {/* 1. Test Max */}
              <div className="bg-purple-950/70 p-2 rounded-lg border border-purple-700/50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-indigo-200 truncate">Test Max (10):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={studentMixedMaxMarks['Half-Yearly Test']}
                    onChange={e => {
                      const v = Number(e.target.value);
                      handleApplyColumnMaxMarksInStudentMixed('Half-Yearly Test', v);
                      handleApplyColumnMaxMarksInStudentMixed('Yearly Test', v);
                    }}
                    className="w-12 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded p-1"
                  />
                  <div className="flex items-center gap-0.5">
                    {[10, 20].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          handleApplyColumnMaxMarksInStudentMixed('Half-Yearly Test', v);
                          handleApplyColumnMaxMarksInStudentMixed('Yearly Test', v);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          studentMixedMaxMarks['Half-Yearly Test'] === v ? 'bg-amber-400 text-slate-950 font-black' : 'bg-purple-800/80 text-white hover:bg-purple-700'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Written Max */}
              <div className="bg-purple-950/70 p-2 rounded-lg border border-purple-700/50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-blue-200 truncate">WRIT. Max (लिखित):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={studentMixedMaxMarks['Half-Yearly Exam']}
                    onChange={e => {
                      const v = Number(e.target.value);
                      handleApplyColumnMaxMarksInStudentMixed('Half-Yearly Exam', v);
                      handleApplyColumnMaxMarksInStudentMixed('Yearly Exam', v);
                    }}
                    className="w-12 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded p-1"
                  />
                  <div className="flex items-center gap-0.5">
                    {[60, 70, 80, 90, 100].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          handleApplyColumnMaxMarksInStudentMixed('Half-Yearly Exam', v);
                          handleApplyColumnMaxMarksInStudentMixed('Yearly Exam', v);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          studentMixedMaxMarks['Half-Yearly Exam'] === v ? 'bg-amber-400 text-slate-950 font-black' : 'bg-purple-800/80 text-white hover:bg-purple-700'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Oral Max */}
              <div className="bg-purple-950/70 p-2 rounded-lg border border-purple-700/50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-amber-200 truncate">ORAL Max (मौखिक):</span>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    {[10, 15, 20, 25].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const updated = { ...studentMixedMarks };
                          subjects.forEach(sub => {
                            updated[`${sub}:::Half-Yearly Exam:::oralMax`] = v;
                            updated[`${sub}:::Yearly Exam:::oralMax`] = v;
                          });
                          setStudentMixedMarks(updated);
                          setIsStudentMixedSaved(false);
                        }}
                        className="text-[9.5px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-xs"
                      >
                        Set {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Practical Max */}
              <div className="bg-purple-950/70 p-2 rounded-lg border border-purple-700/50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-emerald-200 truncate">PRAC. Max (प्रायोगिक):</span>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    {[20, 25, 30, 40].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const updated = { ...studentMixedMarks };
                          subjects.forEach(sub => {
                            updated[`${sub}:::Half-Yearly Exam:::pracMax`] = v;
                            updated[`${sub}:::Yearly Exam:::pracMax`] = v;
                          });
                          setStudentMixedMarks(updated);
                          setIsStudentMixedSaved(false);
                        }}
                        className="text-[9.5px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-xs"
                      >
                        Set {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-in-1 Table for the selected Student */}
          {!currentSelectedStudent ? (
            <div className="p-8 text-center text-slate-400 italic">
              कृपया ऊपर से एक छात्र का चयन करें।
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] text-slate-600">
                  <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-600 border-b border-slate-200 text-center">
                    <tr className="border-b border-slate-200">
                      <th rowSpan={2} className="px-3 py-2 text-left w-36 bg-slate-100/70 text-slate-800 font-black border-r border-slate-200">
                        विषय (Subject)
                      </th>
                      <th colSpan={4} className="px-3 py-1.5 bg-indigo-50 text-indigo-950 border-r border-indigo-200 font-extrabold text-[10px]">
                        TERM - I (HALF YEARLY / अर्द्धवार्षिक)
                      </th>
                      <th colSpan={4} className="px-3 py-1.5 bg-emerald-50 text-emerald-950 border-r border-emerald-200 font-extrabold text-[10px]">
                        TERM - II (ANNUAL / वार्षिक)
                      </th>
                      <th rowSpan={2} className="px-3 py-2 bg-slate-100 text-slate-800 w-24 font-black">
                        FINAL (कुल / %)
                      </th>
                    </tr>
                    <tr className="text-[8.5px] text-slate-700 bg-slate-50">
                      {/* HY Columns */}
                      <th className="px-1.5 py-1.5 bg-indigo-50/70 border-r border-indigo-100 text-indigo-900 font-bold w-20">
                        TEST (10)
                        <span className="block text-[7.5px] text-indigo-600 font-normal">Obt / Max</span>
                      </th>
                      <th className="px-1.5 py-1.5 bg-blue-50/70 border-r border-blue-100 text-blue-900 font-bold w-24">
                        WRIT. (लिखित)
                        <span className="block text-[7.5px] text-blue-600 font-normal">Obt / Max</span>
                      </th>
                      <th className="px-1.5 py-1.5 bg-amber-50/80 border-r border-amber-100 text-amber-950 font-bold w-20">
                        ORAL (मौखिक)
                        <span className="block text-[7.5px] text-amber-700 font-normal">Obt / Max</span>
                      </th>
                      <th className="px-1.5 py-1.5 bg-teal-50/80 border-r-2 border-slate-300 text-teal-950 font-bold w-20">
                        PRAC. (प्रायोगिक)
                        <span className="block text-[7.5px] text-teal-700 font-normal">Obt / Max</span>
                      </th>

                      {/* Annual Columns */}
                      <th className="px-1.5 py-1.5 bg-indigo-50/70 border-r border-indigo-100 text-indigo-900 font-bold w-20">
                        TEST (10)
                        <span className="block text-[7.5px] text-indigo-600 font-normal">Obt / Max</span>
                      </th>
                      <th className="px-1.5 py-1.5 bg-blue-50/70 border-r border-blue-100 text-blue-900 font-bold w-24">
                        WRIT. (लिखित)
                        <span className="block text-[7.5px] text-blue-600 font-normal">Obt / Max</span>
                      </th>
                      <th className="px-1.5 py-1.5 bg-amber-50/80 border-r border-amber-100 text-amber-950 font-bold w-20">
                        ORAL (मौखिक)
                        <span className="block text-[7.5px] text-amber-700 font-normal">Obt / Max</span>
                      </th>
                      <th className="px-1.5 py-1.5 bg-teal-50/80 border-r-2 border-slate-300 text-teal-950 font-bold w-20">
                        PRAC. (प्रायोगिक)
                        <span className="block text-[7.5px] text-teal-700 font-normal">Obt / Max</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjects.map(sub => {
                      const subHasPrac = isPracticalSubject(sub);

                      // HY Values
                      const hyTestObt = studentMixedMarks[`${sub}:::Half-Yearly Test:::obt`] ?? 0;
                      const hyTestMax = studentMixedMarks[`${sub}:::Half-Yearly Test:::max`] ?? 10;

                      const hyExamObt = studentMixedMarks[`${sub}:::Half-Yearly Exam:::obt`] ?? 0;
                      const hyExamMax = studentMixedMarks[`${sub}:::Half-Yearly Exam:::max`] ?? (subHasPrac ? 60 : 90);

                      const hyOralObt = studentMixedMarks[`${sub}:::Half-Yearly Exam:::oralObt`] ?? 0;
                      const hyOralMax = studentMixedMarks[`${sub}:::Half-Yearly Exam:::oralMax`] ?? (hyOralObt > 0 ? 20 : 0);

                      const hyPracObt = studentMixedMarks[`${sub}:::Half-Yearly Exam:::pracObt`] ?? 0;
                      const hyPracMax = studentMixedMarks[`${sub}:::Half-Yearly Exam:::pracMax`] ?? (subHasPrac ? 30 : (hyPracObt > 0 ? 30 : 0));

                      // Annual Values
                      const yTestObt = studentMixedMarks[`${sub}:::Yearly Test:::obt`] ?? 0;
                      const yTestMax = studentMixedMarks[`${sub}:::Yearly Test:::max`] ?? 10;

                      const yExamObt = studentMixedMarks[`${sub}:::Yearly Exam:::obt`] ?? 0;
                      const yExamMax = studentMixedMarks[`${sub}:::Yearly Exam:::max`] ?? (subHasPrac ? 60 : 90);

                      const yOralObt = studentMixedMarks[`${sub}:::Yearly Exam:::oralObt`] ?? 0;
                      const yOralMax = studentMixedMarks[`${sub}:::Yearly Exam:::oralMax`] ?? (yOralObt > 0 ? 20 : 0);

                      const yPracObt = studentMixedMarks[`${sub}:::Yearly Exam:::pracObt`] ?? 0;
                      const yPracMax = studentMixedMarks[`${sub}:::Yearly Exam:::pracMax`] ?? (subHasPrac ? 30 : (yPracObt > 0 ? 30 : 0));

                      // Totals
                      const totalObt = hyTestObt + hyExamObt + hyOralObt + hyPracObt + yTestObt + yExamObt + yOralObt + yPracObt;
                      const totalMax = hyTestMax + hyExamMax + hyOralMax + hyPracMax + yTestMax + yExamMax + yOralMax + yPracMax;
                      const subPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;

                      return (
                        <tr key={sub} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2 font-black text-slate-800 text-xs border-r border-slate-200">
                            {sub}
                            {subHasPrac && (
                              <span className="block text-[9px] text-teal-700 font-bold flex items-center gap-0.5">
                                <FlaskConical className="w-2.5 h-2.5" /> Practical Subject
                              </span>
                            )}
                          </td>

                          {/* 1. HY Test */}
                          <td className="px-1 py-1.5 text-center bg-indigo-50/20 border-r border-indigo-100">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={hyTestMax}
                                value={hyTestObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Test', 'obt', Number(e.target.value))}
                                className="w-11 text-center font-mono font-black text-xs border border-indigo-300 rounded py-0.5 bg-white text-indigo-900 focus:outline-none"
                                title="Half-Yearly Test Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                value={hyTestMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Test', 'max', Number(e.target.value))}
                                className="w-9 text-center font-mono text-[10px] border border-slate-200 rounded py-0.5 bg-slate-50 text-slate-600 focus:outline-none"
                                title="Half-Yearly Test Max Marks"
                              />
                            </div>
                          </td>

                          {/* 2. HY Written */}
                          <td className="px-1 py-1.5 text-center bg-blue-50/20 border-r border-blue-100">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={hyExamMax}
                                value={hyExamObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Exam', 'obt', Number(e.target.value))}
                                className="w-12 text-center font-mono font-black text-xs border border-blue-300 rounded py-0.5 bg-white text-blue-900 focus:outline-none"
                                title="Half-Yearly Written Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                value={hyExamMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Exam', 'max', Number(e.target.value))}
                                className="w-10 text-center font-mono text-[10px] border border-slate-200 rounded py-0.5 bg-slate-50 text-slate-600 focus:outline-none"
                                title="Half-Yearly Written Max Marks"
                              />
                            </div>
                          </td>

                          {/* 3. HY Oral */}
                          <td className="px-1 py-1.5 text-center bg-amber-50/25 border-r border-amber-100">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={hyOralMax > 0 ? hyOralMax : 100}
                                value={hyOralObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Exam', 'oralObt', Number(e.target.value))}
                                className="w-11 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-950 focus:outline-none"
                                title="Half-Yearly Oral Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                value={hyOralMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Exam', 'oralMax', Number(e.target.value))}
                                className="w-9 text-center font-mono text-[10px] border border-amber-200 rounded py-0.5 bg-amber-50 text-amber-900 focus:outline-none"
                                title="Half-Yearly Oral Max Marks"
                              />
                            </div>
                          </td>

                          {/* 4. HY Practical */}
                          <td className="px-1 py-1.5 text-center bg-teal-50/25 border-r-2 border-slate-300">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={hyPracMax > 0 ? hyPracMax : 100}
                                value={hyPracObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Exam', 'pracObt', Number(e.target.value))}
                                className="w-11 text-center font-mono font-bold text-xs border border-teal-300 rounded py-0.5 bg-white text-teal-950 focus:outline-none"
                                title="Half-Yearly Practical Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                value={hyPracMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Half-Yearly Exam', 'pracMax', Number(e.target.value))}
                                className="w-9 text-center font-mono text-[10px] border border-teal-200 rounded py-0.5 bg-teal-50 text-teal-900 focus:outline-none"
                                title="Half-Yearly Practical Max Marks"
                              />
                            </div>
                          </td>

                          {/* 5. Yearly Test */}
                          <td className="px-1 py-1.5 text-center bg-indigo-50/20 border-r border-indigo-100">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={yTestMax}
                                value={yTestObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Test', 'obt', Number(e.target.value))}
                                className="w-11 text-center font-mono font-black text-xs border border-indigo-300 rounded py-0.5 bg-white text-indigo-900 focus:outline-none"
                                title="Yearly Test Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                value={yTestMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Test', 'max', Number(e.target.value))}
                                className="w-9 text-center font-mono text-[10px] border border-slate-200 rounded py-0.5 bg-slate-50 text-slate-600 focus:outline-none"
                                title="Yearly Test Max Marks"
                              />
                            </div>
                          </td>

                          {/* 6. Yearly Written */}
                          <td className="px-1 py-1.5 text-center bg-blue-50/20 border-r border-blue-100">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={yExamMax}
                                value={yExamObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Exam', 'obt', Number(e.target.value))}
                                className="w-12 text-center font-mono font-black text-xs border border-blue-300 rounded py-0.5 bg-white text-blue-900 focus:outline-none"
                                title="Yearly Written Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                value={yExamMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Exam', 'max', Number(e.target.value))}
                                className="w-10 text-center font-mono text-[10px] border border-slate-200 rounded py-0.5 bg-slate-50 text-slate-600 focus:outline-none"
                                title="Yearly Written Max Marks"
                              />
                            </div>
                          </td>

                          {/* 7. Yearly Oral */}
                          <td className="px-1 py-1.5 text-center bg-amber-50/25 border-r border-amber-100">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={yOralMax > 0 ? yOralMax : 100}
                                value={yOralObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Exam', 'oralObt', Number(e.target.value))}
                                className="w-11 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-950 focus:outline-none"
                                title="Yearly Oral Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                value={yOralMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Exam', 'oralMax', Number(e.target.value))}
                                className="w-9 text-center font-mono text-[10px] border border-amber-200 rounded py-0.5 bg-amber-50 text-amber-900 focus:outline-none"
                                title="Yearly Oral Max Marks"
                              />
                            </div>
                          </td>

                          {/* 8. Yearly Practical */}
                          <td className="px-1 py-1.5 text-center bg-teal-50/25 border-r-2 border-slate-300">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={yPracMax > 0 ? yPracMax : 100}
                                value={yPracObt}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Exam', 'pracObt', Number(e.target.value))}
                                className="w-11 text-center font-mono font-bold text-xs border border-teal-300 rounded py-0.5 bg-white text-teal-950 focus:outline-none"
                                title="Yearly Practical Obtained"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                value={yPracMax}
                                onChange={e => handleStudentMixedMarkChange(sub, 'Yearly Exam', 'pracMax', Number(e.target.value))}
                                className="w-9 text-center font-mono text-[10px] border border-teal-200 rounded py-0.5 bg-teal-50 text-teal-900 focus:outline-none"
                                title="Yearly Practical Max Marks"
                              />
                            </div>
                          </td>

                          {/* Total / % */}
                          <td className="px-2 py-2 text-center bg-slate-50 font-mono font-bold text-xs">
                            <span className="text-slate-900 font-black">{totalObt}</span>
                            <span className="text-slate-500 text-[10px]"> / {totalMax}</span>
                            <span className={`block text-[9.5px] font-black ${subPct >= 33 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              ({subPct}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save Button for Student 4-in-1 */}
              <div className="flex flex-wrap justify-between items-center border-t border-slate-100 pt-3 gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>छात्र <strong>{currentSelectedStudent.name}</strong> के सभी 4 टेस्ट/एग्जाम के अंक एक साथ रिपोर्ट कार्ड में सेव हो जाएंगे।</span>
                </div>

                <div className="flex items-center gap-3">
                  {isStudentMixedSaved && (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 border border-emerald-300 rounded-lg shadow-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{currentSelectedStudent.name} के सभी 4 परीक्षाओं के अंक सफलतापूर्वक सुरक्षित हो गए!</span>
                    </span>
                  )}

                  <Button
                    type="button"
                    onClick={handleSaveStudentMixedMarks}
                    disabled={isStudentMixedSaving}
                    className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-black px-7 py-2.5 rounded-lg shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isStudentMixedSaving ? 'सुरक्षित हो रहा है...' : `Save All 4 Exams Marks (${currentSelectedStudent.name})`}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: CLASS MASTER GRID (ALL STUDENTS & ALL SUBJECTS MATRIX)             */}
      {/* ========================================================================= */}
      {activeMode === 'class-matrix' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-4">
          {/* Header with Bulk Max Marks setter for Matrix */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Grid className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Class Master Marks Matrix ({selectedClass} - {examType})
                </h4>
                <p className="text-[10.5px] text-slate-300">
                  पूरी कक्षा के सभी विषयों के अंक एक साथ एक्सेल ग्रिड की तरह भरें।
                </p>
              </div>
            </div>

            {/* Quick Bulk Max Marks */}
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-700">
              <span className="text-xs font-bold text-slate-300">Set All Subjects Max:</span>
              <div className="flex items-center gap-1">
                {PRESET_MAX_MARKS.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleApplyMatrixBulkMaxMarks(val)}
                    className="bg-slate-700 hover:bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[11px] text-slate-600">
              <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 w-14 sticky left-0 bg-slate-50 z-10">Roll</th>
                  <th className="px-3 py-2.5 min-w-[140px] sticky left-14 bg-slate-50 z-10 border-r">Student Name</th>
                  {subjects.map(sub => (
                    <th key={sub} className="px-3 py-2.5 text-center min-w-[90px] border-r">
                      <span className="block truncate">{sub}</span>
                      <span className="block text-[8px] text-slate-400 font-normal">Obt / Max</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-mono font-bold text-slate-700 sticky left-0 bg-white z-10">
                      {st.rollNo || '-'}
                    </td>
                    <td className="px-3 py-2 font-black text-slate-800 text-xs sticky left-14 bg-white z-10 border-r truncate max-w-[160px]">
                      {st.name}
                    </td>
                    {subjects.map(sub => {
                      const cell = matrixMarks[`${st.id}:::${sub}`] || { obt: 0, max: (examType === 'Half-Yearly Test' || examType === 'Yearly Test') ? 10 : 90 };
                      return (
                        <td key={sub} className="px-2 py-1.5 text-center border-r bg-slate-50/30">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={cell.max}
                              value={cell.obt}
                              onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                              className="w-11 text-center font-mono font-bold text-xs border border-slate-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-slate-400 text-[10px]">/</span>
                            <input
                              type="number"
                              min="1"
                              value={cell.max}
                              onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                              className="w-9 text-center font-mono text-[9.5px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-600 focus:outline-none"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-between items-center border-t border-slate-100 pt-3 gap-3">
            <span className="text-[10.5px] text-slate-500 italic">
              * सम्पूर्ण कक्षा के सभी विषयों के अंक एक साथ बैच मोड में सेव होंगे।
            </span>
            <div className="flex items-center gap-3">
              {isMatrixSaved && (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 border border-emerald-300 rounded-lg shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>मास्टर ग्रिड के सभी अंक सफलतापूर्वक सुरक्षित हो गए!</span>
                </span>
              )}
              <Button
                type="button"
                onClick={handleSaveMatrixMarks}
                disabled={isMatrixSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-7 py-2.5 rounded-lg shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isMatrixSaving ? 'सुरक्षित हो रहा है...' : `Save Complete Class Grid (${selectedClass})`}</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: REPORT CARD ATTENDANCE LEDGER                                      */}
      {/* ========================================================================= */}
      {activeMode === 'attendance' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-xs flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-700 rounded-lg text-white">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>Class Attendance Ledger for Report Cards ({selectedClass})</span>
                  <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Auto-Sync to Report Card
                  </span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  यहाँ उपस्थित दिन (Present Days) और कुल कार्य दिवस (Total Days) भरें। यह डेटा सीधे प्रत्येक छात्र के रिपोर्ट कार्ड पर लिंक हो जाएगा।
                </p>
              </div>
            </div>

            {/* Quick Bulk Setter for Total Days */}
            <div className="flex items-center gap-2 bg-emerald-950/80 p-2 rounded-lg border border-emerald-700">
              <span className="text-xs font-bold text-emerald-200">पूरी कक्षा के कुल दिन:</span>
              <input
                type="number"
                value={bulkTotalDays}
                onChange={e => setBulkTotalDays(e.target.value)}
                placeholder="220"
                className="w-16 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded p-1 border border-emerald-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleApplyBulkTotalDays}
                className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold px-3 py-1 rounded shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>सभी पर लागू करें</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[11px] text-slate-500">
              <thead className="bg-slate-50 uppercase text-[9.5px] font-extrabold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 w-16">Roll No</th>
                  <th className="px-4 py-2.5">Student Name</th>
                  <th className="px-4 py-2.5">SR / Admn No</th>
                  <th className="px-4 py-2.5 text-center w-36 text-emerald-800 bg-emerald-50/50">
                    उपस्थित दिन (Present Days)
                  </th>
                  <th className="px-4 py-2.5 text-center w-36 text-slate-700 bg-slate-100/60">
                    कुल कार्य दिवस (Total Days)
                  </th>
                  <th className="px-4 py-2.5 text-center w-32">उपस्थिति %</th>
                  <th className="px-4 py-2.5 text-center w-28">त्वरित विकल्प</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 italic text-slate-400">
                      {selectedClass} में कोई छात्र नामांकित नहीं है। पहले छात्र पंजीकरण करें।
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 italic text-slate-400">
                      खोज परिणाम में कोई छात्र नहीं मिला।
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(st => {
                    const present = getStudentPresentDays(st);
                    const total = getStudentTotalDays(st);
                    const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
                    const numPct = Number(pct);

                    return (
                      <tr key={st.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700">
                          {st.rollNo || '-'}
                        </td>
                        <td className="px-4 py-2.5 font-black text-slate-800 text-xs">
                          {st.name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">
                          {st.srNo || st.admissionNo || 'N/A'}
                        </td>
                        <td className="px-4 py-1.5 text-center bg-emerald-50/30">
                          <input
                            type="number"
                            min="0"
                            max={total}
                            value={present}
                            onChange={e => handlePresentDaysChange(st.id, e.target.value)}
                            className="w-20 text-center font-mono font-black text-xs border border-emerald-300 rounded py-1 px-2 focus:bg-white bg-white text-emerald-900 focus:outline-none shadow-2xs"
                          />
                        </td>
                        <td className="px-4 py-1.5 text-center bg-slate-50/40">
                          <input
                            type="number"
                            min="1"
                            value={total}
                            onChange={e => handleTotalDaysChange(st.id, e.target.value)}
                            className="w-20 text-center font-mono font-bold text-xs border border-slate-300 rounded py-1 px-2 focus:bg-white bg-white text-slate-800 focus:outline-none shadow-2xs"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span 
                            className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full border ${
                              numPct >= 75 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : numPct >= 60 
                                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleMarkFullAttendance(st)}
                            className="text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-300 px-2 py-0.5 rounded font-bold transition-all cursor-pointer"
                            title="Set 100% Present"
                          >
                            100% Full
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {classStudents.length > 0 && (
            <div className="pt-3 flex flex-wrap justify-between items-center border-t border-slate-200 gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>
                  यह उपस्थिति सुरक्षित करने के बाद तुरंत <strong>Student Report Card</strong> और <strong>Bulk Result Print</strong> पर स्वतः प्रिंट हो जाएगी।
                </span>
              </div>

              <div className="flex items-center gap-3">
                {isAttendanceSaved && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 border border-emerald-300 rounded-lg shadow-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>कक्षा {selectedClass} की उपस्थिति सफलतापूर्वक सुरक्षित हो गई और रिपोर्ट कार्ड से लिंक हो गई!</span>
                  </span>
                )}

                <Button 
                  type="button" 
                  onClick={handleSaveAttendance}
                  disabled={attendanceSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-7 py-2.5 rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{attendanceSaving ? 'सुरक्षित हो रहा है...' : 'पूरी कक्षा की उपस्थिति सुरक्षित करें (Save Attendance)'}</span>
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
