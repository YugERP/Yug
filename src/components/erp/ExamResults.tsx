import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type ExamType, type ExamMark } from '../../types';
import { 
  Award, CheckCircle, Search, Save, Calendar, CheckSquare, Sparkles, 
  Layers, Users, User, ChevronLeft, ChevronRight, Sliders, Grid, BookOpen,
  ArrowRight, RefreshCw, Check, FlaskConical, Trash2, Eye, EyeOff,
  History, RotateCcw, AlertTriangle, Filter, HardDrive, Bookmark, CheckCircle2,
  FileText, SlidersHorizontal, AlertCircle, ArrowUpDown, X, Clock, ArrowDownUp
} from 'lucide-react';
import { 
  normalizeGrade, isSameGrade, getDefaultSubjectsForGrade, ALL_STANDARD_CLASSES, 
  isSameSubject, normalizeSubject, isPracticalSubject, getDefaultPracticalMaxMarks,
  isPrePrimaryGrade, isPracticalSubjectForGrade
} from '../../utils/gradeHelper';

type EntryMode = 'single-subject' | 'student-mixed' | 'class-matrix' | 'subject-annual-ledger' | 'pre-primary-junior' | 'attendance';
export type MatrixPattern = 
  | 'test-paper-i-ii' 
  | 'paper-i-ii' 
  | 'test-written-oral' 
  | 'written-oral' 
  | 'test-written-prac' 
  | 'written-prac' 
  | 'written-only' 
  | 'all-composite';

export type StudentSortOption = 
  | 'roll-asc'        // 🔢 रोल नंबर 1 -> अंतिम (Roll No 1 to N)
  | 'roll-desc'       // 🔢 रोल नंबर उल्टा N -> 1 (Roll No Desc)
  | 'name-asc'        // 🔤 नाम वर्णमाला A -> Z (अ से ज्ञ)
  | 'name-desc'       // 🔤 नाम उल्टा Z -> A
  | 'father-asc'      // 👨‍👦 पिता का नाम A -> Z
  | 'sr-asc'          // 📜 स्कॉलर / SR No
  | 'gender-boys'     // 👦 छात्र पहले (Boys First)
  | 'gender-girls';   // 👧 छात्राएं पहले (Girls First)

export type StudentMarksFilter = 'all' | 'pending' | 'completed';
export type StudentGenderFilter = 'all' | 'Male' | 'Female';
export type StudentSectionFilter = 'all' | string;

export interface MatrixCellData {
  testObt?: number;
  testMax?: number;
  obt: number; // Paper I / Written marks obtained
  max: number; // Paper I / Written max marks
  paper2Obt?: number; // Paper II marks obtained
  paper2Max?: number; // Paper II max marks
  oralObt?: number;
  oralMax?: number;
  pracObt?: number;
  pracMax?: number;
}

export interface SubjectAnnualRowMarks {
  hyTestObt: number;
  hyTestMax: number;
  hyWrittenObt: number;
  hyWrittenMax: number;
  hyOralObt: number;
  hyOralMax: number;
  hyPracObt: number;
  hyPracMax: number;

  yTestObt: number;
  yTestMax: number;
  yWrittenObt: number;
  yWrittenMax: number;
  yOralObt: number;
  yOralMax: number;
  yPracObt: number;
  yPracMax: number;
}

const PRESET_MAX_MARKS = [10, 20, 25, 30, 50, 60, 70, 80, 90, 100];
const PRESET_PRACTICAL_MAX_MARKS = [10, 15, 20, 25, 30, 40, 50];

export function ExamResults() {
  const { students, marks, addMark, importMarks, deleteMark, deleteSubjectMarks, deleteStudentAllMarks, updateStudent, currentUser } = useStore();
  const [activeMode, setActiveMode] = useState<EntryMode>('single-subject');
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [examType, setExamType] = useState<ExamType>('Half-Yearly Test');
  const [searchQuery, setSearchQuery] = useState('');

  // Universal Student Sorting & Filtering Controls (Applies to all modes)
  const [sortBy, setSortBy] = useState<StudentSortOption>('roll-asc');
  const [marksFilter, setMarksFilter] = useState<StudentMarksFilter>('all');
  const [genderFilter, setGenderFilter] = useState<StudentGenderFilter>('all');
  const [sectionFilter, setSectionFilter] = useState<StudentSectionFilter>('all');

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

  // -------------------------------------------------------------
  // MODE 3: CLASS MASTER GRID & MULTI-COMPONENT MATRIX STATE
  // -------------------------------------------------------------
  const [matrixMarks, setMatrixMarks] = useState<Record<string, MatrixCellData>>({});
  const [matrixPattern, setMatrixPattern] = useState<MatrixPattern>('test-paper-i-ii');
  const [matrixSubjectFilter, setMatrixSubjectFilter] = useState<string>('ALL');
  const [hideCompletedSubjects, setHideCompletedSubjects] = useState<boolean>(false);
  const [bulkMatrixTestMax, setBulkMatrixTestMax] = useState<number>(10);
  const [bulkMatrixWrittenMax, setBulkMatrixWrittenMax] = useState<number>(35);
  const [bulkMatrixPaper2Max, setBulkMatrixPaper2Max] = useState<number>(35);
  const [bulkMatrixOralPracMax, setBulkMatrixOralPracMax] = useState<number>(20);
  const [isMatrixSaved, setIsMatrixSaved] = useState(false);
  const [isMatrixSaving, setIsMatrixSaving] = useState(false);
  const [isMatrixDraftSaved, setIsMatrixDraftSaved] = useState(false);

  // Auto-Save & Offline Draft Recovery State
  const [draftInfo, setDraftInfo] = useState<{ timestamp: string; count: number; pattern: MatrixPattern } | null>(null);
  const [autoSaveNotice, setAutoSaveNotice] = useState<string>('');

  // Subject completion statistics for Mode 3 (Matrix)
  const matrixSubjectStats = React.useMemo(() => {
    return subjects.map(sub => {
      let filledStudents = 0;
      classStudents.forEach(st => {
        const cell = matrixMarks[`${st.id}:::${sub}`];
        if (cell && (
          (cell.testObt !== undefined && cell.testObt > 0) ||
          (cell.obt !== undefined && cell.obt > 0) || 
          (cell.paper2Obt !== undefined && cell.paper2Obt > 0) ||
          (cell.oralObt !== undefined && cell.oralObt > 0) || 
          (cell.pracObt !== undefined && cell.pracObt > 0)
        )) {
          filledStudents++;
        }
      });
      const total = classStudents.length;
      const isComplete = total > 0 && filledStudents >= total;
      return {
        subject: sub,
        filledStudents,
        totalStudents: total,
        isComplete
      };
    });
  }, [subjects, classStudents, matrixMarks]);

  const completedSubjectsCount = matrixSubjectStats.filter(s => s.isComplete).length;

  // Visible subjects in Matrix based on hideCompletedSubjects and matrixSubjectFilter
  const visibleMatrixSubjects = React.useMemo(() => {
    let list = subjects;
    if (hideCompletedSubjects) {
      list = list.filter(sub => {
        const stat = matrixSubjectStats.find(s => isSameSubject(s.subject, sub));
        return !stat?.isComplete;
      });
    }
    if (matrixSubjectFilter !== 'ALL') {
      list = list.filter(sub => isSameSubject(sub, matrixSubjectFilter));
    }
    return list;
  }, [subjects, hideCompletedSubjects, matrixSubjectFilter, matrixSubjectStats]);

  // Keep subject in sync if list changes
  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(subject)) {
      setSubject(subjects[0]);
    }
  }, [subjects, subject]);

  // Check if current class, subject or exam has practical component
  const isPrePrimary = isPrePrimaryGrade(selectedClass);
  const isSubjectPractical = !isPrePrimary && isPracticalSubjectForGrade(subject, selectedClass);
  const isExamTypePracticalOnly = !isPrePrimary && (examType === 'Half-Yearly Practical' || examType === 'Yearly Practical' || examType === 'Practical Exam');
  const isPracticalActive = !isPrePrimary && (isExamTypePracticalOnly || isSubjectPractical || forceShowPractical);

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
      setBulkMaxMarksInput(isPrePrimary ? 70 : 90);
    }
  }, [examType, subject, isSubjectPractical, isExamTypePracticalOnly, isPrePrimary]);

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

  // Load marks & check draft for Mode 3 when class or examType changes
  useEffect(() => {
    const map: Record<string, MatrixCellData> = {};
    const isTest = examType === 'Half-Yearly Test' || examType === 'Yearly Test';
    const isHalfYearly = examType === 'Half-Yearly Exam';
    const isYearly = examType === 'Yearly Exam';

    const testEt: ExamType | null = isHalfYearly ? 'Half-Yearly Test' 
      : isYearly ? 'Yearly Test' 
      : isTest ? examType : null;

    const pracEt: ExamType | null = isHalfYearly ? 'Half-Yearly Practical' 
      : isYearly ? 'Yearly Practical' 
      : null;

    const oralEt: ExamType | null = isHalfYearly ? 'Half-Yearly Oral' 
      : isYearly ? 'Yearly Oral' 
      : null;

    classStudents.forEach(st => {
      subjects.forEach(sub => {
        const found = marks.find(m => m.studentId === st.id && m.examType === examType && isSameSubject(m.subject, sub));
        const foundTest = testEt ? marks.find(m => m.studentId === st.id && m.examType === testEt && isSameSubject(m.subject, sub)) : null;
        const foundPrac = pracEt ? marks.find(m => m.studentId === st.id && m.examType === pracEt && isSameSubject(m.subject, sub)) : null;
        const foundOral = oralEt ? marks.find(m => m.studentId === st.id && m.examType === oralEt && isSameSubject(m.subject, sub)) : null;

        const subHasPrac = isPracticalSubject(sub);
        const defaultTestMax = 10;
        const defaultPaper1Max = isTest ? 10 : isExamTypePracticalOnly ? 30 : subHasPrac ? 60 : 35;
        const defaultPaper2Max = isTest ? 0 : 35;
        const defaultOralMax = isTest ? 0 : 20;
        const defaultPracMax = subHasPrac ? 30 : 0;

        const testObt = foundTest ? foundTest.marksObtained : 0;
        const testMax = foundTest ? foundTest.maxMarks : defaultTestMax;

        const obt = found ? found.marksObtained : 0;
        const max = found ? found.maxMarks : defaultPaper1Max;

        // Paper II is stored in practicalMarks or foundPrac or oralMarks
        const p2Obt = (found?.practicalMarks !== undefined && found.practicalMarks > 0)
          ? found.practicalMarks
          : ((found?.oralMarks !== undefined && found.oralMarks > 0 && matrixPattern === 'paper-i-ii')
              ? found.oralMarks
              : (foundPrac ? foundPrac.marksObtained : 0));

        const p2Max = (found?.practicalMaxMarks !== undefined && found.practicalMaxMarks > 0)
          ? found.practicalMaxMarks
          : ((found?.oralMaxMarks !== undefined && found.oralMaxMarks > 0 && matrixPattern === 'paper-i-ii')
              ? found.oralMaxMarks
              : (foundPrac ? foundPrac.maxMarks : defaultPaper2Max));

        const oralObt = found?.oralMarks !== undefined ? found.oralMarks : (foundOral ? foundOral.marksObtained : 0);
        const oralMax = found?.oralMaxMarks !== undefined ? found.oralMaxMarks : (foundOral ? foundOral.maxMarks : defaultOralMax);

        const pracObt = found?.practicalMarks !== undefined ? found.practicalMarks : (foundPrac ? foundPrac.marksObtained : 0);
        const pracMax = found?.practicalMaxMarks !== undefined ? found.practicalMaxMarks : (foundPrac ? foundPrac.maxMarks : defaultPracMax);

        map[`${st.id}:::${sub}`] = {
          testObt,
          testMax,
          obt,
          max,
          paper2Obt: p2Obt,
          paper2Max: p2Max,
          oralObt,
          oralMax,
          pracObt,
          pracMax
        };
      });
    });

    setMatrixMarks(map);
    setIsMatrixSaved(false);

    // Check if offline draft exists in localStorage
    const draftKey = `edumanage_matrix_draft_${selectedClass}_${examType}`;
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.marks && Object.keys(parsed.marks).length > 0) {
          setDraftInfo({
            timestamp: parsed.timestamp || 'Previous Session',
            count: Object.keys(parsed.marks).length,
            pattern: parsed.pattern || 'test-paper-i-ii'
          });
        } else {
          setDraftInfo(null);
        }
      } else {
        setDraftInfo(null);
      }
    } catch {
      setDraftInfo(null);
    }
  }, [selectedClass, examType, marks, subjects, classStudents, isExamTypePracticalOnly]);

  // Debounced auto-save for Matrix
  useEffect(() => {
    if (activeMode !== 'class-matrix') return;
    if (Object.keys(matrixMarks).length === 0) return;
    
    // Check if any mark entered is > 0
    const hasAnyMarks = Object.values(matrixMarks).some((c: MatrixCellData) => (c.obt > 0 || (c.oralObt !== undefined && c.oralObt > 0) || (c.pracObt !== undefined && c.pracObt > 0)));
    if (!hasAnyMarks) return;

    const draftKey = `edumanage_matrix_draft_${selectedClass}_${examType}`;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          marks: matrixMarks,
          pattern: matrixPattern,
          class: selectedClass,
          examType,
          timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
        }));
        setAutoSaveNotice(`Auto-saved at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      } catch (err) {
        console.warn('Draft auto-save failed:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [matrixMarks, matrixPattern, selectedClass, examType, activeMode]);

  // -------------------------------------------------------------
  // MODE 4: SUBJECT ANNUAL LEDGER STATE (Test + Half-Yearly + Annual for 1 Subject)
  // -------------------------------------------------------------
  const [subjectAnnualMarks, setSubjectAnnualMarks] = useState<Record<string, SubjectAnnualRowMarks>>({});
  const [showAnnualTestCols, setShowAnnualTestCols] = useState<boolean>(true);
  const [showAnnualOralCols, setShowAnnualOralCols] = useState<boolean>(true);
  const [showAnnualPracCols, setShowAnnualPracCols] = useState<boolean>(false);
  const [syncHyAnnualMax, setSyncHyAnnualMax] = useState<boolean>(true);

  // Bulk / Preset Max Marks state for Mode 4
  const [bulkAnnualWrittenMax, setBulkAnnualWrittenMax] = useState<number>(70);
  const [bulkAnnualOralMax, setBulkAnnualOralMax] = useState<number>(20);
  const [bulkAnnualPracMax, setBulkAnnualPracMax] = useState<number>(30);
  const [bulkAnnualTestMax, setBulkAnnualTestMax] = useState<number>(10);

  const [isSubjectAnnualSaved, setIsSubjectAnnualSaved] = useState<boolean>(false);
  const [isSubjectAnnualSaving, setIsSubjectAnnualSaving] = useState<boolean>(false);
  const [isSubjectAnnualDraftSaved, setIsSubjectAnnualDraftSaved] = useState<boolean>(false);
  const [subjectAnnualDraftInfo, setSubjectAnnualDraftInfo] = useState<{ timestamp: string; count: number } | null>(null);
  const [subjectAnnualAutoSaveNotice, setSubjectAnnualAutoSaveNotice] = useState<string>('');

  // Subject completion stats for Mode 4
  const subjectAnnualStats = React.useMemo(() => {
    return subjects.map(sub => {
      let filledStudents = 0;
      classStudents.forEach(st => {
        const stMarks = marks.filter(m => m.studentId === st.id && isSameSubject(m.subject, sub));
        const hasAny = stMarks.some(m => m.marksObtained > 0 || (m.oralMarks && m.oralMarks > 0) || (m.practicalMarks && m.practicalMarks > 0));
        if (hasAny) filledStudents++;
      });
      const total = classStudents.length;
      return {
        subject: sub,
        filledStudents,
        totalStudents: total,
        isComplete: total > 0 && filledStudents >= total
      };
    });
  }, [subjects, classStudents, marks]);

  // Load existing database marks into Subject Annual Ledger when class or subject changes
  useEffect(() => {
    const map: Record<string, SubjectAnnualRowMarks> = {};
    const isPrePrim = isPrePrimaryGrade(selectedClass);
    const subHasPrac = !isPrePrim && isPracticalSubjectForGrade(subject, selectedClass);
    
    if (isPrePrim) {
      setShowAnnualPracCols(false);
      setShowAnnualTestCols(true);
      setShowAnnualOralCols(true);
      setBulkAnnualTestMax(10);
      setBulkAnnualWrittenMax(70);
      setBulkAnnualOralMax(20);
      setBulkAnnualPracMax(0);
    } else if (subHasPrac) {
      setShowAnnualPracCols(true);
    }

    const defaultWrittenMax = isPrePrim ? 70 : (subHasPrac ? 70 : 80);
    const defaultOralMax = 20;
    const defaultPracMax = subHasPrac ? 30 : 0;
    const defaultTestMax = 10;

    classStudents.forEach(st => {
      const stMarks = marks.filter(m => m.studentId === st.id && isSameSubject(m.subject, subject));
      const hyTest = stMarks.find(m => m.examType === 'Half-Yearly Test');
      const hyExam = stMarks.find(m => m.examType === 'Half-Yearly Exam');
      const hyPrac = stMarks.find(m => m.examType === 'Half-Yearly Practical');
      const yTest = stMarks.find(m => m.examType === 'Yearly Test');
      const yExam = stMarks.find(m => m.examType === 'Yearly Exam');
      const yPrac = stMarks.find(m => m.examType === 'Yearly Practical');

      map[st.id] = {
        hyTestObt: hyTest ? hyTest.marksObtained : 0,
        hyTestMax: hyTest ? hyTest.maxMarks : defaultTestMax,
        hyWrittenObt: hyExam ? hyExam.marksObtained : 0,
        hyWrittenMax: hyExam ? hyExam.maxMarks : defaultWrittenMax,
        hyOralObt: hyExam?.oralMarks !== undefined ? hyExam.oralMarks : 0,
        hyOralMax: hyExam?.oralMaxMarks !== undefined ? hyExam.oralMaxMarks : defaultOralMax,
        hyPracObt: hyExam?.practicalMarks !== undefined ? hyExam.practicalMarks : (hyPrac ? hyPrac.marksObtained : 0),
        hyPracMax: hyExam?.practicalMaxMarks !== undefined ? hyExam.practicalMaxMarks : (hyPrac ? hyPrac.maxMarks : defaultPracMax),

        yTestObt: yTest ? yTest.marksObtained : 0,
        yTestMax: yTest ? yTest.maxMarks : defaultTestMax,
        yWrittenObt: yExam ? yExam.marksObtained : 0,
        yWrittenMax: yExam ? yExam.maxMarks : defaultWrittenMax,
        yOralObt: yExam?.oralMarks !== undefined ? yExam.oralMarks : 0,
        yOralMax: yExam?.oralMaxMarks !== undefined ? yExam.oralMaxMarks : defaultOralMax,
        yPracObt: yExam?.practicalMarks !== undefined ? yExam.practicalMarks : (yPrac ? yPrac.marksObtained : 0),
        yPracMax: yExam?.practicalMaxMarks !== undefined ? yExam.practicalMaxMarks : (yPrac ? yPrac.maxMarks : defaultPracMax),
      };
    });

    setSubjectAnnualMarks(map);
    setIsSubjectAnnualSaved(false);

    // Check for offline saved draft
    const draftKey = `edumanage_subj_annual_draft_${selectedClass}_${subject}`;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data && Object.keys(parsed.data).length > 0) {
          setSubjectAnnualDraftInfo({
            timestamp: parsed.timestamp || 'अज्ञात समय',
            count: Object.keys(parsed.data).length
          });
        } else {
          setSubjectAnnualDraftInfo(null);
        }
      } else {
        setSubjectAnnualDraftInfo(null);
      }
    } catch (e) {
      setSubjectAnnualDraftInfo(null);
    }
  }, [selectedClass, subject, classStudents, marks]);

  // Debounced auto-save for Subject Annual Ledger Draft
  useEffect(() => {
    if (activeMode !== 'subject-annual-ledger') return;
    if (Object.keys(subjectAnnualMarks).length === 0) return;

    const hasAnyMarks = Object.values(subjectAnnualMarks).some((row: SubjectAnnualRowMarks) => 
      row.hyTestObt > 0 || row.hyWrittenObt > 0 || row.hyOralObt > 0 || row.hyPracObt > 0 ||
      row.yTestObt > 0 || row.yWrittenObt > 0 || row.yOralObt > 0 || row.yPracObt > 0
    );
    if (!hasAnyMarks) return;

    const draftKey = `edumanage_subj_annual_draft_${selectedClass}_${subject}`;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          class: selectedClass,
          subject,
          data: subjectAnnualMarks,
          showAnnualTestCols,
          showAnnualOralCols,
          showAnnualPracCols
        }));
        setSubjectAnnualAutoSaveNotice(`Auto-saved at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      } catch (err) {
        console.warn('Subject annual auto-save draft failed:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [subjectAnnualMarks, activeMode, selectedClass, subject, showAnnualTestCols, showAnnualOralCols, showAnnualPracCols]);

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

  // Dynamically extract unique sections available in selected class
  const availableSections = React.useMemo(() => {
    const secSet = new Set<string>();
    classStudents.forEach(st => {
      if (st.section && st.section.trim()) {
        secSet.add(st.section.trim());
      }
    });
    return Array.from(secSet).sort();
  }, [classStudents]);

  // Helper to determine if a student has marks entered in current context
  const checkStudentMarksFilled = React.useCallback((studentId: string): boolean => {
    if (activeMode === 'single-subject') {
      const localVal = marksMap[studentId];
      const localPrac = practicalMarksMap[studentId];
      const dbMark = marks.find(m => m.studentId === studentId && m.examType === examType && isSameSubject(m.subject, subject));
      const hasDb = dbMark && (dbMark.marksObtained > 0 || (dbMark.practicalMarks && dbMark.practicalMarks > 0) || (dbMark.oralMarks && dbMark.oralMarks > 0));
      return (localVal !== undefined && localVal > 0) || (localPrac !== undefined && localPrac > 0) || !!hasDb;
    }
    if (activeMode === 'student-mixed') {
      const hasDb = marks.some(m => m.studentId === studentId && (m.marksObtained > 0 || (m.oralMarks && m.oralMarks > 0) || (m.practicalMarks && m.practicalMarks > 0)));
      if (hasDb) return true;
      if (studentId === selectedStudentId) {
        return Object.values(studentMixedMarks).some((val: number) => Number(val) > 0);
      }
      return false;
    }
    if (activeMode === 'class-matrix') {
      return subjects.some(sub => {
        const cell = matrixMarks[`${studentId}:::${sub}`];
        if (cell && (cell.obt > 0 || (cell.oralObt && cell.oralObt > 0) || (cell.pracObt && cell.pracObt > 0))) return true;
        const dbM = marks.find(m => m.studentId === studentId && m.examType === examType && isSameSubject(m.subject, sub));
        return dbM && (dbM.marksObtained > 0 || (dbM.oralMarks && dbM.oralMarks > 0) || (dbM.practicalMarks && dbM.practicalMarks > 0));
      });
    }
    if (activeMode === 'subject-annual-ledger' || activeMode === 'pre-primary-junior') {
      const row = subjectAnnualMarks[studentId];
      const hasLocal = row && (row.hyWrittenObt > 0 || row.hyOralObt > 0 || row.hyPracObt > 0 || row.hyTestObt > 0 || row.yWrittenObt > 0 || row.yOralObt > 0 || row.yPracObt > 0 || row.yTestObt > 0);
      const dbMarks = marks.filter(m => m.studentId === studentId && isSameSubject(m.subject, subject));
      const hasDb = dbMarks.some(m => m.marksObtained > 0 || (m.oralMarks && m.oralMarks > 0) || (m.practicalMarks && m.practicalMarks > 0));
      return !!hasLocal || !!hasDb;
    }
    if (activeMode === 'attendance') {
      const pres = attendancePresentMap[studentId];
      return pres !== undefined && pres > 0;
    }
    return false;
  }, [activeMode, marksMap, practicalMarksMap, marks, examType, subject, selectedStudentId, studentMixedMarks, subjects, matrixMarks, subjectAnnualMarks, attendancePresentMap]);

  // Overall student marks progress statistics for the active class & mode
  const studentProgressStats = React.useMemo(() => {
    let filled = 0;
    classStudents.forEach(st => {
      if (checkStudentMarksFilled(st.id)) {
        filled++;
      }
    });
    return {
      total: classStudents.length,
      filled,
      pending: classStudents.length - filled,
      pct: classStudents.length > 0 ? Math.round((filled / classStudents.length) * 100) : 0
    };
  }, [classStudents, checkStudentMarksFilled]);

  // Universal Filtered & Sorted Student List for All Modes
  const filteredStudents = React.useMemo(() => {
    let list = [...classStudents];

    // 1. Gender Filter
    if (genderFilter !== 'all') {
      list = list.filter(s => s.gender === genderFilter);
    }

    // 2. Section Filter
    if (sectionFilter !== 'all') {
      list = list.filter(s => (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase());
    }

    // 3. Marks Status Filter (Pending / Completed)
    if (marksFilter !== 'all') {
      list = list.filter(st => {
        const isFilled = checkStudentMarksFilled(st.id);
        return marksFilter === 'completed' ? isFilled : !isFilled;
      });
    }

    // 4. Text Search Query (Name, Roll, Father Name, SR, Admission No, Mobile)
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(s => 
        (s.name || '').toLowerCase().includes(q) ||
        (s.fatherName || '').toLowerCase().includes(q) ||
        (s.rollNo && String(s.rollNo).toLowerCase().includes(q)) ||
        (s.srNo && s.srNo.toLowerCase().includes(q)) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
        (s.mobile && s.mobile.includes(q))
      );
    }

    // 5. Sorting Criteria
    list.sort((a, b) => {
      if (sortBy === 'roll-asc') {
        const rA = Number(a.rollNo);
        const rB = Number(b.rollNo);
        if (!isNaN(rA) && !isNaN(rB) && rA !== rB) return rA - rB;
        if (!isNaN(rA) && isNaN(rB)) return -1;
        if (isNaN(rA) && !isNaN(rB)) return 1;
        return (a.name || '').localeCompare(b.name || '', 'hi-IN');
      }
      if (sortBy === 'roll-desc') {
        const rA = Number(a.rollNo);
        const rB = Number(b.rollNo);
        if (!isNaN(rA) && !isNaN(rB) && rA !== rB) return rB - rA;
        if (!isNaN(rA) && isNaN(rB)) return 1;
        if (isNaN(rA) && !isNaN(rB)) return -1;
        return (b.name || '').localeCompare(a.name || '', 'hi-IN');
      }
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '', 'hi-IN');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '', 'hi-IN');
      }
      if (sortBy === 'father-asc') {
        return (a.fatherName || '').localeCompare(b.fatherName || '', 'hi-IN');
      }
      if (sortBy === 'sr-asc') {
        const sA = Number(a.srNo || a.admissionNo);
        const sB = Number(b.srNo || b.admissionNo);
        if (!isNaN(sA) && !isNaN(sB) && sA !== sB) return sA - sB;
        return (a.srNo || a.admissionNo || '').localeCompare(b.srNo || b.admissionNo || '');
      }
      if (sortBy === 'gender-boys') {
        if (a.gender === 'Male' && b.gender !== 'Male') return -1;
        if (a.gender !== 'Male' && b.gender === 'Male') return 1;
        const rA = Number(a.rollNo);
        const rB = Number(b.rollNo);
        if (!isNaN(rA) && !isNaN(rB) && rA !== rB) return rA - rB;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'gender-girls') {
        if (a.gender === 'Female' && b.gender !== 'Female') return -1;
        if (a.gender !== 'Female' && b.gender === 'Female') return 1;
        const rA = Number(a.rollNo);
        const rB = Number(b.rollNo);
        if (!isNaN(rA) && !isNaN(rB) && rA !== rB) return rA - rB;
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return list;
  }, [classStudents, genderFilter, sectionFilter, marksFilter, searchQuery, sortBy, checkStudentMarksFilled]);

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
    const listToUse = filteredStudents.length > 0 ? filteredStudents : classStudents;
    const currentIndex = listToUse.findIndex(s => s.id === selectedStudentId);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
      setSelectedStudentId(listToUse[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < listToUse.length - 1) {
      setSelectedStudentId(listToUse[currentIndex + 1].id);
    }
  };

  // -------------------------------------------------------------
  // HELPERS & HANDLERS: CLASS MASTER GRID & MULTI-COMPONENT MATRIX (MODE 3)
  // -------------------------------------------------------------
  const handleMatrixChange = (
    stId: string, 
    sub: string, 
    field: 'testObt' | 'testMax' | 'obt' | 'max' | 'paper2Obt' | 'paper2Max' | 'oralObt' | 'oralMax' | 'pracObt' | 'pracMax', 
    val: number
  ) => {
    setMatrixMarks(prev => {
      const cur = prev[`${stId}:::${sub}`] || { 
        testObt: 0,
        testMax: 10,
        obt: 0, 
        max: 35, 
        paper2Obt: 0,
        paper2Max: 35,
        oralObt: 0, 
        oralMax: 20, 
        pracObt: 0, 
        pracMax: 0 
      };
      return {
        ...prev,
        [`${stId}:::${sub}`]: {
          ...cur,
          [field]: isNaN(val) ? 0 : Math.max(0, val)
        }
      };
    });
    setIsMatrixSaved(false);
    setIsMatrixDraftSaved(false);
  };

  // Bulk Apply Max Marks for Test / Paper 1 / Paper 2 / Oral / Practical in 1 single click
  const handleApplyMatrixBulkMaxMarks = (
    field: 'testMax' | 'max' | 'paper2Max' | 'oralMax' | 'pracMax', 
    newMax: number, 
    targetSub?: string
  ) => {
    if (field === 'testMax') setBulkMatrixTestMax(newMax);
    if (field === 'max') setBulkMatrixWrittenMax(newMax);
    if (field === 'paper2Max') setBulkMatrixPaper2Max(newMax);
    if (field === 'oralMax' || field === 'pracMax') setBulkMatrixOralPracMax(newMax);

    const updated = { ...matrixMarks };
    classStudents.forEach(st => {
      const subsToApply = targetSub && targetSub !== 'ALL' ? [targetSub] : subjects;
      subsToApply.forEach(sub => {
        const cur = updated[`${st.id}:::${sub}`] || { 
          testObt: 0,
          testMax: 10,
          obt: 0, 
          max: 35, 
          paper2Obt: 0,
          paper2Max: 35,
          oralObt: 0, 
          oralMax: 20, 
          pracObt: 0, 
          pracMax: 0 
        };
        updated[`${st.id}:::${sub}`] = {
          ...cur,
          [field]: newMax
        };
      });
    });
    setMatrixMarks(updated);
    setIsMatrixSaved(false);
    setIsMatrixDraftSaved(false);
  };

  // 1-Click Preset Handler for Mode 3 Matrix
  const handleApplyMatrixPreset = (preset: 'test-paper-i-ii-80' | 'test-paper-i-ii-100' | 'paper-i-ii-100' | 'test-written-oral-100' | 'test-theory-prac-100' | 'written-oral-100') => {
    let newPattern: MatrixPattern = 'test-paper-i-ii';
    let tMax = 10;
    let wMax = 35;
    let p2Max = 35;
    let oMax = 20;
    let prMax = 0;

    if (preset === 'test-paper-i-ii-80') {
      newPattern = 'test-paper-i-ii';
      tMax = 10;
      wMax = 35;
      p2Max = 35;
    } else if (preset === 'test-paper-i-ii-100') {
      newPattern = 'test-paper-i-ii';
      tMax = 10;
      wMax = 45;
      p2Max = 45;
    } else if (preset === 'paper-i-ii-100') {
      newPattern = 'paper-i-ii';
      tMax = 0;
      wMax = 50;
      p2Max = 50;
    } else if (preset === 'test-written-oral-100') {
      newPattern = 'test-written-oral';
      tMax = 10;
      wMax = 70;
      oMax = 20;
    } else if (preset === 'test-theory-prac-100') {
      newPattern = 'test-written-prac';
      tMax = 10;
      wMax = 60;
      prMax = 30;
    } else if (preset === 'written-oral-100') {
      newPattern = 'written-oral';
      tMax = 0;
      wMax = 80;
      oMax = 20;
    }

    setMatrixPattern(newPattern);
    setBulkMatrixTestMax(tMax);
    setBulkMatrixWrittenMax(wMax);
    setBulkMatrixPaper2Max(p2Max);
    setBulkMatrixOralPracMax(oMax > 0 ? oMax : prMax);

    const updated = { ...matrixMarks };
    classStudents.forEach(st => {
      subjects.forEach(sub => {
        const cur = updated[`${st.id}:::${sub}`] || {
          testObt: 0,
          testMax: tMax,
          obt: 0,
          max: wMax,
          paper2Obt: 0,
          paper2Max: p2Max,
          oralObt: 0,
          oralMax: oMax,
          pracObt: 0,
          pracMax: prMax
        };
        updated[`${st.id}:::${sub}`] = {
          ...cur,
          testMax: tMax,
          max: wMax,
          paper2Max: p2Max,
          oralMax: oMax,
          pracMax: prMax
        };
      });
    });
    setMatrixMarks(updated);
    setIsMatrixSaved(false);
    setIsMatrixDraftSaved(false);
  };

  // Explicit Save Draft Button (Local Storage Persistence)
  const handleSaveMatrixDraft = () => {
    const draftKey = `edumanage_matrix_draft_${selectedClass}_${examType}`;
    const timeStr = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        marks: matrixMarks,
        pattern: matrixPattern,
        class: selectedClass,
        examType,
        timestamp: timeStr
      }));
      setIsMatrixDraftSaved(true);
      setAutoSaveNotice(`Draft Saved at ${new Date().toLocaleTimeString('en-IN')}`);
      alert(`कक्षा ${selectedClass} (${examType}) का ड्राफ्ट सफलतापूर्वक सुरक्षित कर दिया गया है!\n\nयदि कंप्यूटर/ब्राउज़र बंद भी हो जाए, तो भी यह डेटा यहाँ सुरक्षित रहेगा।`);
      setTimeout(() => setIsMatrixDraftSaved(false), 4000);
    } catch (err) {
      console.error('Failed to save matrix draft:', err);
      alert('ड्राफ्ट सेव करने में त्रुटि हुई।');
    }
  };

  // Restore Draft from Local Storage
  const handleRestoreMatrixDraft = () => {
    const draftKey = `edumanage_matrix_draft_${selectedClass}_${examType}`;
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && parsed.marks) {
        setMatrixMarks(parsed.marks);
        if (parsed.pattern) setMatrixPattern(parsed.pattern);
        setDraftInfo(null);
        setIsMatrixSaved(false);
        setAutoSaveNotice(`Restored from draft (${parsed.timestamp || 'Draft'})`);
        alert('ड्राफ्ट से अंक सफलतापूर्वक लोड कर लिए गए हैं!');
      }
    } catch (err) {
      console.error('Failed to restore draft:', err);
      alert('ड्राफ्ट लोड करने में त्रुटि हुई।');
    }
  };

  // Discard Draft
  const handleDiscardMatrixDraft = () => {
    if (!window.confirm('क्या आप वाकई इस सहेजे गए ड्राफ्ट को हटाना चाहते हैं?')) return;
    const draftKey = `edumanage_matrix_draft_${selectedClass}_${examType}`;
    localStorage.removeItem(draftKey);
    setDraftInfo(null);
  };

  // Clear Matrix Marks for current view
  const handleClearMatrixMarks = async () => {
    const targetLabel = matrixSubjectFilter !== 'ALL' ? `"${matrixSubjectFilter}"` : `सम्पूर्ण कक्षा ${selectedClass}`;
    if (!window.confirm(`क्या आप वाकई ${targetLabel} (${examType}) के ग्रिड के सभी अंक खाली / रीसेट करना चाहते हैं?`)) {
      return;
    }
    const updated = { ...matrixMarks };
    classStudents.forEach(st => {
      const subsToReset = matrixSubjectFilter !== 'ALL' ? [matrixSubjectFilter] : subjects;
      subsToReset.forEach(sub => {
        const cur = updated[`${st.id}:::${sub}`];
        if (cur) {
          updated[`${st.id}:::${sub}`] = {
            ...cur,
            testObt: 0,
            obt: 0,
            paper2Obt: 0,
            oralObt: 0,
            pracObt: 0
          };
        }
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
      const isTest = examType === 'Half-Yearly Test' || examType === 'Yearly Test';
      const isHalfYearly = examType === 'Half-Yearly Exam';
      const isYearly = examType === 'Yearly Exam';

      classStudents.forEach(st => {
        subjects.forEach(sub => {
          const cell = matrixMarks[`${st.id}:::${sub}`];
          if (cell) {
            const subHasPrac = isPracticalSubject(sub);
            const defaultTheoryMax = isTest ? 10 : isExamTypePracticalOnly ? 30 : subHasPrac ? 60 : 35;
            const obtVal = Number(cell.obt || 0);
            const maxVal = Number(cell.max || defaultTheoryMax);

            const testObt = cell.testObt !== undefined ? Number(cell.testObt) : 0;
            const testMax = cell.testMax !== undefined ? Number(cell.testMax) : 10;

            const p2Obt = cell.paper2Obt !== undefined ? Number(cell.paper2Obt) : (cell.oralObt !== undefined && cell.oralObt > 0 ? Number(cell.oralObt) : (cell.pracObt || 0));
            const p2Max = cell.paper2Max !== undefined ? Number(cell.paper2Max) : (cell.oralMax !== undefined && cell.oralMax > 0 ? Number(cell.oralMax) : (cell.pracMax || 35));

            const oralObt = cell.oralObt !== undefined ? Number(cell.oralObt) : undefined;
            const oralMax = cell.oralMax !== undefined ? Number(cell.oralMax) : undefined;

            const pracObt = cell.pracObt !== undefined ? Number(cell.pracObt) : undefined;
            const pracMax = cell.pracMax !== undefined ? Number(cell.pracMax) : undefined;

            // 1. Save Test Mark if Test column is part of the pattern or has test marks
            if ((isHalfYearly || isYearly) && (matrixPattern === 'test-paper-i-ii' || matrixPattern === 'test-written-oral' || matrixPattern === 'test-written-prac' || matrixPattern === 'all-composite' || testObt > 0 || (testMax > 0 && testMax !== 10))) {
              const testExamType: ExamType = isHalfYearly ? 'Half-Yearly Test' : 'Yearly Test';
              marksToSave.push({
                studentId: st.id,
                teacherId: currentUser?.id || 'admin',
                examType: testExamType,
                subject: normalizeSubject(sub),
                marksObtained: testObt,
                maxMarks: testMax
              });
            }

            // 2. Save Main Exam Mark (Paper I, Paper II / Oral / Practical)
            if (matrixPattern === 'test-paper-i-ii' || matrixPattern === 'paper-i-ii') {
              marksToSave.push({
                studentId: st.id,
                teacherId: currentUser?.id || 'admin',
                examType,
                subject: normalizeSubject(sub),
                marksObtained: obtVal, // Paper I
                maxMarks: maxVal,
                paper2Marks: p2Obt, // Paper II
                paper2MaxMarks: p2Max,
                practicalMarks: p2Obt, // Paper II (compatible)
                practicalMaxMarks: p2Max
              });
            } else if (matrixPattern === 'test-written-oral' || matrixPattern === 'written-oral') {
              marksToSave.push({
                studentId: st.id,
                teacherId: currentUser?.id || 'admin',
                examType,
                subject: normalizeSubject(sub),
                marksObtained: obtVal,
                maxMarks: maxVal,
                oralMarks: oralObt,
                oralMaxMarks: oralMax
              });
            } else if (matrixPattern === 'test-written-prac' || matrixPattern === 'written-prac') {
              marksToSave.push({
                studentId: st.id,
                teacherId: currentUser?.id || 'admin',
                examType,
                subject: normalizeSubject(sub),
                marksObtained: obtVal,
                maxMarks: maxVal,
                practicalMarks: pracObt !== undefined ? pracObt : p2Obt,
                practicalMaxMarks: pracMax !== undefined ? pracMax : p2Max
              });
            } else if (matrixPattern === 'all-composite') {
              marksToSave.push({
                studentId: st.id,
                teacherId: currentUser?.id || 'admin',
                examType,
                subject: normalizeSubject(sub),
                marksObtained: obtVal,
                maxMarks: maxVal,
                paper2Marks: p2Obt,
                paper2MaxMarks: p2Max,
                oralMarks: oralObt,
                oralMaxMarks: oralMax,
                practicalMarks: pracObt !== undefined ? pracObt : p2Obt,
                practicalMaxMarks: pracMax !== undefined ? pracMax : p2Max
              });
            } else {
              // written-only
              marksToSave.push({
                studentId: st.id,
                teacherId: currentUser?.id || 'admin',
                examType,
                subject: normalizeSubject(sub),
                marksObtained: obtVal,
                maxMarks: maxVal
              });
            }
          }
        });
      });

      await importMarks(marksToSave);

      // Clean up draft after successful DB save
      const draftKey = `edumanage_matrix_draft_${selectedClass}_${examType}`;
      localStorage.removeItem(draftKey);
      setDraftInfo(null);

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
  // HELPERS & HANDLERS: SUBJECT ANNUAL LEDGER (MODE 4)
  // -------------------------------------------------------------
  const getGradeFromPercentage = (pct: number): { label: string; bg: string; text: string } => {
    if (pct >= 90) return { label: 'A+', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' };
    if (pct >= 80) return { label: 'A', bg: 'bg-teal-100 border-teal-300', text: 'text-teal-800' };
    if (pct >= 70) return { label: 'B+', bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800' };
    if (pct >= 60) return { label: 'B', bg: 'bg-cyan-100 border-cyan-300', text: 'text-cyan-800' };
    if (pct >= 50) return { label: 'C', bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800' };
    if (pct >= 33) return { label: 'D', bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800' };
    return { label: 'E (Fail)', bg: 'bg-rose-100 border-rose-300', text: 'text-rose-800' };
  };

  const handleSubjectAnnualCellChange = (studentId: string, field: keyof SubjectAnnualRowMarks, value: number) => {
    const safeVal = isNaN(value) ? 0 : Math.max(0, value);
    setSubjectAnnualMarks(prev => {
      const current = prev[studentId] || {
        hyTestObt: 0, hyTestMax: 10,
        hyWrittenObt: 0, hyWrittenMax: 70,
        hyOralObt: 0, hyOralMax: 20,
        hyPracObt: 0, hyPracMax: 0,
        yTestObt: 0, yTestMax: 10,
        yWrittenObt: 0, yWrittenMax: 70,
        yOralObt: 0, yOralMax: 20,
        yPracObt: 0, yPracMax: 0,
      };

      const updated = { ...current, [field]: safeVal };

      // Auto-sync max if syncHyAnnualMax is checked and user edited a max field
      if (syncHyAnnualMax) {
        if (field === 'hyWrittenMax') updated.yWrittenMax = safeVal;
        if (field === 'yWrittenMax') updated.hyWrittenMax = safeVal;
        if (field === 'hyOralMax') updated.yOralMax = safeVal;
        if (field === 'yOralMax') updated.hyOralMax = safeVal;
        if (field === 'hyPracMax') updated.yPracMax = safeVal;
        if (field === 'yPracMax') updated.hyPracMax = safeVal;
        if (field === 'hyTestMax') updated.yTestMax = safeVal;
        if (field === 'yTestMax') updated.hyTestMax = safeVal;
      }

      return {
        ...prev,
        [studentId]: updated
      };
    });
    setIsSubjectAnnualSaved(false);
  };

  const handleApplySubjectAnnualBulkMax = (
    component: 'written' | 'oral' | 'prac' | 'test',
    val: number
  ) => {
    if (isNaN(val) || val <= 0) return;

    setSubjectAnnualMarks(prev => {
      const next = { ...prev };
      classStudents.forEach(st => {
        const current = next[st.id] || {
          hyTestObt: 0, hyTestMax: 10,
          hyWrittenObt: 0, hyWrittenMax: 70,
          hyOralObt: 0, hyOralMax: 20,
          hyPracObt: 0, hyPracMax: 0,
          yTestObt: 0, yTestMax: 10,
          yWrittenObt: 0, yWrittenMax: 70,
          yOralObt: 0, yOralMax: 20,
          yPracObt: 0, yPracMax: 0,
        };

        if (component === 'written') {
          next[st.id] = {
            ...current,
            hyWrittenMax: val,
            yWrittenMax: syncHyAnnualMax ? val : current.yWrittenMax
          };
        } else if (component === 'oral') {
          next[st.id] = {
            ...current,
            hyOralMax: val,
            yOralMax: syncHyAnnualMax ? val : current.yOralMax
          };
        } else if (component === 'prac') {
          next[st.id] = {
            ...current,
            hyPracMax: val,
            yPracMax: syncHyAnnualMax ? val : current.yPracMax
          };
        } else if (component === 'test') {
          next[st.id] = {
            ...current,
            hyTestMax: val,
            yTestMax: syncHyAnnualMax ? val : current.yTestMax
          };
        }
      });
      return next;
    });

    if (component === 'written') setBulkAnnualWrittenMax(val);
    if (component === 'oral') setBulkAnnualOralMax(val);
    if (component === 'prac') setBulkAnnualPracMax(val);
    if (component === 'test') setBulkAnnualTestMax(val);
    setIsSubjectAnnualSaved(false);
  };

  const handleApplyStandardBalancedPreset = (type: 'standard' | 'practical' | 'written-oral-only') => {
    setSubjectAnnualMarks(prev => {
      const next = { ...prev };
      classStudents.forEach(st => {
        const current = next[st.id] || {
          hyTestObt: 0, hyTestMax: 10,
          hyWrittenObt: 0, hyWrittenMax: 70,
          hyOralObt: 0, hyOralMax: 20,
          hyPracObt: 0, hyPracMax: 0,
          yTestObt: 0, yTestMax: 10,
          yWrittenObt: 0, yWrittenMax: 70,
          yOralObt: 0, yOralMax: 20,
          yPracObt: 0, yPracMax: 0,
        };

        if (type === 'standard') {
          next[st.id] = {
            ...current,
            hyTestMax: 10, yTestMax: 10,
            hyWrittenMax: 70, yWrittenMax: 70,
            hyOralMax: 20, yOralMax: 20,
            hyPracMax: 0, yPracMax: 0
          };
        } else if (type === 'practical') {
          next[st.id] = {
            ...current,
            hyTestMax: 10, yTestMax: 10,
            hyWrittenMax: 60, yWrittenMax: 60,
            hyOralMax: 0, yOralMax: 0,
            hyPracMax: 30, yPracMax: 30
          };
        } else if (type === 'written-oral-only') {
          next[st.id] = {
            ...current,
            hyTestMax: 0, yTestMax: 0,
            hyWrittenMax: 80, yWrittenMax: 80,
            hyOralMax: 20, yOralMax: 20,
            hyPracMax: 0, yPracMax: 0
          };
        }
      });
      return next;
    });

    if (type === 'standard') {
      setShowAnnualTestCols(true);
      setShowAnnualOralCols(true);
      setShowAnnualPracCols(false);
      setBulkAnnualTestMax(10);
      setBulkAnnualWrittenMax(70);
      setBulkAnnualOralMax(20);
      setBulkAnnualPracMax(0);
    } else if (type === 'practical') {
      setShowAnnualTestCols(true);
      setShowAnnualOralCols(false);
      setShowAnnualPracCols(true);
      setBulkAnnualTestMax(10);
      setBulkAnnualWrittenMax(60);
      setBulkAnnualOralMax(0);
      setBulkAnnualPracMax(30);
    } else if (type === 'written-oral-only') {
      setShowAnnualTestCols(false);
      setShowAnnualOralCols(true);
      setShowAnnualPracCols(false);
      setBulkAnnualWrittenMax(80);
      setBulkAnnualOralMax(20);
      setBulkAnnualPracMax(0);
    }
    setIsSubjectAnnualSaved(false);
  };

  const handleSaveSubjectAnnualDraft = () => {
    const draftKey = `edumanage_subj_annual_draft_${selectedClass}_${subject}`;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        class: selectedClass,
        subject,
        data: subjectAnnualMarks,
        showAnnualTestCols,
        showAnnualOralCols,
        showAnnualPracCols
      }));
      setIsSubjectAnnualDraftSaved(true);
      setTimeout(() => setIsSubjectAnnualDraftSaved(false), 3000);
      setSubjectAnnualDraftInfo({
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        count: Object.keys(subjectAnnualMarks).length
      });
    } catch (e) {
      alert('ड्राफ्ट सुरक्षित करने में विफल रहा।');
    }
  };

  const handleRestoreSubjectAnnualDraft = () => {
    const draftKey = `edumanage_subj_annual_draft_${selectedClass}_${subject}`;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.data) {
          setSubjectAnnualMarks(parsed.data);
          if (parsed.showAnnualTestCols !== undefined) setShowAnnualTestCols(parsed.showAnnualTestCols);
          if (parsed.showAnnualOralCols !== undefined) setShowAnnualOralCols(parsed.showAnnualOralCols);
          if (parsed.showAnnualPracCols !== undefined) setShowAnnualPracCols(parsed.showAnnualPracCols);
          setSubjectAnnualDraftInfo(null);
          setIsSubjectAnnualSaved(false);
        }
      }
    } catch (e) {
      alert('ड्राफ्ट लोड करने में त्रुटि हुई।');
    }
  };

  const handleDiscardSubjectAnnualDraft = () => {
    const draftKey = `edumanage_subj_annual_draft_${selectedClass}_${subject}`;
    localStorage.removeItem(draftKey);
    setSubjectAnnualDraftInfo(null);
  };

  const handleClearSubjectAnnualMarks = () => {
    if (!window.confirm(`क्या आप ${selectedClass} के लिए ${subject} के सभी अंक रीसेट करना चाहते हैं?`)) {
      return;
    }
    const emptyMap: Record<string, SubjectAnnualRowMarks> = {};
    classStudents.forEach(st => {
      emptyMap[st.id] = {
        hyTestObt: 0, hyTestMax: 10,
        hyWrittenObt: 0, hyWrittenMax: 70,
        hyOralObt: 0, hyOralMax: 20,
        hyPracObt: 0, hyPracMax: 0,
        yTestObt: 0, yTestMax: 10,
        yWrittenObt: 0, yWrittenMax: 70,
        yOralObt: 0, yOralMax: 20,
        yPracObt: 0, yPracMax: 0
      };
    });
    setSubjectAnnualMarks(emptyMap);
    handleDiscardSubjectAnnualDraft();
    setIsSubjectAnnualSaved(false);
  };

  const handleSaveSubjectAnnualMarks = async () => {
    if (classStudents.length === 0) return;
    setIsSubjectAnnualSaving(true);
    try {
      const marksToSave: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[] = [];
      const normalizedSub = normalizeSubject(subject);

      classStudents.forEach(st => {
        const row = subjectAnnualMarks[st.id];
        if (!row) return;

        // 1. Half-Yearly Test (if test cols enabled or value > 0)
        if (showAnnualTestCols || row.hyTestObt > 0) {
          marksToSave.push({
            studentId: st.id,
            teacherId: currentUser?.id || 'admin',
            examType: 'Half-Yearly Test',
            subject: normalizedSub,
            marksObtained: Number(row.hyTestObt || 0),
            maxMarks: Number(row.hyTestMax || 10)
          });
        }

        // 2. Half-Yearly Exam (Written + Oral + Practical)
        marksToSave.push({
          studentId: st.id,
          teacherId: currentUser?.id || 'admin',
          examType: 'Half-Yearly Exam',
          subject: normalizedSub,
          marksObtained: Number(row.hyWrittenObt || 0),
          maxMarks: Number(row.hyWrittenMax || 70),
          oralMarks: showAnnualOralCols ? Number(row.hyOralObt || 0) : undefined,
          oralMaxMarks: showAnnualOralCols ? Number(row.hyOralMax || 20) : undefined,
          practicalMarks: showAnnualPracCols ? Number(row.hyPracObt || 0) : undefined,
          practicalMaxMarks: showAnnualPracCols ? Number(row.hyPracMax || 0) : undefined
        });

        // 3. Yearly Test (if test cols enabled or value > 0)
        if (showAnnualTestCols || row.yTestObt > 0) {
          marksToSave.push({
            studentId: st.id,
            teacherId: currentUser?.id || 'admin',
            examType: 'Yearly Test',
            subject: normalizedSub,
            marksObtained: Number(row.yTestObt || 0),
            maxMarks: Number(row.yTestMax || 10)
          });
        }

        // 4. Yearly Exam (Written + Oral + Practical)
        marksToSave.push({
          studentId: st.id,
          teacherId: currentUser?.id || 'admin',
          examType: 'Yearly Exam',
          subject: normalizedSub,
          marksObtained: Number(row.yWrittenObt || 0),
          maxMarks: Number(row.yWrittenMax || 70),
          oralMarks: showAnnualOralCols ? Number(row.yOralObt || 0) : undefined,
          oralMaxMarks: showAnnualOralCols ? Number(row.yOralMax || 20) : undefined,
          practicalMarks: showAnnualPracCols ? Number(row.yPracObt || 0) : undefined,
          practicalMaxMarks: showAnnualPracCols ? Number(row.yPracMax || 0) : undefined
        });
      });

      await importMarks(marksToSave);

      // Clean up draft after successful DB save
      const draftKey = `edumanage_subj_annual_draft_${selectedClass}_${subject}`;
      localStorage.removeItem(draftKey);
      setSubjectAnnualDraftInfo(null);

      setIsSubjectAnnualSaved(true);
      setTimeout(() => setIsSubjectAnnualSaved(false), 4500);
    } catch (err) {
      console.error('Failed to save subject annual marks:', err);
      alert('अंक सुरक्षित करने में त्रुटि हुई।');
    } finally {
      setIsSubjectAnnualSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HELPERS & HANDLERS: ATTENDANCE LEDGER (MODE 5)
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
            <span>1. एकल परीक्षा (Fast Single Exam)</span>
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
            <span>2. 4-इन-1 छात्र मार्कशीट (Student 360°)</span>
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

          {/* Mode 4: Subject Annual Comprehensive Ledger */}
          <button
            type="button"
            onClick={() => setActiveMode('subject-annual-ledger')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'subject-annual-ledger'
                ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-300'
                : 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>4. विषय-वार वार्षिक लेजर (Senior Ledger)</span>
          </button>

          {/* Mode 5: Pre-Primary / Nursery / LKG / UKG Special Mode */}
          <button
            type="button"
            onClick={() => {
              setActiveMode('pre-primary-junior');
              if (!isPrePrimaryGrade(selectedClass)) {
                setSelectedClass('Nursery');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'pre-primary-junior'
                ? 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-300 font-black'
                : 'bg-pink-50 text-pink-900 hover:bg-pink-100 border border-pink-200'
            }`}
          >
            <span>🎒</span>
            <span>5. नर्सरी / LKG / UKG ग्रेडिंग (Test + Written + Oral)</span>
            <span className="bg-amber-300 text-slate-950 text-[9px] px-1 py-0.2 rounded font-black">
              No Practical
            </span>
          </button>

          {/* Mode 6: Report Card Attendance */}
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
            <span>6. उपस्थिति लेजर (Attendance Sync)</span>
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

        {/* Mode 3 Controls in Top Bar */}
        {activeMode === 'class-matrix' && (
          <>
            <div className="w-48">
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

            <div className="w-48">
              <Label className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span>Subject View</span>
                {matrixSubjectFilter !== 'ALL' && (
                  <button 
                    type="button" 
                    onClick={() => setMatrixSubjectFilter('ALL')}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Show All
                  </button>
                )}
              </Label>
              <Input 
                as="select" 
                value={matrixSubjectFilter} 
                onChange={e => setMatrixSubjectFilter(e.target.value)}
              >
                <option value="ALL">🌟 All Subjects (सभी विषय)</option>
                {subjects.map(sb => {
                  const stat = matrixSubjectStats.find(s => isSameSubject(s.subject, sb));
                  const isDone = stat?.isComplete;
                  return (
                    <option key={sb} value={sb}>
                      {sb} {isDone ? '(पूर्ण ✓)' : `(${stat?.filledStudents || 0}/${stat?.totalStudents || 0})`}
                    </option>
                  );
                })}
              </Input>
            </div>

            <div className="w-52">
              <Label className="font-bold text-slate-700 text-xs">Pattern / Format</Label>
              <Input 
                as="select" 
                value={matrixPattern} 
                onChange={e => setMatrixPattern(e.target.value as MatrixPattern)}
              >
                <option value="test-paper-i-ii">🔥 Test + Paper I + II (टेस्ट + प्रथम + द्वितीय पत्र)</option>
                <option value="paper-i-ii">📑 Paper I + II (प्रथम + द्वितीय पत्र)</option>
                <option value="test-written-oral">📝 Test + Written + Oral (टेस्ट + लिखित + मौखिक)</option>
                <option value="written-oral">📝 Written + Oral (लिखित + मौखिक)</option>
                <option value="test-written-prac">🧪 Test + Written + Practical (टेस्ट + लिखित + प्रैक्टिकल)</option>
                <option value="written-prac">🧪 Written + Practical (लिखित + प्रायोगिक)</option>
                <option value="written-only">✏️ Written Only (केवल लिखित)</option>
                <option value="all-composite">🌟 All-in-One (Test + I + II + Oral + Prac)</option>
              </Input>
            </div>

            <div className="flex items-center gap-2 pb-1.5 self-end">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-slate-200/70 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors border border-slate-300">
                <input 
                  type="checkbox"
                  checked={hideCompletedSubjects}
                  onChange={e => setHideCompletedSubjects(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1">
                  {hideCompletedSubjects ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                  Hide Completed ({completedSubjectsCount}/{subjects.length})
                </span>
              </label>
            </div>
          </>
        )}

        {/* Mode 4: Subject Annual Ledger Controls in Top Bar */}
        {activeMode === 'subject-annual-ledger' && (
          <>
            <div className="w-56">
              <Label className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-teal-600" /> Select Subject (विषय)</span>
                <span className="text-[10px] text-teal-700 font-bold">
                  {subjects.indexOf(subject) + 1}/{subjects.length}
                </span>
              </Label>
              <Input 
                as="select" 
                value={subject} 
                onChange={e => {
                  setSubject(e.target.value);
                  setIsSubjectAnnualSaved(false);
                }}
              >
                {subjects.map(sb => {
                  const stat = subjectAnnualStats.find(s => isSameSubject(s.subject, sb));
                  const isDone = stat?.isComplete;
                  return (
                    <option key={sb} value={sb}>
                      {sb} {isDone ? '(पूर्ण ✓)' : `(${stat?.filledStudents || 0}/${stat?.totalStudents || 0})`}
                    </option>
                  );
                })}
              </Input>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pb-1 self-end">
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg border border-slate-300">
                <input 
                  type="checkbox"
                  checked={showAnnualTestCols}
                  onChange={e => setShowAnnualTestCols(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                />
                <span>Tests (टेस्ट)</span>
              </label>

              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg border border-slate-300">
                <input 
                  type="checkbox"
                  checked={showAnnualOralCols}
                  onChange={e => setShowAnnualOralCols(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>मौखिक (Oral)</span>
              </label>

              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg border border-slate-300">
                <input 
                  type="checkbox"
                  checked={showAnnualPracCols}
                  onChange={e => setShowAnnualPracCols(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>प्रायोगिक (Prac)</span>
              </label>

              <label className="flex items-center gap-1 text-[11px] font-bold text-indigo-800 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg border border-indigo-200">
                <input 
                  type="checkbox"
                  checked={syncHyAnnualMax}
                  onChange={e => setSyncHyAnnualMax(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Sync HY & Yearly Max</span>
              </label>
            </div>
          </>
        )}

        {/* Student picker for Mode 2 */}
        {activeMode === 'student-mixed' && (
          <div className="flex-1 min-w-[240px]">
            <Label className="font-bold text-slate-700 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-purple-600" /> Select Student</span>
              {(filteredStudents.length > 0 ? filteredStudents : classStudents).length > 0 && (
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
                {(filteredStudents.length > 0 ? filteredStudents : classStudents).map(st => (
                  <option key={st.id} value={st.id}>
                    Roll {st.rollNo || '-'} - {st.name} ({st.fatherName ? `S/o ${st.fatherName}` : st.grade})
                  </option>
                ))}
              </Input>
              <button
                type="button"
                onClick={() => handleNavigateStudent('prev')}
                disabled={(filteredStudents.length > 0 ? filteredStudents : classStudents).findIndex(s => s.id === selectedStudentId) <= 0}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Student"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => handleNavigateStudent('next')}
                disabled={(filteredStudents.length > 0 ? filteredStudents : classStudents).findIndex(s => s.id === selectedStudentId) >= (filteredStudents.length > 0 ? filteredStudents : classStudents).length - 1}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next Student"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL STUDENT ORDERING & SMART FILTER BAR (ALL 5 MODES)      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  छात्र क्रम व फ़िल्टर (Student Ordering & Smart Filter)
                </span>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                  {filteredStudents.length} / {classStudents.length} छात्र
                </span>
                {studentProgressStats.pending > 0 ? (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{studentProgressStats.pending} शेष (Pending)</span>
                  </span>
                ) : classStudents.length > 0 ? (
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>100% अंक पूर्ण (Complete)</span>
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500">
                अंक चढ़ाने हेतु छात्रों को रोल नंबर, नाम (A to Z), पिता का नाम, या केवल बाकी (Pending) छात्रों के अनुसार क्रमबद्ध करें (सभी 5 सेक्शन में लागू):
              </p>
            </div>
          </div>

          {/* Quick Filter Reset Button */}
          {(sortBy !== 'roll-asc' || marksFilter !== 'all' || genderFilter !== 'all' || sectionFilter !== 'all' || searchQuery.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setSortBy('roll-asc');
                setMarksFilter('all');
                setGenderFilter('all');
                setSectionFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>फ़िल्टर रीसेट करें (Reset Filters)</span>
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-2.5 items-end">
          {/* 1. Sorting Order Dropdown */}
          <div className="lg:col-span-4">
            <Label className="font-bold text-slate-700 text-xs flex items-center gap-1 mb-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>छात्रों का क्रम (Sort Order):</span>
            </Label>
            <Input
              as="select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as StudentSortOption)}
              className="text-xs font-semibold bg-slate-50 border-slate-300"
            >
              <option value="roll-asc">🔢 रोल नंबर: 1 ➔ अंतिम (Roll No 1 to N)</option>
              <option value="roll-desc">🔢 रोल नंबर: उल्टा N ➔ 1 (Roll No Desc)</option>
              <option value="name-asc">🔤 नाम: वर्णमाला A ➔ Z (अ से ज्ञ)</option>
              <option value="name-desc">🔤 नाम: उल्टा Z ➔ A</option>
              <option value="father-asc">👨‍👦 पिता का नाम: A ➔ Z</option>
              <option value="sr-asc">📜 स्कॉलर / SR No (आरोही)</option>
              <option value="gender-boys">👦 छात्र पहले (Boys First)</option>
              <option value="gender-girls">👧 छात्राएं पहले (Girls First)</option>
            </Input>
          </div>

          {/* 2. Marks Status Filter */}
          <div className="lg:col-span-3">
            <Label className="font-bold text-slate-700 text-xs flex items-center gap-1 mb-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>अंक स्थिति (Marks Status):</span>
            </Label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setMarksFilter('all')}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer border ${
                  marksFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                सभी ({studentProgressStats.total})
              </button>
              <button
                type="button"
                onClick={() => setMarksFilter('pending')}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer border ${
                  marksFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs font-black'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200'
                }`}
                title="जिन छात्रों के अंक अभी बाकी हैं"
              >
                ⏳ बाकी ({studentProgressStats.pending})
              </button>
              <button
                type="button"
                onClick={() => setMarksFilter('completed')}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer border ${
                  marksFilter === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-200'
                }`}
                title="जिन छात्रों के अंक भरे जा चुके हैं"
              >
                ✅ पूर्ण ({studentProgressStats.filled})
              </button>
            </div>
          </div>

          {/* 3. Gender Filter */}
          <div className="lg:col-span-2">
            <Label className="font-bold text-slate-700 text-xs flex items-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>लिंग (Gender):</span>
            </Label>
            <Input
              as="select"
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value as StudentGenderFilter)}
              className="text-xs font-semibold bg-slate-50 border-slate-300"
            >
              <option value="all">👥 All (सभी)</option>
              <option value="Male">👦 छात्र (Boys)</option>
              <option value="Female">👧 छात्राएं (Girls)</option>
            </Input>
          </div>

          {/* 4. Section Filter / Search Filter */}
          {availableSections.length > 0 ? (
            <div className="lg:col-span-3">
              <Label className="font-bold text-slate-700 text-xs flex items-center gap-1 mb-1">
                <span>सेक्शन (Section):</span>
              </Label>
              <Input
                as="select"
                value={sectionFilter}
                onChange={e => setSectionFilter(e.target.value as StudentSectionFilter)}
                className="text-xs font-semibold bg-slate-50 border-slate-300"
              >
                <option value="all">सभी सेक्शन (All)</option>
                {availableSections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </Input>
            </div>
          ) : (
            <div className="lg:col-span-3">
              <Label className="font-bold text-slate-700 text-xs flex items-center gap-1 mb-1">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>खोजें (Search Student):</span>
              </Label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="नाम, रोल नं, पिता का नाम..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Switch Chips for sorting */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">त्वरित क्रम (Quick Sort):</span>
            <button
              type="button"
              onClick={() => setSortBy('roll-asc')}
              className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                sortBy === 'roll-asc'
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              🔢 Roll No (1-N)
            </button>
            <button
              type="button"
              onClick={() => setSortBy('name-asc')}
              className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                sortBy === 'name-asc'
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              🔤 Alphabetical (A-Z)
            </button>
            <button
              type="button"
              onClick={() => setSortBy('father-asc')}
              className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                sortBy === 'father-asc'
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              👨‍👦 Father Name
            </button>
            <button
              type="button"
              onClick={() => setSortBy('sr-asc')}
              className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                sortBy === 'sr-asc'
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              📜 SR No
            </button>
            <button
              type="button"
              onClick={() => setSortBy('gender-boys')}
              className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                sortBy === 'gender-boys'
                  ? 'bg-purple-600 text-white border-purple-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              👦 Boys ➔ Girls
            </button>
            <button
              type="button"
              onClick={() => setSortBy('gender-girls')}
              className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                sortBy === 'gender-girls'
                  ? 'bg-purple-600 text-white border-purple-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              👧 Girls ➔ Boys
            </button>
          </div>

          {availableSections.length > 0 && (
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <input
                type="text"
                placeholder="नाम, रोल नं, पिता का नाम..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-2.5 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
      {/* ========================================================================= */}
      {/* MODE 3: CLASS MASTER GRID & ALL SUBJECTS MATRIX                            */}
      {/* ========================================================================= */}
      {activeMode === 'class-matrix' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-4">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg text-white shadow-xs">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-white">
                    3. All Subjects Marks Matrix ({selectedClass})
                  </h4>
                  <span className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
                    {examType}
                  </span>
                  <span className="bg-slate-800 text-slate-300 text-[10.5px] font-bold px-2 py-0.5 rounded border border-slate-700">
                    {classStudents.length} छात्र
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  सम्पूर्ण कक्षा के सभी विषयों के लिखित (Written / Paper I), मौखिक (Oral / Paper II) व प्रायोगिक अंक एक्सेल ग्रिड की तरह भरें।
                </p>
              </div>
            </div>

            {/* Auto-Save & Manual Save Draft Actions */}
            <div className="flex items-center gap-2.5">
              {autoSaveNotice && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {autoSaveNotice}
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveMatrixDraft}
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="ब्राउज़र/कंप्यूटर बंद होने पर भी डेटा सुरक्षित रहेगा"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Save Draft (ड्राफ्ट सुरक्षित करें)</span>
              </button>
            </div>
          </div>

          {/* Draft Recovery Alert Banner */}
          {draftInfo && (
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold flex items-center gap-2">
                    <span>📌 इस कक्षा का सहेजा गया ड्राफ्ट (Unsaved Draft) उपलब्ध है!</span>
                    <span className="text-[11px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-mono">
                      {draftInfo.timestamp} ({draftInfo.count} प्रविष्टियां)
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    यदि सिस्टम बंद हो गया था तो आप पिछले ड्राफ्ट को लोड करके वहीं से कार्य जारी रख सकते हैं।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleRestoreMatrixDraft}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Draft (लोड करें)</span>
                </Button>
                <button
                  type="button"
                  onClick={handleDiscardMatrixDraft}
                  className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Discard (हटाएं)
                </button>
              </div>
            </div>
          )}

          {/* Pattern & Subject Filter Bar */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            {/* Top Row: Pattern Tabs & Hide Completed Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" /> परीक्षा पैटर्न:
                </span>
                {[
                  { id: 'test-paper-i-ii', label: '🔥 टेस्ट + प्रथम + द्वितीय पत्र (Test + Paper I + II)', desc: 'टेस्ट (10) + प्रथम पत्र (35) + द्वितीय पत्र (35) = 80 / 100' },
                  { id: 'paper-i-ii', label: '📑 प्रथम + द्वितीय पत्र (Paper I + II)', desc: 'Paper I (50) + Paper II (50) = 100' },
                  { id: 'test-written-oral', label: '📝🗣️ टेस्ट + लिखित + मौखिक (Test + Writ + Oral)', desc: 'टेस्ट (10) + लिखित (70) + मौखिक (20) = 100' },
                  { id: 'written-oral', label: '📝 लिखित + मौखिक (Writ + Oral)', desc: 'लिखित (80) + मौखिक (20) = 100' },
                  { id: 'test-written-prac', label: '🧪 टेस्ट + लिखित + प्रायोगिक (Test + Writ + Prac)', desc: 'टेस्ट (10) + थ्योरी (60) + प्रैक्टिकल (30) = 100' },
                  { id: 'written-prac', label: '🧪 लिखित + प्रायोगिक (Writ + Prac)', desc: 'लिखित एवं प्रैक्टिकल' },
                  { id: 'written-only', label: '✏️ केवल लिखित (Written Only)', desc: 'एकल लिखित अंक' },
                  { id: 'all-composite', label: '🌟 समग्र ऑल-इन-वन (Test + I + II + Oral + Prac)', desc: 'टेस्ट + प्रथम + द्वितीय + मौखिक + प्रैक्टिकल' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMatrixPattern(p.id as MatrixPattern)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      matrixPattern === p.id
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                    title={p.desc}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Hide Completed Subjects Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 shadow-xs">
                <input
                  type="checkbox"
                  checked={hideCompletedSubjects}
                  onChange={e => setHideCompletedSubjects(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  {hideCompletedSubjects ? (
                    <EyeOff className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-500" />
                  )}
                  <span>पूर्ण विषय छुपाएं (Hide Completed)</span>
                  <span className="bg-slate-100 text-slate-600 text-[10.5px] px-1.5 py-0.5 rounded font-mono">
                    {completedSubjectsCount}/{subjects.length} पूर्ण
                  </span>
                </span>
              </label>
            </div>

            {/* Subject Selection Tabs with Progress */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200">
              <span className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> विषय चुनें (Subject Focus):
              </span>
              <button
                type="button"
                onClick={() => setMatrixSubjectFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixSubjectFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                🌟 सभी विषय ({visibleMatrixSubjects.length}/{subjects.length})
              </button>
              {subjects.map(sb => {
                const stat = matrixSubjectStats.find(s => isSameSubject(s.subject, sb));
                const isComplete = stat?.isComplete;
                const isSelected = isSameSubject(matrixSubjectFilter, sb);
                const isHidden = hideCompletedSubjects && isComplete;

                if (isHidden && !isSelected) return null;

                return (
                  <button
                    key={sb}
                    type="button"
                    onClick={() => setMatrixSubjectFilter(sb)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isComplete
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{sb}</span>
                    {isComplete ? (
                      <span className="bg-emerald-600 text-white text-[9px] px-1 py-0.2 rounded font-black flex items-center">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] opacity-75 font-mono">
                        ({stat?.filledStudents || 0}/{stat?.totalStudents || 0})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Click Standard Presets & Max Marks Tool */}
          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs space-y-2.5">
            {/* Quick 1-Click Universal Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ⚡ 1-क्लिक मानक परीक्षा प्रारूप प्रीसेट (1-Click Grading Presets):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyMatrixPreset('test-paper-i-ii-80')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer"
                  title="Test 10 + Paper I 35 + Paper II 35 = 80 Total"
                >
                  🔥 10 Test + 35 Paper I + 35 Paper II (=80)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMatrixPreset('test-paper-i-ii-100')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer"
                  title="Test 10 + Paper I 45 + Paper II 45 = 100 Total"
                >
                  🌟 10 Test + 45 Paper I + 45 Paper II (=100)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMatrixPreset('paper-i-ii-100')}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer"
                  title="50 Paper I + 50 Paper II = 100 Total"
                >
                  📑 50 Paper I + 50 Paper II (=100)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMatrixPreset('test-written-oral-100')}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer"
                  title="10 Test + 70 Written + 20 Oral = 100 Total"
                >
                  📝 10 Test + 70 Written + 20 Oral (=100)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMatrixPreset('test-theory-prac-100')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer"
                  title="10 Test + 60 Theory + 30 Practical = 100 Total"
                >
                  🧪 10 Test + 60 Theory + 30 Prac (=100)
                </button>
              </div>
            </div>

            {/* Custom Max Marks Controllers */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Test Max Controller */}
                {(matrixPattern === 'test-paper-i-ii' || matrixPattern === 'test-written-oral' || matrixPattern === 'test-written-prac' || matrixPattern === 'all-composite') && (
                  <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 px-2.5 rounded-lg border border-amber-500/40">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Test Max:
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 10, 15, 20, 25].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleApplyMatrixBulkMaxMarks('testMax', val, matrixSubjectFilter)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                            bulkMatrixTestMax === val
                              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                              : 'bg-slate-700 hover:bg-amber-400 hover:text-slate-950 text-slate-200'
                          }`}
                        >
                          {val === 0 ? 'Off' : val}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
                      <input
                        type="number"
                        min="0"
                        value={bulkMatrixTestMax}
                        onChange={e => setBulkMatrixTestMax(Number(e.target.value))}
                        className="w-9 text-center text-xs font-mono font-bold bg-slate-950 text-amber-300 rounded p-0.5 border border-amber-600/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyMatrixBulkMaxMarks('testMax', bulkMatrixTestMax, matrixSubjectFilter)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-bold px-1.5 py-1 rounded cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Paper I / Written Max Controller */}
                <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 px-2.5 rounded-lg border border-blue-500/40">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-blue-400" />
                    {(matrixPattern === 'test-paper-i-ii' || matrixPattern === 'paper-i-ii') ? 'Paper I Max:' : 'Written Max:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {[25, 35, 40, 45, 50, 60, 70, 80, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleApplyMatrixBulkMaxMarks('max', val, matrixSubjectFilter)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          bulkMatrixWrittenMax === val
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'bg-slate-700 hover:bg-blue-500 text-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
                    <input
                      type="number"
                      min="1"
                      value={bulkMatrixWrittenMax}
                      onChange={e => setBulkMatrixWrittenMax(Number(e.target.value))}
                      className="w-10 text-center text-xs font-mono font-bold bg-slate-950 text-white rounded p-0.5 border border-slate-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyMatrixBulkMaxMarks('max', bulkMatrixWrittenMax, matrixSubjectFilter)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-1.5 py-1 rounded cursor-pointer"
                    >
                      Set
                    </button>
                  </div>
                </div>

                {/* 3. Paper II Max Controller */}
                {(matrixPattern === 'test-paper-i-ii' || matrixPattern === 'paper-i-ii') && (
                  <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 px-2.5 rounded-lg border border-purple-500/40">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-purple-400" />
                      Paper II Max:
                    </span>
                    <div className="flex items-center gap-1">
                      {[25, 35, 40, 45, 50].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleApplyMatrixBulkMaxMarks('paper2Max', val, matrixSubjectFilter)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                            bulkMatrixPaper2Max === val
                              ? 'bg-purple-600 text-white shadow-xs font-black'
                              : 'bg-slate-700 hover:bg-purple-500 text-slate-200'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
                      <input
                        type="number"
                        min="1"
                        value={bulkMatrixPaper2Max}
                        onChange={e => setBulkMatrixPaper2Max(Number(e.target.value))}
                        className="w-10 text-center text-xs font-mono font-bold bg-slate-950 text-purple-300 rounded p-0.5 border border-purple-600/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyMatrixBulkMaxMarks('paper2Max', bulkMatrixPaper2Max, matrixSubjectFilter)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-1.5 py-1 rounded cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Oral / Prac Max Controller */}
                {(matrixPattern === 'written-oral' || matrixPattern === 'test-written-oral' || matrixPattern === 'written-prac' || matrixPattern === 'test-written-prac' || matrixPattern === 'all-composite') && (
                  <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 px-2.5 rounded-lg border border-teal-500/40">
                    <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                      <FlaskConical className="w-3 h-3 text-teal-400" />
                      {(matrixPattern === 'written-prac' || matrixPattern === 'test-written-prac') ? 'Prac Max:' : 'Oral Max:'}
                    </span>
                    <div className="flex items-center gap-1">
                      {[10, 15, 20, 25, 30, 40, 50].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleApplyMatrixBulkMaxMarks('oralMax', val, matrixSubjectFilter)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                            bulkMatrixOralPracMax === val
                              ? 'bg-teal-600 text-white shadow-xs font-black'
                              : 'bg-slate-700 hover:bg-teal-500 text-slate-200'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
                      <input
                        type="number"
                        min="1"
                        value={bulkMatrixOralPracMax}
                        onChange={e => setBulkMatrixOralPracMax(Number(e.target.value))}
                        className="w-10 text-center text-xs font-mono font-bold bg-slate-950 text-teal-300 rounded p-0.5 border border-teal-600/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyMatrixBulkMaxMarks('oralMax', bulkMatrixOralPracMax, matrixSubjectFilter)}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold px-1.5 py-1 rounded cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Note */}
              <div className="text-[10.5px] text-slate-300">
                {matrixSubjectFilter !== 'ALL' ? (
                  <span className="text-amber-300 font-bold">फ़िल्टर: केवल "{matrixSubjectFilter}"</span>
                ) : (
                  <span>प्रत्येक छात्र के सेल में टेस्ट, पेपर I एवं पेपर II अंक व पूर्णांक अलग-अलग संपादन योग्य हैं</span>
                )}
              </div>
            </div>
          </div>

          {/* If all subjects completed and hidden */}
          {visibleMatrixSubjects.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-xl space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900">
                🎉 बधाई! कक्षा {selectedClass} के सभी {subjects.length} विषयों के अंक पूर्ण रूप से भरे जा चुके हैं!
              </h4>
              <p className="text-xs text-emerald-700">
                'पूर्ण विषय छुपाएं' विकल्प सक्रिय होने के कारण सभी पूर्ण विषय छुपे हुए हैं। देखने या संशोधन के लिए नीचे क्लिक करें:
              </p>
              <Button
                type="button"
                onClick={() => setHideCompletedSubjects(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                सभी विषय दिखाएं (Show All Subjects)
              </Button>
            </div>
          ) : (
            /* Matrix Grid Table */
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-xs max-h-[70vh]">
              <table className="w-full text-left text-[11px] text-slate-600 border-collapse">
                <thead className="bg-slate-100 uppercase text-[9px] font-extrabold text-slate-700 border-b border-slate-300 sticky top-0 z-20">
                  {/* Top Header Row for Subject Groups */}
                  <tr>
                    <th className="px-3 py-2 w-14 sticky left-0 bg-slate-100 z-30 border-r border-slate-200" rowSpan={2}>
                      Roll
                    </th>
                    <th className="px-3 py-2 min-w-[150px] sticky left-14 bg-slate-100 z-30 border-r border-slate-300" rowSpan={2}>
                      Student Name
                    </th>
                    {visibleMatrixSubjects.map(sub => {
                      const stat = matrixSubjectStats.find(s => isSameSubject(s.subject, sub));
                      const isComplete = stat?.isComplete;
                      const colSpan = matrixPattern === 'all-composite' 
                        ? 6 
                        : (matrixPattern === 'test-paper-i-ii' || matrixPattern === 'test-written-oral' || matrixPattern === 'test-written-prac')
                        ? 4 
                        : (matrixPattern === 'paper-i-ii' || matrixPattern === 'written-oral' || matrixPattern === 'written-prac')
                        ? 3 
                        : 1;

                      return (
                        <th
                          key={sub}
                          colSpan={colSpan}
                          className={`px-3 py-1.5 text-center border-r border-slate-300 ${
                            isComplete ? 'bg-emerald-100/70 text-emerald-950' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-black text-[11px]">{sub}</span>
                            {isComplete && (
                              <span className="bg-emerald-600 text-white text-[8px] px-1 py-0.2 rounded font-black">
                                ✓
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-3 py-2 text-center w-20 bg-slate-200 text-slate-800 border-l border-slate-300" rowSpan={2}>
                      Total / %
                    </th>
                  </tr>

                  {/* Sub Header Row for Components */}
                  <tr className="bg-slate-50 text-[8.5px] font-bold text-slate-600 border-b border-slate-200">
                    {visibleMatrixSubjects.map(sub => {
                      if (matrixPattern === 'test-paper-i-ii') {
                        return (
                          <React.Fragment key={`${sub}-subcols`}>
                            <th className="px-1 py-1 text-center min-w-[65px] bg-amber-50/70 text-amber-950 border-r border-slate-200">
                              टेस्ट (Test)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[68px] bg-blue-50/70 text-blue-950 border-r border-slate-200">
                              प्रथम I ({sub} I)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[68px] bg-purple-50/70 text-purple-950 border-r border-slate-200">
                              द्वितीय II ({sub} II)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[48px] bg-slate-100 text-slate-800 border-r border-slate-300">
                              कुल (Total)
                            </th>
                          </React.Fragment>
                        );
                      }
                      if (matrixPattern === 'paper-i-ii') {
                        return (
                          <React.Fragment key={`${sub}-subcols`}>
                            <th className="px-1.5 py-1 text-center min-w-[68px] bg-blue-50/50 text-blue-900 border-r border-slate-200">
                              प्रथम I ({sub} I)
                            </th>
                            <th className="px-1.5 py-1 text-center min-w-[68px] bg-purple-50/50 text-purple-900 border-r border-slate-200">
                              द्वितीय II ({sub} II)
                            </th>
                            <th className="px-1.5 py-1 text-center min-w-[50px] bg-slate-100 text-slate-700 border-r border-slate-300">
                              कुल (Total)
                            </th>
                          </React.Fragment>
                        );
                      }
                      if (matrixPattern === 'test-written-oral') {
                        return (
                          <React.Fragment key={`${sub}-subcols`}>
                            <th className="px-1 py-1 text-center min-w-[65px] bg-amber-50/70 text-amber-950 border-r border-slate-200">
                              टेस्ट (Test)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[68px] bg-blue-50/50 text-blue-900 border-r border-slate-200">
                              लिखित (Writ)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[68px] bg-teal-50/50 text-teal-900 border-r border-slate-200">
                              मौखिक (Oral)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[48px] bg-slate-100 text-slate-700 border-r border-slate-300">
                              कुल (Total)
                            </th>
                          </React.Fragment>
                        );
                      }
                      if (matrixPattern === 'written-oral') {
                        return (
                          <React.Fragment key={`${sub}-subcols`}>
                            <th className="px-1.5 py-1 text-center min-w-[68px] bg-blue-50/50 text-blue-900 border-r border-slate-200">
                              लिखित (Writ)
                            </th>
                            <th className="px-1.5 py-1 text-center min-w-[68px] bg-amber-50/50 text-amber-900 border-r border-slate-200">
                              मौखिक (Oral)
                            </th>
                            <th className="px-1.5 py-1 text-center min-w-[50px] bg-slate-100 text-slate-700 border-r border-slate-300">
                              कुल (Total)
                            </th>
                          </React.Fragment>
                        );
                      }
                      if (matrixPattern === 'test-written-prac') {
                        return (
                          <React.Fragment key={`${sub}-subcols`}>
                            <th className="px-1 py-1 text-center min-w-[65px] bg-amber-50/70 text-amber-950 border-r border-slate-200">
                              टेस्ट (Test)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[68px] bg-blue-50/50 text-blue-900 border-r border-slate-200">
                              लिखित (Theory)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[68px] bg-emerald-50/50 text-emerald-900 border-r border-slate-200">
                              प्रायोगिक (Prac)
                            </th>
                            <th className="px-1 py-1 text-center min-w-[48px] bg-slate-100 text-slate-700 border-r border-slate-300">
                              कुल (Total)
                            </th>
                          </React.Fragment>
                        );
                      }
                      if (matrixPattern === 'written-prac') {
                        return (
                          <React.Fragment key={`${sub}-subcols`}>
                            <th className="px-1.5 py-1 text-center min-w-[68px] bg-blue-50/50 text-blue-900 border-r border-slate-200">
                              लिखित (Theory)
                            </th>
                            <th className="px-1.5 py-1 text-center min-w-[68px] bg-amber-50/50 text-amber-900 border-r border-slate-200">
                              प्रायोगिक (Prac)
                            </th>
                            <th className="px-1.5 py-1 text-center min-w-[50px] bg-slate-100 text-slate-700 border-r border-slate-300">
                              कुल (Total)
                            </th>
                          </React.Fragment>
                        );
                      }
                      if (matrixPattern === 'all-composite') {
                        return (
                          <React.Fragment key={`${sub}-subcols`}>
                            <th className="px-1 py-1 text-center min-w-[55px] bg-amber-50/70 text-amber-900 border-r border-slate-200">
                              टेस्ट
                            </th>
                            <th className="px-1 py-1 text-center min-w-[55px] bg-blue-50/50 text-blue-900 border-r border-slate-200">
                              प्रथम I
                            </th>
                            <th className="px-1 py-1 text-center min-w-[55px] bg-purple-50/50 text-purple-900 border-r border-slate-200">
                              द्वितीय II
                            </th>
                            <th className="px-1 py-1 text-center min-w-[55px] bg-teal-50/50 text-teal-900 border-r border-slate-200">
                              मौखिक
                            </th>
                            <th className="px-1 py-1 text-center min-w-[55px] bg-emerald-50/50 text-emerald-900 border-r border-slate-200">
                              प्रायोगिक
                            </th>
                            <th className="px-1 py-1 text-center min-w-[45px] bg-slate-100 text-slate-700 border-r border-slate-300">
                              कुल
                            </th>
                          </React.Fragment>
                        );
                      }
                      return (
                        <th key={`${sub}-subcols`} className="px-2 py-1 text-center min-w-[85px] border-r border-slate-300">
                          प्राप्तांक / पूर्णांक (Obt / Max)
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(st => {
                    let studentRowTotalObt = 0;
                    let studentRowTotalMax = 0;

                    return (
                      <tr key={st.id} className="hover:bg-blue-50/40 transition-colors group">
                        {/* Roll No */}
                        <td className="px-3 py-1.5 font-mono font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/40 z-10 border-r border-slate-200 text-center">
                          {st.rollNo || '-'}
                        </td>

                        {/* Student Name */}
                        <td className="px-3 py-1.5 font-black text-slate-800 text-xs sticky left-14 bg-white group-hover:bg-blue-50/40 z-10 border-r border-slate-300 truncate max-w-[170px]">
                          <div className="flex flex-col">
                            <span className="truncate">{st.name}</span>
                            <span className="text-[9.5px] font-normal text-slate-400">
                              SR: {st.srNo || '-'} {st.fatherName ? `| ${st.fatherName}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Subject Input Cells */}
                        {visibleMatrixSubjects.map(sub => {
                          const cell = matrixMarks[`${st.id}:::${sub}`] || { 
                            testObt: 0,
                            testMax: 10,
                            obt: 0, 
                            max: 35, 
                            paper2Obt: 0,
                            paper2Max: 35,
                            oralObt: 0, 
                            oralMax: 20, 
                            pracObt: 0, 
                            pracMax: 0 
                          };

                          const testObt = Number(cell.testObt || 0);
                          const testMax = Number(cell.testMax !== undefined ? cell.testMax : 10);
                          const writObt = Number(cell.obt || 0);
                          const writMax = Number(cell.max || 35);
                          const paper2Obt = Number(cell.paper2Obt || 0);
                          const paper2Max = Number(cell.paper2Max !== undefined ? cell.paper2Max : 35);
                          const oralObt = Number(cell.oralObt || 0);
                          const oralMax = Number(cell.oralMax !== undefined ? cell.oralMax : 20);
                          const pracObt = Number(cell.pracObt || 0);
                          const pracMax = Number(cell.pracMax !== undefined ? cell.pracMax : 0);

                          let cellTotalObt = 0;
                          let cellTotalMax = 0;

                          if (matrixPattern === 'test-paper-i-ii') {
                            cellTotalObt = testObt + writObt + paper2Obt;
                            cellTotalMax = testMax + writMax + paper2Max;
                          } else if (matrixPattern === 'paper-i-ii') {
                            const p2O = paper2Obt > 0 ? paper2Obt : (oralObt > 0 ? oralObt : pracObt);
                            const p2M = paper2Max > 0 ? paper2Max : (oralMax > 0 ? oralMax : (pracMax > 0 ? pracMax : 35));
                            cellTotalObt = writObt + p2O;
                            cellTotalMax = writMax + p2M;
                          } else if (matrixPattern === 'test-written-oral') {
                            cellTotalObt = testObt + writObt + oralObt;
                            cellTotalMax = testMax + writMax + oralMax;
                          } else if (matrixPattern === 'written-oral') {
                            cellTotalObt = writObt + oralObt;
                            cellTotalMax = writMax + oralMax;
                          } else if (matrixPattern === 'test-written-prac') {
                            const pO = pracObt > 0 ? pracObt : (paper2Obt > 0 ? paper2Obt : oralObt);
                            const pM = pracMax > 0 ? pracMax : (paper2Max > 0 ? paper2Max : oralMax);
                            cellTotalObt = testObt + writObt + pO;
                            cellTotalMax = testMax + writMax + pM;
                          } else if (matrixPattern === 'written-prac') {
                            const pO = pracObt > 0 ? pracObt : oralObt;
                            const pM = pracMax > 0 ? pracMax : oralMax;
                            cellTotalObt = writObt + pO;
                            cellTotalMax = writMax + pM;
                          } else if (matrixPattern === 'all-composite') {
                            cellTotalObt = testObt + writObt + paper2Obt + oralObt + pracObt;
                            cellTotalMax = testMax + writMax + paper2Max + oralMax + pracMax;
                          } else {
                            cellTotalObt = writObt;
                            cellTotalMax = writMax;
                          }

                          studentRowTotalObt += cellTotalObt;
                          studentRowTotalMax += cellTotalMax;

                          if (matrixPattern === 'test-paper-i-ii') {
                            return (
                              <React.Fragment key={`${st.id}-${sub}`}>
                                {/* 1. Test Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-amber-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={testMax}
                                      value={testObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'testObt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={testMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'testMax', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-amber-50 text-amber-800 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* 2. Paper I Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-blue-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={writMax}
                                      value={writObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-blue-300 rounded py-0.5 bg-white text-blue-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={writMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-600 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* 3. Paper II Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-purple-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={paper2Max}
                                      value={paper2Obt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'paper2Obt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-purple-300 rounded py-0.5 bg-white text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={paper2Max}
                                      onChange={e => handleMatrixChange(st.id, sub, 'paper2Max', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-purple-50 text-purple-800 rounded py-0.5 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* 4. Total Sum Badge */}
                                <td className="px-1 py-1 text-center border-r border-slate-300 bg-slate-50">
                                  <span className={`font-mono font-black text-xs ${cellTotalObt > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {cellTotalObt}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          if (matrixPattern === 'paper-i-ii') {
                            return (
                              <React.Fragment key={`${st.id}-${sub}`}>
                                {/* Paper I Input */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-200 bg-blue-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={writMax}
                                      value={writObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                      className="w-10 text-center font-mono font-bold text-xs border border-blue-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-400 text-[9px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={writMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                                      className="w-8 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-500 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Paper II Input */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-200 bg-purple-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={paper2Max}
                                      value={paper2Obt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'paper2Obt', Number(e.target.value))}
                                      className="w-10 text-center font-mono font-bold text-xs border border-purple-300 rounded py-0.5 bg-white text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                    <span className="text-slate-400 text-[9px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={paper2Max}
                                      onChange={e => handleMatrixChange(st.id, sub, 'paper2Max', Number(e.target.value))}
                                      className="w-8 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-purple-50 text-purple-700 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Total Badge */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-300 bg-slate-50">
                                  <span className={`font-mono font-black text-xs ${cellTotalObt > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {cellTotalObt}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          if (matrixPattern === 'test-written-oral') {
                            return (
                              <React.Fragment key={`${st.id}-${sub}`}>
                                {/* Test Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-amber-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={testMax}
                                      value={testObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'testObt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-950 focus:outline-none"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={testMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'testMax', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-amber-50 text-amber-800 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Written Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-blue-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={writMax}
                                      value={writObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-blue-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={writMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-500 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Oral Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-teal-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={oralMax}
                                      value={oralObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'oralObt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-teal-300 rounded py-0.5 bg-white text-teal-950 focus:outline-none"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={oralMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'oralMax', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-teal-50 text-teal-700 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Total Badge */}
                                <td className="px-1 py-1 text-center border-r border-slate-300 bg-slate-50">
                                  <span className={`font-mono font-black text-xs ${cellTotalObt > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {cellTotalObt}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          if (matrixPattern === 'written-oral') {
                            return (
                              <React.Fragment key={`${st.id}-${sub}`}>
                                {/* Written Input */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-200 bg-blue-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={writMax}
                                      value={writObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                      className="w-10 text-center font-mono font-bold text-xs border border-slate-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-400 text-[9px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={writMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                                      className="w-8 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-500 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Oral Input */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-200 bg-amber-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={oralMax}
                                      value={oralObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'oralObt', Number(e.target.value))}
                                      className="w-10 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                    <span className="text-slate-400 text-[9px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={oralMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'oralMax', Number(e.target.value))}
                                      className="w-8 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-amber-50 text-amber-700 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Total Sum Badge */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-300 bg-slate-50">
                                  <span className={`font-mono font-black text-xs ${cellTotalObt > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {cellTotalObt}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          if (matrixPattern === 'test-written-prac') {
                            return (
                              <React.Fragment key={`${st.id}-${sub}`}>
                                {/* Test Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-amber-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={testMax}
                                      value={testObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'testObt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-950 focus:outline-none"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={testMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'testMax', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-amber-50 text-amber-800 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Theory Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-blue-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={writMax}
                                      value={writObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-blue-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={writMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-500 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Practical Input */}
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-emerald-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={pracMax}
                                      value={pracObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'pracObt', Number(e.target.value))}
                                      className="w-9 text-center font-mono font-bold text-xs border border-emerald-300 rounded py-0.5 bg-white text-emerald-950 focus:outline-none"
                                    />
                                    <span className="text-slate-400 text-[8px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={pracMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'pracMax', Number(e.target.value))}
                                      className="w-7 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-emerald-50 text-emerald-700 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Total Badge */}
                                <td className="px-1 py-1 text-center border-r border-slate-300 bg-slate-50">
                                  <span className={`font-mono font-black text-xs ${cellTotalObt > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {cellTotalObt}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          if (matrixPattern === 'written-prac') {
                            return (
                              <React.Fragment key={`${st.id}-${sub}`}>
                                {/* Theory Input */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-200 bg-blue-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={writMax}
                                      value={writObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                      className="w-10 text-center font-mono font-bold text-xs border border-blue-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-400 text-[9px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={writMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                                      className="w-8 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-500 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Practical Input */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-200 bg-amber-50/20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={pracMax}
                                      value={pracObt}
                                      onChange={e => handleMatrixChange(st.id, sub, 'pracObt', Number(e.target.value))}
                                      className="w-10 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                    <span className="text-slate-400 text-[9px]">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={pracMax}
                                      onChange={e => handleMatrixChange(st.id, sub, 'pracMax', Number(e.target.value))}
                                      className="w-8 text-center font-mono text-[9px] border border-slate-200 rounded py-0.5 bg-amber-50 text-amber-700 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Total Badge */}
                                <td className="px-1.5 py-1 text-center border-r border-slate-300 bg-slate-50">
                                  <span className={`font-mono font-black text-xs ${cellTotalObt > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {cellTotalObt}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          if (matrixPattern === 'all-composite') {
                            return (
                              <React.Fragment key={`${st.id}-${sub}`}>
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-amber-50/20">
                                  <input
                                    type="number"
                                    min="0"
                                    max={testMax}
                                    value={testObt}
                                    onChange={e => handleMatrixChange(st.id, sub, 'testObt', Number(e.target.value))}
                                    className="w-8 text-center font-mono font-bold text-xs border border-amber-300 rounded py-0.5 bg-white text-amber-900 focus:outline-none"
                                  />
                                </td>
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-blue-50/20">
                                  <input
                                    type="number"
                                    min="0"
                                    max={writMax}
                                    value={writObt}
                                    onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                    className="w-8 text-center font-mono font-bold text-xs border border-blue-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none"
                                  />
                                </td>
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-purple-50/20">
                                  <input
                                    type="number"
                                    min="0"
                                    max={paper2Max}
                                    value={paper2Obt}
                                    onChange={e => handleMatrixChange(st.id, sub, 'paper2Obt', Number(e.target.value))}
                                    className="w-8 text-center font-mono font-bold text-xs border border-purple-300 rounded py-0.5 bg-white text-purple-900 focus:outline-none"
                                  />
                                </td>
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-teal-50/20">
                                  <input
                                    type="number"
                                    min="0"
                                    max={oralMax}
                                    value={oralObt}
                                    onChange={e => handleMatrixChange(st.id, sub, 'oralObt', Number(e.target.value))}
                                    className="w-8 text-center font-mono font-bold text-xs border border-teal-300 rounded py-0.5 bg-white text-teal-900 focus:outline-none"
                                  />
                                </td>
                                <td className="px-1 py-1 text-center border-r border-slate-200 bg-emerald-50/20">
                                  <input
                                    type="number"
                                    min="0"
                                    max={pracMax}
                                    value={pracObt}
                                    onChange={e => handleMatrixChange(st.id, sub, 'pracObt', Number(e.target.value))}
                                    className="w-8 text-center font-mono font-bold text-xs border border-emerald-300 rounded py-0.5 bg-white text-emerald-900 focus:outline-none"
                                  />
                                </td>
                                <td className="px-1 py-1 text-center border-r border-slate-300 bg-slate-50">
                                  <span className="font-mono font-black text-xs text-slate-800">
                                    {cellTotalObt}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          // written-only
                          return (
                            <td key={`${st.id}-${sub}`} className="px-2 py-1.5 text-center border-r border-slate-300 bg-slate-50/30">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max={writMax}
                                  value={writObt}
                                  onChange={e => handleMatrixChange(st.id, sub, 'obt', Number(e.target.value))}
                                  className="w-11 text-center font-mono font-bold text-xs border border-slate-300 rounded py-0.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-slate-400 text-[10px]">/</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={writMax}
                                  onChange={e => handleMatrixChange(st.id, sub, 'max', Number(e.target.value))}
                                  className="w-9 text-center font-mono text-[9.5px] border border-slate-200 rounded py-0.5 bg-slate-100 text-slate-600 focus:outline-none"
                                />
                              </div>
                            </td>
                          );
                        })}

                        {/* Student Row Total / Percentage */}
                        <td className="px-2 py-1 text-center bg-slate-100 border-l border-slate-300">
                          <div className="flex flex-col items-center">
                            <span className="font-mono font-bold text-xs text-blue-900">
                              {studentRowTotalObt}
                              <span className="text-[9px] font-normal text-slate-400">/{studentRowTotalMax}</span>
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-600">
                              {studentRowTotalMax > 0 ? `${((studentRowTotalObt / studentRowTotalMax) * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Footer Actions */}
          <div className="flex flex-wrap justify-between items-center border-t border-slate-200 pt-3.5 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 italic">
                * सम्पूर्ण कक्षा के सभी विषयों के अंक एक साथ डेटाबेस में सुरक्षित होंगे।
              </span>
              <button
                type="button"
                onClick={handleClearMatrixMarks}
                className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ग्रिड रीसेट करें</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {isMatrixDraftSaved && (
                <span className="text-xs text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-3 py-1.5 border border-amber-300 rounded-lg shadow-xs">
                  <Check className="w-4 h-4 text-amber-600" />
                  <span>ड्राफ्ट सुरक्षित हो गया!</span>
                </span>
              )}

              {isMatrixSaved && (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 border border-emerald-300 rounded-lg shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>मास्टर ग्रिड के सभी अंक सफलतापूर्वक डेटाबेस में सुरक्षित हो गए!</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveMatrixDraft}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <HardDrive className="w-4 h-4 text-slate-600" />
                <span>Save Draft (ड्राफ्ट सहेजें)</span>
              </button>

              <Button
                type="button"
                onClick={handleSaveMatrixMarks}
                disabled={isMatrixSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isMatrixSaving ? 'सुरक्षित हो रहा है...' : `Save Complete Class Grid (${selectedClass})`}</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: SUBJECT-WISE ANNUAL COMPREHENSIVE LEDGER (TEST + HY + ANNUAL)     */}
      {/* ========================================================================= */}
      {activeMode === 'subject-annual-ledger' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-4">
          {/* Quick Subject Switcher Tabs */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-slate-700 mr-2 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
              विषय चुनें:
            </span>
            {subjects.map(sb => {
              const stat = subjectAnnualStats.find(s => isSameSubject(s.subject, sb));
              const isDone = stat?.isComplete;
              const isSelected = isSameSubject(subject, sb);
              return (
                <button
                  key={sb}
                  type="button"
                  onClick={() => {
                    setSubject(sb);
                    setIsSubjectAnnualSaved(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-300'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{sb}</span>
                  {isDone ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <span className="text-[10px] opacity-75 font-mono">
                      ({stat?.filledStudents || 0}/{stat?.totalStudents || 0})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ⚡ 1-CLICK BULK & MANUAL MAX MARKS TOOLBAR ⚡ */}
          <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 text-white p-4 rounded-xl shadow-xs space-y-3.5 border border-teal-800/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-800/80 rounded-lg text-teal-200 border border-teal-600/50">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-300 flex items-center gap-2">
                    <span>1-क्लिक पूर्णांक व घटक नियंत्रक (Single-Click Max Marks & Pattern Setter)</span>
                    <span className="bg-teal-500/30 text-teal-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                      {selectedClass} • {subject}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    यहाँ से लिखित, मौखिक, प्रैक्टिकल और टेस्ट के पूर्णांक एक क्लिक में सभी छात्रों पर लागू करें।
                  </p>
                </div>
              </div>

              {/* Standard Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 mr-1">मानक टेम्पलेट:</span>
                <button
                  type="button"
                  onClick={() => handleApplyStandardBalancedPreset('standard')}
                  className="px-2.5 py-1 text-[10.5px] font-bold bg-teal-800 hover:bg-teal-700 text-white rounded-md border border-teal-600 transition-all cursor-pointer"
                  title="Test 10 + Written 70 + Oral 20 = 100"
                >
                  📝 सामान्य विषय (10+70+20=100)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStandardBalancedPreset('practical')}
                  className="px-2.5 py-1 text-[10.5px] font-bold bg-emerald-800 hover:bg-emerald-700 text-white rounded-md border border-emerald-600 transition-all cursor-pointer"
                  title="Test 10 + Written 60 + Practical 30 = 100"
                >
                  🧪 प्रायोगिक विषय (10+60+30=100)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStandardBalancedPreset('written-oral-only')}
                  className="px-2.5 py-1 text-[10.5px] font-bold bg-indigo-800 hover:bg-indigo-700 text-white rounded-md border border-indigo-600 transition-all cursor-pointer"
                  title="Written 80 + Oral 20 = 100"
                >
                  📑 लिखित 80 + मौखिक 20
                </button>
              </div>
            </div>

            {/* Component Quick Chips & Number Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pt-1 border-t border-slate-700/60 text-xs">
              {/* 1. Written / Theory Max */}
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-indigo-300 font-bold">
                  <span className="flex items-center gap-1">📝 लिखित (Written / Theory) Max:</span>
                  <span className="font-mono text-white text-xs font-black">{bulkAnnualWrittenMax}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[40, 50, 60, 70, 80, 90, 100].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleApplySubjectAnnualBulkMax('written', v)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        bulkAnnualWrittenMax === v
                          ? 'bg-indigo-500 text-white shadow-xs font-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkAnnualWrittenMax}
                    onChange={e => setBulkAnnualWrittenMax(Number(e.target.value))}
                    className="w-16 text-center text-xs font-mono font-bold bg-slate-900 text-white rounded px-1.5 py-1 border border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplySubjectAnnualBulkMax('written', bulkAnnualWrittenMax)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-1 px-2 rounded transition-all cursor-pointer"
                  >
                    Apply Written Max
                  </button>
                </div>
              </div>

              {/* 2. Oral / Viva Max */}
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-1">🗣️ मौखिक (Oral / Viva) Max:</span>
                  <span className="font-mono text-white text-xs font-black">{bulkAnnualOralMax}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[10, 15, 20, 25, 30, 40].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setShowAnnualOralCols(true);
                        handleApplySubjectAnnualBulkMax('oral', v);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        bulkAnnualOralMax === v && showAnnualOralCols
                          ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bulkAnnualOralMax}
                    onChange={e => setBulkAnnualOralMax(Number(e.target.value))}
                    className="w-16 text-center text-xs font-mono font-bold bg-slate-900 text-white rounded px-1.5 py-1 border border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnualOralCols(true);
                      handleApplySubjectAnnualBulkMax('oral', bulkAnnualOralMax);
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-black py-1 px-2 rounded transition-all cursor-pointer"
                  >
                    Apply Oral Max
                  </button>
                </div>
              </div>

              {/* 3. Practical Max */}
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span className="flex items-center gap-1">🧪 प्रैक्टिकल (Practical) Max:</span>
                  <span className="font-mono text-white text-xs font-black">{bulkAnnualPracMax}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[10, 15, 20, 25, 30, 40, 50].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setShowAnnualPracCols(true);
                        handleApplySubjectAnnualBulkMax('prac', v);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        bulkAnnualPracMax === v && showAnnualPracCols
                          ? 'bg-emerald-500 text-slate-950 shadow-xs font-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bulkAnnualPracMax}
                    onChange={e => setBulkAnnualPracMax(Number(e.target.value))}
                    className="w-16 text-center text-xs font-mono font-bold bg-slate-900 text-white rounded px-1.5 py-1 border border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnualPracCols(true);
                      handleApplySubjectAnnualBulkMax('prac', bulkAnnualPracMax);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-black py-1 px-2 rounded transition-all cursor-pointer"
                  >
                    Apply Practical Max
                  </button>
                </div>
              </div>

              {/* 4. Test Max */}
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-teal-300 font-bold">
                  <span className="flex items-center gap-1">⏱️ टेस्ट (Test) Max:</span>
                  <span className="font-mono text-white text-xs font-black">{bulkAnnualTestMax}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[10, 15, 20, 25, 30].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setShowAnnualTestCols(true);
                        handleApplySubjectAnnualBulkMax('test', v);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        bulkAnnualTestMax === v && showAnnualTestCols
                          ? 'bg-teal-400 text-teal-950 shadow-xs font-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={bulkAnnualTestMax}
                    onChange={e => setBulkAnnualTestMax(Number(e.target.value))}
                    className="w-16 text-center text-xs font-mono font-bold bg-slate-900 text-white rounded px-1.5 py-1 border border-teal-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnualTestCols(true);
                      handleApplySubjectAnnualBulkMax('test', bulkAnnualTestMax);
                    }}
                    className="flex-1 bg-teal-500 hover:bg-teal-400 text-teal-950 text-[11px] font-black py-1 px-2 rounded transition-all cursor-pointer"
                  >
                    Apply Test Max
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom notification & Draft Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-3">
                {subjectAnnualAutoSaveNotice && (
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {subjectAnnualAutoSaveNotice}
                  </span>
                )}
                {isSubjectAnnualDraftSaved && (
                  <span className="text-teal-300 font-bold bg-teal-900/60 px-2 py-0.5 rounded border border-teal-500">
                    ड्राफ्ट स्थानीय रूप से सुरक्षित हो गया!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSubjectAnnualDraft}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded text-xs font-bold border border-slate-600 transition-all flex items-center gap-1 cursor-pointer"
                  title="Save draft locally (सुरक्षित ड्राफ्ट)"
                >
                  <Save className="w-3.5 h-3.5 text-teal-400" />
                  <span>ड्राफ्ट सेव करें (Save Draft)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearSubjectAnnualMarks}
                  className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-3 py-1 rounded text-xs font-bold border border-rose-800 transition-all flex items-center gap-1 cursor-pointer"
                  title="Reset all entered marks for this subject"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>अंक रीसेट (Reset)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Draft Recovery Banner */}
          {subjectAnnualDraftInfo && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold">
                    ⚠️ {subjectAnnualDraftInfo.timestamp} का अहस्तांतरित ड्राफ्ट (Unsaved Draft) उपलब्ध है ({selectedClass} - {subject})!
                  </p>
                  <p className="text-[11px] text-amber-700">
                    सिस्टम बंद होने से पहले का डेटा सुरक्षित है। क्या आप इसे लोड करना चाहते हैं?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreSubjectAnnualDraft}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  ड्राफ्ट पुनः लोड करें (Restore Draft)
                </button>
                <button
                  type="button"
                  onClick={handleDiscardSubjectAnnualDraft}
                  className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  हटाएं (Discard)
                </button>
              </div>
            </div>
          )}

          {/* COMPREHENSIVE DATA TABLE */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Level 1 Super Headers */}
                <tr className="border-b border-slate-300 text-xs font-black uppercase tracking-wider text-center">
                  <th colSpan={4} className="bg-slate-100 text-slate-700 py-2.5 px-3 border-r border-slate-300 text-left sticky left-0 z-20">
                    छात्र विवरण (STUDENT INFO)
                  </th>
                  <th
                    colSpan={(showAnnualTestCols ? 1 : 0) + 1 + (showAnnualOralCols ? 1 : 0) + (showAnnualPracCols ? 1 : 0) + 1}
                    className="bg-blue-900 text-white py-2.5 px-3 border-r border-blue-950 font-bold"
                  >
                    अर्धवार्षिक सत्र (HALF-YEARLY - 100 MARKS)
                  </th>
                  <th
                    colSpan={(showAnnualTestCols ? 1 : 0) + 1 + (showAnnualOralCols ? 1 : 0) + (showAnnualPracCols ? 1 : 0) + 1}
                    className="bg-purple-900 text-white py-2.5 px-3 border-r border-purple-950 font-bold"
                  >
                    वार्षिक सत्र (ANNUAL / YEARLY - 100 MARKS)
                  </th>
                  <th colSpan={3} className="bg-slate-900 text-white py-2.5 px-3 font-bold">
                    वार्षिक महायोग (GRAND TOTAL & GRADE)
                  </th>
                </tr>

                {/* Level 2 Column Headers */}
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-700 border-b border-slate-300 uppercase">
                  {/* Student sticky columns */}
                  <th className="py-2 px-2.5 w-12 text-center border-r border-slate-200 sticky left-0 bg-slate-50 z-20">Roll</th>
                  <th className="py-2 px-3 min-w-[150px] border-r border-slate-200 sticky left-12 bg-slate-50 z-20">Student Name</th>
                  <th className="py-2 px-3 min-w-[130px] border-r border-slate-200 text-slate-500">Father Name</th>
                  <th className="py-2 px-2.5 w-16 text-center border-r-2 border-slate-300 text-slate-400 font-mono">SR No</th>

                  {/* Half-Yearly Sub Columns */}
                  {showAnnualTestCols && (
                    <th className="py-2 px-2 text-center min-w-[90px] bg-blue-50/70 border-r border-blue-200 text-blue-950">
                      HY Test
                    </th>
                  )}
                  <th className="py-2 px-2 text-center min-w-[95px] bg-blue-50/70 border-r border-blue-200 text-blue-950">
                    HY लिखित (Writ)
                  </th>
                  {showAnnualOralCols && (
                    <th className="py-2 px-2 text-center min-w-[90px] bg-amber-50/70 border-r border-amber-200 text-amber-950">
                      HY मौखिक (Oral)
                    </th>
                  )}
                  {showAnnualPracCols && (
                    <th className="py-2 px-2 text-center min-w-[90px] bg-emerald-50/70 border-r border-emerald-200 text-emerald-950">
                      HY प्रैक्टिकल (Prac)
                    </th>
                  )}
                  <th className="py-2 px-2.5 text-center min-w-[85px] bg-blue-100/80 border-r-2 border-slate-300 text-blue-950 font-black">
                    HY कुल (100)
                  </th>

                  {/* Annual Sub Columns */}
                  {showAnnualTestCols && (
                    <th className="py-2 px-2 text-center min-w-[90px] bg-purple-50/70 border-r border-purple-200 text-purple-950">
                      Yearly Test
                    </th>
                  )}
                  <th className="py-2 px-2 text-center min-w-[95px] bg-purple-50/70 border-r border-purple-200 text-purple-950">
                    Yearly लिखित (Writ)
                  </th>
                  {showAnnualOralCols && (
                    <th className="py-2 px-2 text-center min-w-[90px] bg-amber-50/70 border-r border-amber-200 text-amber-950">
                      Yearly मौखिक (Oral)
                    </th>
                  )}
                  {showAnnualPracCols && (
                    <th className="py-2 px-2 text-center min-w-[90px] bg-emerald-50/70 border-r border-emerald-200 text-emerald-950">
                      Yearly प्रैक्टिकल (Prac)
                    </th>
                  )}
                  <th className="py-2 px-2.5 text-center min-w-[85px] bg-purple-100/80 border-r-2 border-slate-300 text-purple-950 font-black">
                    वार्षिक कुल (100)
                  </th>

                  {/* Grand Total & Grade */}
                  <th className="py-2 px-2.5 text-center min-w-[90px] bg-slate-100 border-r border-slate-200 text-slate-900 font-black">
                    Grand Total
                  </th>
                  <th className="py-2 px-2 text-center min-w-[65px] bg-slate-100 border-r border-slate-200 text-slate-900 font-black">
                    %
                  </th>
                  <th className="py-2 px-2.5 text-center min-w-[70px] bg-slate-100 text-slate-900 font-black">
                    Grade
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="text-center py-12 text-slate-400 italic">
                      {selectedClass} में कोई छात्र नहीं मिला।
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="text-center py-10 text-slate-400 italic">
                      खोज परिणाम में कोई छात्र नहीं मिला।
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const row: SubjectAnnualRowMarks = subjectAnnualMarks[st.id] || {
                      hyTestObt: 0, hyTestMax: 10,
                      hyWrittenObt: 0, hyWrittenMax: 70,
                      hyOralObt: 0, hyOralMax: 20,
                      hyPracObt: 0, hyPracMax: 0,
                      yTestObt: 0, yTestMax: 10,
                      yWrittenObt: 0, yWrittenMax: 70,
                      yOralObt: 0, yOralMax: 20,
                      yPracObt: 0, yPracMax: 0,
                    };

                    // Calculations
                    const hyObtTotal = 
                      (showAnnualTestCols ? Number(row.hyTestObt || 0) : 0) +
                      Number(row.hyWrittenObt || 0) +
                      (showAnnualOralCols ? Number(row.hyOralObt || 0) : 0) +
                      (showAnnualPracCols ? Number(row.hyPracObt || 0) : 0);

                    const hyMaxTotal = 
                      (showAnnualTestCols ? Number(row.hyTestMax || 0) : 0) +
                      Number(row.hyWrittenMax || 0) +
                      (showAnnualOralCols ? Number(row.hyOralMax || 0) : 0) +
                      (showAnnualPracCols ? Number(row.hyPracMax || 0) : 0);

                    const yObtTotal = 
                      (showAnnualTestCols ? Number(row.yTestObt || 0) : 0) +
                      Number(row.yWrittenObt || 0) +
                      (showAnnualOralCols ? Number(row.yOralObt || 0) : 0) +
                      (showAnnualPracCols ? Number(row.yPracObt || 0) : 0);

                    const yMaxTotal = 
                      (showAnnualTestCols ? Number(row.yTestMax || 0) : 0) +
                      Number(row.yWrittenMax || 0) +
                      (showAnnualOralCols ? Number(row.yOralMax || 0) : 0) +
                      (showAnnualPracCols ? Number(row.yPracMax || 0) : 0);

                    const grandObt = hyObtTotal + yObtTotal;
                    const grandMax = hyMaxTotal + yMaxTotal;
                    const pct = grandMax > 0 ? (grandObt / grandMax) * 100 : 0;
                    const gradeInfo = getGradeFromPercentage(pct);

                    return (
                      <tr key={st.id} className="hover:bg-teal-50/20 transition-colors group">
                        {/* 1. Roll No */}
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-teal-50/30 z-10">
                          {st.rollNo || idx + 1}
                        </td>

                        {/* 2. Student Name */}
                        <td className="py-2 px-3 font-black text-slate-800 border-r border-slate-200 sticky left-12 bg-white group-hover:bg-teal-50/30 z-10">
                          <div className="flex flex-col">
                            <span>{st.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal md:hidden">
                              {st.fatherName ? `S/o ${st.fatherName}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* 3. Father Name */}
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                          {st.fatherName || '-'}
                        </td>

                        {/* 4. SR No */}
                        <td className="py-2 px-2.5 text-center font-mono text-[10.5px] text-slate-400 border-r-2 border-slate-300">
                          {st.srNo || st.admissionNo || '-'}
                        </td>

                        {/* HALF-YEARLY COLUMNS */}
                        {showAnnualTestCols && (
                          <td className="py-1 px-1.5 text-center bg-blue-50/30 border-r border-blue-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.hyTestMax}
                                value={row.hyTestObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyTestObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold border border-blue-300 rounded p-1 bg-white focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={row.hyTestMax || 10}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyTestMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* HY Written */}
                        <td className="py-1 px-1.5 text-center bg-blue-50/30 border-r border-blue-200">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={row.hyWrittenMax}
                              value={row.hyWrittenObt || ''}
                              placeholder="0"
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'hyWrittenObt', Number(e.target.value))}
                              className="w-12 text-center text-xs font-mono font-black text-blue-900 border border-blue-400 rounded p-1 bg-white focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                            />
                            <span className="text-slate-400 text-[10px]">/</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={row.hyWrittenMax || 70}
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'hyWrittenMax', Number(e.target.value))}
                              className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                              title="Written Max Marks"
                            />
                          </div>
                        </td>

                        {/* HY Oral */}
                        {showAnnualOralCols && (
                          <td className="py-1 px-1.5 text-center bg-amber-50/30 border-r border-amber-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.hyOralMax}
                                value={row.hyOralObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyOralObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold text-amber-900 border border-amber-300 rounded p-1 bg-white focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.hyOralMax || 20}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyOralMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Oral Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* HY Practical */}
                        {showAnnualPracCols && (
                          <td className="py-1 px-1.5 text-center bg-emerald-50/30 border-r border-emerald-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.hyPracMax}
                                value={row.hyPracObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyPracObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold text-emerald-900 border border-emerald-300 rounded p-1 bg-white focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.hyPracMax || 0}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyPracMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Practical Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* HY Total */}
                        <td className="py-1 px-2.5 text-center bg-blue-100/50 border-r-2 border-slate-300 font-mono font-black text-blue-950">
                          <span>{hyObtTotal}</span>
                          <span className="text-[10px] text-blue-600 font-normal"> / {hyMaxTotal}</span>
                        </td>

                        {/* ANNUAL / YEARLY COLUMNS */}
                        {showAnnualTestCols && (
                          <td className="py-1 px-1.5 text-center bg-purple-50/30 border-r border-purple-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.yTestMax}
                                value={row.yTestObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yTestObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold border border-purple-300 rounded p-1 bg-white focus:bg-purple-50 focus:ring-1 focus:ring-purple-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={row.yTestMax || 10}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yTestMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Yearly Test Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* Yearly Written */}
                        <td className="py-1 px-1.5 text-center bg-purple-50/30 border-r border-purple-200">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={row.yWrittenMax}
                              value={row.yWrittenObt || ''}
                              placeholder="0"
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'yWrittenObt', Number(e.target.value))}
                              className="w-12 text-center text-xs font-mono font-black text-purple-900 border border-purple-400 rounded p-1 bg-white focus:bg-purple-50 focus:ring-1 focus:ring-purple-500 shadow-2xs"
                            />
                            <span className="text-slate-400 text-[10px]">/</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={row.yWrittenMax || 70}
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'yWrittenMax', Number(e.target.value))}
                              className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                              title="Yearly Written Max Marks"
                            />
                          </div>
                        </td>

                        {/* Yearly Oral */}
                        {showAnnualOralCols && (
                          <td className="py-1 px-1.5 text-center bg-amber-50/30 border-r border-amber-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.yOralMax}
                                value={row.yOralObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yOralObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold text-amber-900 border border-amber-300 rounded p-1 bg-white focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.yOralMax || 20}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yOralMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Yearly Oral Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* Yearly Practical */}
                        {showAnnualPracCols && (
                          <td className="py-1 px-1.5 text-center bg-emerald-50/30 border-r border-emerald-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.yPracMax}
                                value={row.yPracObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yPracObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold text-emerald-900 border border-emerald-300 rounded p-1 bg-white focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.yPracMax || 0}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yPracMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Yearly Practical Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* Yearly Total */}
                        <td className="py-1 px-2.5 text-center bg-purple-100/50 border-r-2 border-slate-300 font-mono font-black text-purple-950">
                          <span>{yObtTotal}</span>
                          <span className="text-[10px] text-purple-600 font-normal"> / {yMaxTotal}</span>
                        </td>

                        {/* GRAND TOTAL */}
                        <td className="py-1 px-2.5 text-center bg-slate-50 font-mono font-black text-slate-900 border-r border-slate-200">
                          <span>{grandObt}</span>
                          <span className="text-[10px] text-slate-400 font-normal"> / {grandMax}</span>
                        </td>

                        {/* PERCENTAGE */}
                        <td className="py-1 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                          {pct.toFixed(1)}%
                        </td>

                        {/* GRADE */}
                        <td className="py-1 px-2 text-center">
                          <span className={`text-[10.5px] font-black px-2 py-0.5 rounded-md border ${gradeInfo.bg} ${gradeInfo.text}`}>
                            {gradeInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER ACTIONS & SAVE BUTTON */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 font-semibold">
                कुल छात्र: <strong>{classStudents.length}</strong> | पूर्ण अंक भरे: <strong>
                  {classStudents.filter(st => {
                    const r = subjectAnnualMarks[st.id];
                    return r && (r.hyWrittenObt > 0 || r.yWrittenObt > 0);
                  }).length}
                </strong>
              </span>

              {isSubjectAnnualSaved && (
                <span className="text-xs text-emerald-800 font-black flex items-center gap-1.5 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{subject} ({selectedClass}) के सभी वार्षिक अंक सफलतापूर्वक डेटाबेस में सुरक्षित हो गए!</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveSubjectAnnualDraft}
                className="text-xs font-bold px-4 py-2 border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1 text-teal-600" />
                ड्राफ्ट सेव करें
              </Button>

              <Button
                type="button"
                onClick={handleSaveSubjectAnnualMarks}
                disabled={isSubjectAnnualSaving || classStudents.length === 0}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-black px-8 py-2.5 rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSubjectAnnualSaving
                    ? 'सुरक्षित हो रहा है...'
                    : `Save All Annual Marks for ${subject} (${selectedClass})`}
                </span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 5: PRE-PRIMARY & JUNIOR (NURSERY, L.K.G, U.K.G) GRADING HUB          */}
      {/* (NO PRACTICALS - ONLY TEST + WRITTEN + ORAL / FULLY CUSTOM MAX MARKS)     */}
      {/* ========================================================================= */}
      {activeMode === 'pre-primary-junior' && (
        <Card className="p-4 bg-white border border-pink-200 shadow-xs space-y-4">
          {/* 1. Header Banner */}
          <div className="bg-gradient-to-r from-pink-900 via-rose-950 to-purple-950 text-white p-4 rounded-xl shadow-xs border border-pink-700/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-600 rounded-xl text-white shadow-inner flex items-center justify-center text-xl">
                  🎒
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black tracking-wide text-pink-50 flex items-center gap-2">
                      <span>नर्सरी / L.K.G / U.K.G एवं प्राथमिक परीक्षा अंक प्रविष्टि (Pre-Primary Grading Hub)</span>
                    </h3>
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-xs">
                      No Practical • Zero Clutter
                    </span>
                  </div>
                  <p className="text-xs text-pink-200 mt-1 max-w-2xl">
                    छोटे बच्चों की कक्षाओं (Nursery, L.K.G, U.K.G) में प्रैक्टिकल परीक्षा नहीं होती है। यहाँ आप <strong>टेस्ट (Test)</strong>, <strong>लिखित (Written)</strong> और <strong>मौखिक (Oral)</strong> के प्राप्तांक व पूर्णांक (Max Marks) अपनी इच्छानुसार भर सकते हैं।
                  </p>
                </div>
              </div>

              {/* Quick Pre-Primary Class Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-pink-950/80 p-2 rounded-xl border border-pink-800">
                <span className="text-[11px] font-bold text-pink-300 mr-1">कक्षा चुनें:</span>
                {['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3'].map(cl => {
                  const isSel = isSameGrade(selectedClass, cl);
                  return (
                    <button
                      key={cl}
                      type="button"
                      onClick={() => {
                        setSelectedClass(cl);
                        setIsSubjectAnnualSaved(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm ring-2 ring-amber-200'
                          : 'bg-pink-900/90 text-pink-100 hover:bg-pink-800'
                      }`}
                    >
                      {cl === 'Nursery' ? '👶 Nursery' : cl === 'L.K.G' ? '🧸 L.K.G' : cl === 'U.K.G' ? '🎨 U.K.G' : cl}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Quick Subject Selector Bar */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-slate-700 mr-2 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-pink-600" />
              विषय चुनें (Subject):
            </span>
            {subjects.map(sb => {
              const stat = subjectAnnualStats.find(s => isSameSubject(s.subject, sb));
              const isDone = stat?.isComplete;
              const isSelected = isSameSubject(subject, sb);
              return (
                <button
                  key={sb}
                  type="button"
                  onClick={() => {
                    setSubject(sb);
                    setIsSubjectAnnualSaved(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-300'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{sb}</span>
                  {isDone ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <span className="text-[10px] opacity-75 font-mono">
                      ({stat?.filledStudents || 0}/{stat?.totalStudents || 0})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. Manual Max Marks Customizer & Preset Hub */}
          <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 text-white p-3.5 rounded-xl shadow-xs border border-pink-800/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-900/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pink-400" />
                <h4 className="text-xs font-black uppercase tracking-wide text-pink-200">
                  पूर्णांक सेटिंग हब (School Custom Max Marks Controller)
                </h4>
                <span className="bg-pink-500/30 text-pink-200 text-[10px] px-2 py-0.5 rounded border border-pink-400/30 font-bold">
                  {selectedClass} • {subject}
                </span>
              </div>

              {/* Live Scheme Calculation Pill */}
              <div className="bg-pink-950/90 px-3 py-1 rounded-lg border border-pink-700/60 text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
                <span>📐 योजना:</span>
                <span>
                  {showAnnualTestCols ? bulkAnnualTestMax : 0} (Test) + {bulkAnnualWrittenMax} (Written) + {showAnnualOralCols ? bulkAnnualOralMax : 0} (Oral) = <strong>{(showAnnualTestCols ? bulkAnnualTestMax : 0) + bulkAnnualWrittenMax + (showAnnualOralCols ? bulkAnnualOralMax : 0)} प्रति सत्र</strong>
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-emerald-300">
                  वार्षिक कुल: {((showAnnualTestCols ? bulkAnnualTestMax : 0) + bulkAnnualWrittenMax + (showAnnualOralCols ? bulkAnnualOralMax : 0)) * 2}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Manual Number Inputs */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Test Max Input */}
                <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 px-2.5 rounded-lg border border-slate-700">
                  <span className="text-[11px] font-bold text-pink-200">📝 Test Max:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bulkAnnualTestMax}
                    onChange={e => handleApplySubjectAnnualBulkMax('test', Number(e.target.value))}
                    className="w-12 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded py-1 border border-pink-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    {[0, 10, 15, 20].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          if (v === 0) {
                            setShowAnnualTestCols(false);
                            handleApplySubjectAnnualBulkMax('test', 0);
                          } else {
                            setShowAnnualTestCols(true);
                            handleApplySubjectAnnualBulkMax('test', v);
                          }
                        }}
                        className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded transition-all cursor-pointer ${
                          bulkAnnualTestMax === v
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {v === 0 ? 'No Test' : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Written Max Input */}
                <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 px-2.5 rounded-lg border border-slate-700">
                  <span className="text-[11px] font-bold text-blue-200">✍️ Written Max:</span>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={bulkAnnualWrittenMax}
                    onChange={e => handleApplySubjectAnnualBulkMax('written', Number(e.target.value))}
                    className="w-12 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded py-1 border border-blue-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    {[40, 50, 60, 70, 80, 100].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleApplySubjectAnnualBulkMax('written', v)}
                        className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded transition-all cursor-pointer ${
                          bulkAnnualWrittenMax === v
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Oral Max Input */}
                <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 px-2.5 rounded-lg border border-slate-700">
                  <span className="text-[11px] font-bold text-amber-200">🗣️ Oral / मौखिक Max:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bulkAnnualOralMax}
                    onChange={e => handleApplySubjectAnnualBulkMax('oral', Number(e.target.value))}
                    className="w-12 text-center text-xs font-mono font-bold bg-white text-slate-900 rounded py-1 border border-amber-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    {[10, 20, 30, 40, 50].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setShowAnnualOralCols(true);
                          handleApplySubjectAnnualBulkMax('oral', v);
                        }}
                        className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded transition-all cursor-pointer ${
                          bulkAnnualOralMax === v
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sync toggle & Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold cursor-pointer bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={syncHyAnnualMax}
                    onChange={e => setSyncHyAnnualMax(e.target.checked)}
                    className="w-3.5 h-3.5 text-pink-600 rounded"
                  />
                  <span>Sync HY & Yearly</span>
                </label>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnualTestCols(true);
                      setShowAnnualOralCols(true);
                      setShowAnnualPracCols(false);
                      handleApplySubjectAnnualBulkMax('test', 10);
                      handleApplySubjectAnnualBulkMax('written', 70);
                      handleApplySubjectAnnualBulkMax('oral', 20);
                    }}
                    className="px-2 py-1 text-[10.5px] font-bold rounded bg-pink-800 hover:bg-pink-700 text-pink-100 border border-pink-600 transition-all cursor-pointer"
                    title="10 Test + 70 Written + 20 Oral = 100"
                  >
                    10T + 70W + 20O
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnualTestCols(true);
                      setShowAnnualOralCols(true);
                      setShowAnnualPracCols(false);
                      handleApplySubjectAnnualBulkMax('test', 10);
                      handleApplySubjectAnnualBulkMax('written', 50);
                      handleApplySubjectAnnualBulkMax('oral', 40);
                    }}
                    className="px-2 py-1 text-[10.5px] font-bold rounded bg-purple-800 hover:bg-purple-700 text-purple-100 border border-purple-600 transition-all cursor-pointer"
                    title="10 Test + 50 Written + 40 Oral = 100 (Primary/Nursery Scheme)"
                  >
                    10T + 50W + 40O
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnualTestCols(false);
                      setShowAnnualOralCols(true);
                      setShowAnnualPracCols(false);
                      handleApplySubjectAnnualBulkMax('test', 0);
                      handleApplySubjectAnnualBulkMax('written', 50);
                      handleApplySubjectAnnualBulkMax('oral', 50);
                    }}
                    className="px-2 py-1 text-[10.5px] font-bold rounded bg-amber-800 hover:bg-amber-700 text-amber-100 border border-amber-600 transition-all cursor-pointer"
                    title="50 Written + 50 Oral = 100 (50-50 Scheme)"
                  >
                    50W + 50O (No Test)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Student Marks Entry Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead className="bg-slate-900 text-white font-bold sticky top-0 z-20 shadow-xs">
                <tr>
                  <th rowSpan={2} className="py-2 px-2 text-center w-12 border-r border-slate-700">
                    रोल नं
                  </th>
                  <th rowSpan={2} className="py-2 px-3 border-r border-slate-700 min-w-[180px]">
                    छात्र विवरण (Student Info)
                  </th>
                  <th colSpan={(showAnnualTestCols ? 1 : 0) + 1 + (showAnnualOralCols ? 1 : 0) + 1} className="py-1 px-2 text-center bg-blue-900/90 border-r border-slate-700 text-blue-100">
                    अर्धवार्षिक सत्र (Half-Yearly Exam)
                  </th>
                  <th colSpan={(showAnnualTestCols ? 1 : 0) + 1 + (showAnnualOralCols ? 1 : 0) + 1} className="py-1 px-2 text-center bg-purple-900/90 border-r border-slate-700 text-purple-100">
                    वार्षिक सत्र (Annual Exam)
                  </th>
                  <th colSpan={3} className="py-1 px-2 text-center bg-slate-800 text-slate-100">
                    महायोग व ग्रेड (Grand Total)
                  </th>
                </tr>
                <tr className="text-[11px] font-semibold bg-slate-800 text-slate-200">
                  {/* HY columns */}
                  {showAnnualTestCols && (
                    <th className="py-1 px-1.5 text-center bg-blue-950 text-blue-200 border-r border-slate-700">
                      Test ({bulkAnnualTestMax})
                    </th>
                  )}
                  <th className="py-1 px-1.5 text-center bg-blue-950 text-blue-100 border-r border-slate-700">
                    लिखित ({bulkAnnualWrittenMax})
                  </th>
                  {showAnnualOralCols && (
                    <th className="py-1 px-1.5 text-center bg-blue-950 text-amber-200 border-r border-slate-700">
                      मौखिक ({bulkAnnualOralMax})
                    </th>
                  )}
                  <th className="py-1 px-2 text-center bg-blue-900 text-white font-bold border-r-2 border-slate-700">
                    HY योग
                  </th>

                  {/* Yearly columns */}
                  {showAnnualTestCols && (
                    <th className="py-1 px-1.5 text-center bg-purple-950 text-purple-200 border-r border-slate-700">
                      Test ({bulkAnnualTestMax})
                    </th>
                  )}
                  <th className="py-1 px-1.5 text-center bg-purple-950 text-purple-100 border-r border-slate-700">
                    लिखित ({bulkAnnualWrittenMax})
                  </th>
                  {showAnnualOralCols && (
                    <th className="py-1 px-1.5 text-center bg-purple-950 text-amber-200 border-r border-slate-700">
                      मौखिक ({bulkAnnualOralMax})
                    </th>
                  )}
                  <th className="py-1 px-2 text-center bg-purple-900 text-white font-bold border-r-2 border-slate-700">
                    वार्षिक योग
                  </th>

                  {/* Grand total columns */}
                  <th className="py-1 px-2 text-center bg-slate-900 text-white font-bold border-r border-slate-700">
                    कुल अंक
                  </th>
                  <th className="py-1 px-2 text-center bg-slate-900 text-amber-300 font-bold border-r border-slate-700">
                    प्रतिशत %
                  </th>
                  <th className="py-1 px-2 text-center bg-slate-900 text-white font-bold">
                    ग्रेड
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-slate-500 font-semibold">
                      {selectedClass} में कोई छात्र नहीं मिले।
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const row = subjectAnnualMarks[st.id] || {
                      hyTestObt: 0, hyTestMax: bulkAnnualTestMax,
                      hyWrittenObt: 0, hyWrittenMax: bulkAnnualWrittenMax,
                      hyOralObt: 0, hyOralMax: bulkAnnualOralMax,
                      hyPracObt: 0, hyPracMax: 0,
                      yTestObt: 0, yTestMax: bulkAnnualTestMax,
                      yWrittenObt: 0, yWrittenMax: bulkAnnualWrittenMax,
                      yOralObt: 0, yOralMax: bulkAnnualOralMax,
                      yPracObt: 0, yPracMax: 0,
                    };

                    const hyObtTotal = (showAnnualTestCols ? (row.hyTestObt || 0) : 0) + (row.hyWrittenObt || 0) + (showAnnualOralCols ? (row.hyOralObt || 0) : 0);
                    const hyMaxTotal = (showAnnualTestCols ? (row.hyTestMax || bulkAnnualTestMax) : 0) + (row.hyWrittenMax || bulkAnnualWrittenMax) + (showAnnualOralCols ? (row.hyOralMax || bulkAnnualOralMax) : 0);

                    const yObtTotal = (showAnnualTestCols ? (row.yTestObt || 0) : 0) + (row.yWrittenObt || 0) + (showAnnualOralCols ? (row.yOralObt || 0) : 0);
                    const yMaxTotal = (showAnnualTestCols ? (row.yTestMax || bulkAnnualTestMax) : 0) + (row.yWrittenMax || bulkAnnualWrittenMax) + (showAnnualOralCols ? (row.yOralMax || bulkAnnualOralMax) : 0);

                    const grandObt = hyObtTotal + yObtTotal;
                    const grandMax = hyMaxTotal + yMaxTotal;
                    const pct = grandMax > 0 ? (grandObt / grandMax) * 100 : 0;
                    const gradeInfo = getGradeFromPercentage(pct);

                    const isFilled = hyObtTotal > 0 || yObtTotal > 0;

                    return (
                      <tr
                        key={st.id}
                        className={`hover:bg-pink-50/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        {/* Roll No */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                          {st.rollNo || idx + 1}
                        </td>

                        {/* Student Name */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{st.name}</span>
                                {st.gender === 'Female' && (
                                  <span className="text-[10px] text-pink-600 font-bold bg-pink-100 px-1 rounded">👧</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {st.fatherName ? `पिता: ${st.fatherName}` : (st.srNo || st.admissionNo ? `SR: ${st.srNo || st.admissionNo}` : '')}
                              </div>
                            </div>
                            {isFilled && (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        </td>

                        {/* HY Test */}
                        {showAnnualTestCols && (
                          <td className="py-1 px-1.5 text-center bg-blue-50/30 border-r border-blue-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.hyTestMax}
                                value={row.hyTestObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyTestObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold border border-blue-300 rounded p-1 bg-white focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={row.hyTestMax || bulkAnnualTestMax}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyTestMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="HY Test Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* HY Written */}
                        <td className="py-1 px-1.5 text-center bg-blue-50/30 border-r border-blue-200">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={row.hyWrittenMax}
                              value={row.hyWrittenObt || ''}
                              placeholder="0"
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'hyWrittenObt', Number(e.target.value))}
                              className="w-12 text-center text-xs font-mono font-black text-blue-900 border border-blue-400 rounded p-1 bg-white focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                            />
                            <span className="text-slate-400 text-[10px]">/</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={row.hyWrittenMax || bulkAnnualWrittenMax}
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'hyWrittenMax', Number(e.target.value))}
                              className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                              title="HY Written Max Marks"
                            />
                          </div>
                        </td>

                        {/* HY Oral */}
                        {showAnnualOralCols && (
                          <td className="py-1 px-1.5 text-center bg-amber-50/30 border-r border-amber-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.hyOralMax}
                                value={row.hyOralObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyOralObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold text-amber-900 border border-amber-300 rounded p-1 bg-white focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.hyOralMax || bulkAnnualOralMax}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'hyOralMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="HY Oral Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* HY Total */}
                        <td className="py-1 px-2.5 text-center bg-blue-100/50 border-r-2 border-slate-300 font-mono font-black text-blue-950">
                          <span>{hyObtTotal}</span>
                          <span className="text-[10px] text-blue-600 font-normal"> / {hyMaxTotal}</span>
                        </td>

                        {/* YEARLY Test */}
                        {showAnnualTestCols && (
                          <td className="py-1 px-1.5 text-center bg-purple-50/30 border-r border-purple-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.yTestMax}
                                value={row.yTestObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yTestObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold border border-purple-300 rounded p-1 bg-white focus:bg-purple-50 focus:ring-1 focus:ring-purple-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={row.yTestMax || bulkAnnualTestMax}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yTestMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Yearly Test Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* YEARLY Written */}
                        <td className="py-1 px-1.5 text-center bg-purple-50/30 border-r border-purple-200">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={row.yWrittenMax}
                              value={row.yWrittenObt || ''}
                              placeholder="0"
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'yWrittenObt', Number(e.target.value))}
                              className="w-12 text-center text-xs font-mono font-black text-purple-900 border border-purple-400 rounded p-1 bg-white focus:bg-purple-50 focus:ring-1 focus:ring-purple-500 shadow-2xs"
                            />
                            <span className="text-slate-400 text-[10px]">/</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={row.yWrittenMax || bulkAnnualWrittenMax}
                              onChange={e => handleSubjectAnnualCellChange(st.id, 'yWrittenMax', Number(e.target.value))}
                              className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                              title="Yearly Written Max Marks"
                            />
                          </div>
                        </td>

                        {/* YEARLY Oral */}
                        {showAnnualOralCols && (
                          <td className="py-1 px-1.5 text-center bg-amber-50/30 border-r border-amber-200">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={row.yOralMax}
                                value={row.yOralObt || ''}
                                placeholder="0"
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yOralObt', Number(e.target.value))}
                                className="w-11 text-center text-xs font-mono font-bold text-amber-900 border border-amber-300 rounded p-1 bg-white focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                              />
                              <span className="text-slate-400 text-[10px]">/</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.yOralMax || bulkAnnualOralMax}
                                onChange={e => handleSubjectAnnualCellChange(st.id, 'yOralMax', Number(e.target.value))}
                                className="w-9 text-center text-[10.5px] font-mono text-slate-500 border border-slate-200 rounded p-1 bg-slate-50 focus:bg-white"
                                title="Yearly Oral Max Marks"
                              />
                            </div>
                          </td>
                        )}

                        {/* Yearly Total */}
                        <td className="py-1 px-2.5 text-center bg-purple-100/50 border-r-2 border-slate-300 font-mono font-black text-purple-950">
                          <span>{yObtTotal}</span>
                          <span className="text-[10px] text-purple-600 font-normal"> / {yMaxTotal}</span>
                        </td>

                        {/* GRAND TOTAL */}
                        <td className="py-1 px-2.5 text-center bg-slate-50 font-mono font-black text-slate-900 border-r border-slate-200">
                          <span>{grandObt}</span>
                          <span className="text-[10px] text-slate-400 font-normal"> / {grandMax}</span>
                        </td>

                        {/* PERCENTAGE */}
                        <td className="py-1 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                          {pct.toFixed(1)}%
                        </td>

                        {/* GRADE */}
                        <td className="py-1 px-2 text-center">
                          <span className={`text-[10.5px] font-black px-2 py-0.5 rounded-md border ${gradeInfo.bg} ${gradeInfo.text}`}>
                            {gradeInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Footer Actions & Save Button */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 font-semibold">
                कुल छात्र: <strong>{classStudents.length}</strong> | पूर्ण अंक भरे: <strong>
                  {classStudents.filter(st => {
                    const r = subjectAnnualMarks[st.id];
                    return r && (r.hyWrittenObt > 0 || r.yWrittenObt > 0);
                  }).length}
                </strong>
              </span>

              {isSubjectAnnualSaved && (
                <span className="text-xs text-emerald-800 font-black flex items-center gap-1.5 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{subject} ({selectedClass}) के सभी वार्षिक अंक सफलतापूर्वक डेटाबेस में सुरक्षित हो गए!</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveSubjectAnnualDraft}
                className="text-xs font-bold px-4 py-2 border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1 text-pink-600" />
                ड्राफ्ट सेव करें
              </Button>

              <Button
                type="button"
                onClick={handleSaveSubjectAnnualMarks}
                disabled={isSubjectAnnualSaving || classStudents.length === 0}
                className="bg-pink-700 hover:bg-pink-800 text-white text-xs font-black px-8 py-2.5 rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSubjectAnnualSaving
                    ? 'सुरक्षित हो रहा है...'
                    : `Save All Marks for ${subject} (${selectedClass})`}
                </span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 6: REPORT CARD ATTENDANCE LEDGER                                      */}
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
