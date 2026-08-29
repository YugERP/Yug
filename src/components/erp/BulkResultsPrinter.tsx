import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type ExamMark } from '../../types';
import { Printer, Search, Award, FileText, ChevronRight, Eye } from 'lucide-react';
import { isSameGrade, normalizeGrade, ALL_STANDARD_CLASSES, isSameSubject, isValidPhotoUrl, isPracticalSubject, isNurseryOrKg, getDefaultSubjectsForGrade } from '../../utils/gradeHelper';
import { type SubjectRowData } from '../reportCard/types';
import { ReportCardStyles } from '../reportCard/ReportCardStyles';
import { ClassicPortraitTemplate } from '../reportCard/ClassicPortraitTemplate';
import { PaperPortraitTemplate } from '../reportCard/PaperPortraitTemplate';
import { LandscapeProTemplate } from '../reportCard/LandscapeProTemplate';
import { PaperLandscapeTemplate } from '../reportCard/PaperLandscapeTemplate';
import { NurseryKgPortraitTemplate } from '../reportCard/NurseryKgPortraitTemplate';
import { NurseryKgLandscapeTemplate } from '../reportCard/NurseryKgLandscapeTemplate';

// Single Report Card Printable Sheet
interface ReportCardSheetProps {
  student: Student;
  selectedTemplate?: 'classic_portrait' | 'paper_i_ii_portrait' | 'landscape_new' | 'paper_i_ii_landscape' | 'nursery_kg' | 'nursery_kg_landscape';
  brandColor: string;
}

function ReportCardPrintSheet({ student, selectedTemplate = 'classic_portrait', brandColor }: ReportCardSheetProps) {
  const { marks, activeAcademicSession, schools, currentUser, attendances, students } = useStore();
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const currentSchool = schools.find(school => school.id === currentUser?.schoolId);
  const sessionToUse = student.academicSession || activeAcademicSession;
  const studentMarks = marks.filter(m => m.studentId === student.id);
  const activePhoto = isValidPhotoUrl(student.photoUrl) ? student.photoUrl : (isValidPhotoUrl(student.docStudentPhoto) ? student.docStudentPhoto : null);

  const defaultSubjects = getDefaultSubjectsForGrade(student.grade);
  
  const studentSubjects = student.subjects && student.subjects.length > 0 
    ? student.subjects 
    : Array.from(new Set([...defaultSubjects, ...studentMarks.map(m => m.subject)]));

  const getGradeFromPercentage = (pct: number): string => {
    if (pct >= 91) return 'A1';
    if (pct >= 81) return 'A2';
    if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2';
    if (pct >= 51) return 'C1';
    if (pct >= 41) return 'C2';
    if (pct >= 33) return 'D';
    return 'E';
  };

  const getRemarkFromPercentage = (pct: number): string => {
    if (pct >= 90) return 'OUTSTANDING';
    if (pct >= 80) return 'EXCELLENT';
    if (pct >= 70) return 'VERY GOOD';
    if (pct >= 50) return 'GOOD';
    if (pct >= 33) return 'SATISFACTORY';
    return 'NEEDS IMPROVEMENT';
  };

  let totalHyTestObt = 0;
  let totalHyExamObt = 0;
  let totalHyPracObt = 0;
  let totalHyMax = 0;
  let totalHyObt = 0;

  let totalYTestObt = 0;
  let totalYExamObt = 0;
  let totalYPracObt = 0;
  let totalYMax = 0;
  let totalYObt = 0;

  let totalFinalMax = 0;
  let totalFinalObt = 0;

  const isSeniorGrade = ['Class 11', 'Class 12', '11th', '12th', '11', '12'].some(c => (student.grade || '').toLowerCase().includes(c.toLowerCase()));

  const subjectRows: SubjectRowData[] = studentSubjects.map(subject => {
    const isGradingOnly = isSeniorGrade && ['p.t.', 'p.t', 'physical education', 'pt', 'games', 'physical & health education'].includes(subject.toLowerCase().trim());
    const isSubjectPractical = isPracticalSubject(subject);

    const hyTest = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Half-Yearly Test');
    const hyExam = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Half-Yearly Exam');
    const hyPrac = studentMarks.find(m => isSameSubject(m.subject, subject) && (m.examType === 'Half-Yearly Practical' || m.examType === 'Practical Exam'));
    const hyOral = studentMarks.find(m => isSameSubject(m.subject, subject) && (m.examType === 'Half-Yearly Oral' || m.examType === 'Oral Exam'));

    const yTest = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Yearly Test');
    const yExam = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Yearly Exam');
    const yPrac = studentMarks.find(m => isSameSubject(m.subject, subject) && (m.examType === 'Yearly Practical' || m.examType === 'Practical Exam'));
    const yOral = studentMarks.find(m => isSameSubject(m.subject, subject) && (m.examType === 'Yearly Oral' || m.examType === 'Oral Exam'));

    // Oral values
    const hyOralVal = (hyExam && (hyExam as any).oralMarks !== undefined)
      ? (hyExam as any).oralMarks
      : (hyOral ? hyOral.marksObtained : 0);
    const hyOralMax = (hyExam && (hyExam as any).oralMaxMarks !== undefined && (hyExam as any).oralMaxMarks > 0)
      ? (hyExam as any).oralMaxMarks
      : (hyOral ? hyOral.maxMarks : 20);
    const hyOralExists = (hyExam && (hyExam as any).oralMarks !== undefined) || !!hyOral || hyOralVal > 0;
    const hasHyOral = hyOralExists || (hyExam && (hyExam as any).oralMaxMarks !== undefined && (hyExam as any).oralMaxMarks > 0);

    const yOralVal = (yExam && (yExam as any).oralMarks !== undefined)
      ? (yExam as any).oralMarks
      : (yOral ? yOral.marksObtained : 0);
    const yOralMax = (yExam && (yExam as any).oralMaxMarks !== undefined && (yExam as any).oralMaxMarks > 0)
      ? (yExam as any).oralMaxMarks
      : (yOral ? yOral.maxMarks : 20);
    const yOralExists = (yExam && (yExam as any).oralMarks !== undefined) || !!yOral || yOralVal > 0;
    const hasYOral = yOralExists || (yExam && (yExam as any).oralMaxMarks !== undefined && (yExam as any).oralMaxMarks > 0);

    // Practical values
    const hyPracVal = (hyExam && hyExam.practicalMarks !== undefined)
      ? hyExam.practicalMarks
      : ((hyExam && (hyExam as any).practicalMarksObtained !== undefined)
          ? (hyExam as any).practicalMarksObtained
          : (hyPrac ? hyPrac.marksObtained : 0));

    const isHyPractical = isSubjectPractical || (hyExam && ((hyExam.practicalMaxMarks && hyExam.practicalMaxMarks > 0) || hyExam.practicalMarks !== undefined || (hyExam as any).practicalMarksObtained !== undefined)) || !!hyPrac;

    const hyPracMax = (hyExam && hyExam.practicalMaxMarks !== undefined && hyExam.practicalMaxMarks > 0)
      ? hyExam.practicalMaxMarks
      : (hyPrac ? hyPrac.maxMarks : (isHyPractical ? 30 : 0));

    const hasHyPracData = (hyExam && (hyExam.practicalMarks !== undefined || (hyExam as any).practicalMarksObtained !== undefined)) || !!hyPrac || (isHyPractical && hyPracVal > 0);
    const hasHyPrac = isHyPractical && (hasHyPracData || hyPracMax > 0);

    // Paper II values (Half-Yearly)
    const hyPaper2Val = (hyExam && (hyExam as any).paper2Marks !== undefined)
      ? (hyExam as any).paper2Marks
      : (hyExam && hyExam.practicalMarks !== undefined && !isSubjectPractical ? hyExam.practicalMarks : 0);
    const hyPaper2Max = (hyExam && (hyExam as any).paper2MaxMarks !== undefined && (hyExam as any).paper2MaxMarks > 0)
      ? (hyExam as any).paper2MaxMarks
      : (hyExam && hyExam.practicalMaxMarks !== undefined && hyExam.practicalMaxMarks > 0
          ? hyExam.practicalMaxMarks
          : 35);
    const hyPaper2Exists = (hyExam && (hyExam as any).paper2Marks !== undefined) || 
      (hyExam && hyExam.practicalMarks !== undefined && !isSubjectPractical);
    const hasHyPaper2 = hyPaper2Exists || (hyExam && (hyExam as any).paper2Marks !== undefined);

    // Yearly Practical & Paper II
    const yPracVal = (yExam && yExam.practicalMarks !== undefined)
      ? yExam.practicalMarks
      : ((yExam && (yExam as any).practicalMarksObtained !== undefined)
          ? (yExam as any).practicalMarksObtained
          : (yPrac ? yPrac.marksObtained : 0));

    const isYPractical = isSubjectPractical || (yExam && ((yExam.practicalMaxMarks && yExam.practicalMaxMarks > 0) || yExam.practicalMarks !== undefined || (yExam as any).practicalMarksObtained !== undefined)) || !!yPrac;

    const yPracMax = (yExam && yExam.practicalMaxMarks !== undefined && yExam.practicalMaxMarks > 0)
      ? yExam.practicalMaxMarks
      : (yPrac ? yPrac.maxMarks : (isYPractical ? 30 : 0));

    const hasYPracData = (yExam && (yExam.practicalMarks !== undefined || (yExam as any).practicalMarksObtained !== undefined)) || !!yPrac || (isYPractical && yPracVal > 0);
    const hasYPrac = isYPractical && (hasYPracData || yPracMax > 0);

    // Paper II values (Yearly)
    const yPaper2Val = (yExam && (yExam as any).paper2Marks !== undefined)
      ? (yExam as any).paper2Marks
      : (yExam && yExam.practicalMarks !== undefined && !isSubjectPractical ? yExam.practicalMarks : 0);
    const yPaper2Max = (yExam && (yExam as any).paper2MaxMarks !== undefined && (yExam as any).paper2MaxMarks > 0)
      ? (yExam as any).paper2MaxMarks
      : (yExam && yExam.practicalMaxMarks !== undefined && yExam.practicalMaxMarks > 0
          ? yExam.practicalMaxMarks
          : 35);
    const yPaper2Exists = (yExam && (yExam as any).paper2Marks !== undefined) || 
      (yExam && yExam.practicalMarks !== undefined && !isSubjectPractical);
    const hasYPaper2 = yPaper2Exists || (yExam && (yExam as any).paper2Marks !== undefined);

    // Written / Theory & Test (Half-Yearly)
    const hyTestVal = hyTest ? hyTest.marksObtained : 0;
    const hyTestMax = hyTest ? (hyTest.maxMarks || 10) : 10;
    const hyExamVal = hyExam ? hyExam.marksObtained : 0;
    let defaultHyTheoryMax = isHyPractical ? (hyPracMax === 30 ? 60 : Math.max(0, 100 - hyTestMax - hyPracMax - (hasHyOral ? hyOralMax : 0))) : (hasHyOral ? Math.max(0, 90 - hyOralMax) : (hasHyPaper2 ? 35 : 90));
    let hyExamMax = hyExam ? (hyExam.maxMarks ?? defaultHyTheoryMax) : defaultHyTheoryMax;
    if ((isHyPractical || hasHyOral) && (hyPracMax > 0 || hyOralMax > 0) && hyExamMax + (isHyPractical ? hyPracMax : 0) + (hasHyOral ? hyOralMax : 0) + hyTestMax > 100 && hyExamMax >= 70) {
      hyExamMax = Math.max(0, 100 - hyTestMax - (isHyPractical ? hyPracMax : 0) - (hasHyOral ? hyOralMax : 0));
    }

    const hasHy = !!(hyTest || hyExam || hyPrac || hyOral || (hyExam && ((hyExam as any).oralMarks !== undefined || hyExam.practicalMarks !== undefined || (hyExam as any).paper2Marks !== undefined)));
    
    let hyMax = (hyTest ? hyTestMax : (hasHy ? hyTestMax : 0)) + (hyExam ? hyExamMax : (hasHy ? hyExamMax : 0));
    let hyObt = (hyTest ? hyTestVal : 0) + (hyExam ? hyExamVal : 0);

    if (hasHyPaper2 && !isSubjectPractical) {
      hyMax += hyPaper2Max;
      hyObt += hyPaper2Val;
    } else if (isHyPractical) {
      hyMax += hyPracMax;
      hyObt += hyPracVal;
    }

    if (hasHyOral) {
      hyMax += hyOralMax;
      hyObt += hyOralVal;
    }

    // Written / Theory & Test (Yearly)
    const yTestVal = yTest ? yTest.marksObtained : 0;
    const yTestMax = yTest ? (yTest.maxMarks || 10) : 10;
    const yExamVal = yExam ? yExam.marksObtained : 0;
    let defaultYTheoryMax = isYPractical ? (yPracMax === 30 ? 60 : Math.max(0, 100 - yTestMax - yPracMax - (hasYOral ? yOralMax : 0))) : (hasYOral ? Math.max(0, 90 - yOralMax) : (hasYPaper2 ? 35 : 90));
    let yExamMax = yExam ? (yExam.maxMarks ?? defaultYTheoryMax) : defaultYTheoryMax;
    if ((isYPractical || hasYOral) && (yPracMax > 0 || yOralMax > 0) && yExamMax + (isYPractical ? yPracMax : 0) + (hasYOral ? yOralMax : 0) + yTestMax > 100 && yExamMax >= 70) {
      yExamMax = Math.max(0, 100 - yTestMax - (isYPractical ? yPracMax : 0) - (hasYOral ? yOralMax : 0));
    }

    const hasY = !!(yTest || yExam || yPrac || yOral || (yExam && ((yExam as any).oralMarks !== undefined || yExam.practicalMarks !== undefined || (yExam as any).paper2Marks !== undefined)));
    
    let yMax = (yTest ? yTestMax : (hasY ? yTestMax : 0)) + (yExam ? yExamMax : (hasY ? yExamMax : 0));
    let yObt = (yTest ? yTestVal : 0) + (yExam ? yExamVal : 0);

    if (hasYPaper2 && !isSubjectPractical) {
      yMax += yPaper2Max;
      yObt += yPaper2Val;
    } else if (isYPractical) {
      yMax += yPracMax;
      yObt += yPracVal;
    }

    if (hasYOral) {
      yMax += yOralMax;
      yObt += yOralVal;
    }

    const hasAny = hasHy || hasY;

    // Final total
    const finalMax = (hasHy ? hyMax : 0) + (hasY ? yMax : 0);
    const finalObt = (hasHy ? hyObt : 0) + (hasY ? yObt : 0);

    const percentage = finalMax > 0 ? (finalObt / finalMax) * 100 : 0;
    const grade = finalMax > 0 ? getGradeFromPercentage(percentage) : '-';

    if (!isGradingOnly) {
      if (hasHy) {
        totalHyTestObt += hyTestVal;
        totalHyExamObt += hyExamVal;
        totalHyPracObt += isHyPractical ? hyPracVal : 0;
        totalHyMax += hyMax;
        totalHyObt += hyObt;
      }
      if (hasY) {
        totalYTestObt += yTestVal;
        totalYExamObt += yExamVal;
        totalYPracObt += isYPractical ? yPracVal : 0;
        totalYMax += yMax;
        totalYObt += yObt;
      }
      totalFinalMax += finalMax;
      totalFinalObt += finalObt;
    }

    return {
      subject,
      isGradingOnly,
      isSubjectPractical,
      hasHy,
      hasY,
      hasAny,
      hasHyOral,
      hasYOral,
      hasHyPrac,
      hasYPrac,
      hasHyPaper2,
      hasYPaper2,
      hyTestVal,
      hyExamVal,
      hyPaper2Val,
      hyOralVal,
      hyPracVal,
      hyTestMax,
      hyExamMax,
      hyPaper2Max,
      hyOralMax,
      hyPracMax,
      hyMax,
      hyObt,
      yTestVal,
      yExamVal,
      yPaper2Val,
      yOralVal,
      yPracVal,
      yTestMax,
      yExamMax,
      yPaper2Max,
      yOralMax,
      yPracMax,
      yMax,
      yObt,
      finalMax,
      finalObt,
      grade,
      hyTestExists: !!hyTest,
      hyExamExists: !!hyExam,
      hyPaper2Exists,
      hyOralExists,
      hyPracExists: hasHyPracData,
      yTestExists: !!yTest,
      yExamExists: !!yExam,
      yPaper2Exists,
      yOralExists,
      yPracExists: hasYPracData,
    };
  });

  const overallPercentage = totalFinalMax > 0 ? (totalFinalObt / totalFinalMax) * 100 : 0;
  const overallGrade = totalFinalMax > 0 ? getGradeFromPercentage(overallPercentage) : 'E';
  const remark = totalFinalMax > 0 ? getRemarkFromPercentage(overallPercentage) : 'NEEDS IMPROVEMENT';
  const passed = overallPercentage >= 33;

  const rank = (() => {
    const classStudents = students.filter(s => !s.isDeleted && isSameGrade(s.grade, student.grade) && (!s.schoolId || !student.schoolId || s.schoolId === student.schoolId));
    if (classStudents.length <= 1) return '1 / 1';
    
    const scores = classStudents.map(s => {
      const sMarks = marks.filter(m => m.studentId === s.id);
      const totalObt = sMarks.reduce((sum, m) => sum + m.marksObtained, 0);
      return { studentId: s.id, totalObt };
    });
    
    scores.sort((a, b) => b.totalObt - a.totalObt);
    const myIndex = scores.findIndex(item => item.studentId === student.id);
    return myIndex !== -1 ? `${myIndex + 1} / ${classStudents.length}` : '-';
  })();

  const studentAttendance = attendances.filter(a => a.studentId === student.id || a.userId === student.id);
  const totalPresent = (student.reportCardPresentDays !== undefined && student.reportCardPresentDays !== null)
    ? student.reportCardPresentDays
    : (studentAttendance.length > 0 ? studentAttendance.filter(a => a.status === 'Present').length : 194);
  const totalDays = (student.reportCardTotalDays !== undefined && student.reportCardTotalDays !== null)
    ? student.reportCardTotalDays
    : (studentAttendance.length > 0 ? studentAttendance.length : 220);
  const attendanceString = `${totalPresent} / ${totalDays}`;

  const isLandscape = selectedTemplate === 'landscape_new' || selectedTemplate === 'paper_i_ii_landscape' || selectedTemplate === 'nursery_kg_landscape';

  const commonProps = {
    student,
    currentSchool,
    sessionToUse,
    subjectRows,
    totalHyMax,
    totalHyObt,
    totalYMax,
    totalYObt,
    totalFinalMax,
    totalFinalObt,
    overallPercentage,
    overallGrade,
    remark,
    passed,
    rank,
    attendanceString,
    activePhoto,
    photoLoadError,
    setPhotoLoadError,
    allowEditPhoto: false,
  };

  return (
    <div 
      className={`report-card-container print-container bg-white traditional-border border-[5px] border-double border-[#002060] ${isLandscape ? 'p-3 sm:p-4' : 'p-5 sm:p-6'} m-0 sm:m-2 rounded-xl shadow-lg relative overflow-hidden`}
      style={{ '--rc-color': brandColor } as React.CSSProperties}
    >
      {selectedTemplate === 'classic_portrait' && (
        <ClassicPortraitTemplate {...commonProps} />
      )}

      {selectedTemplate === 'paper_i_ii_portrait' && (
        <PaperPortraitTemplate {...commonProps} />
      )}

      {selectedTemplate === 'landscape_new' && (
        <LandscapeProTemplate {...commonProps} />
      )}

      {selectedTemplate === 'paper_i_ii_landscape' && (
        <PaperLandscapeTemplate {...commonProps} />
      )}

      {selectedTemplate === 'nursery_kg' && (
        <NurseryKgPortraitTemplate {...commonProps} />
      )}

      {selectedTemplate === 'nursery_kg_landscape' && (
        <NurseryKgLandscapeTemplate {...commonProps} />
      )}
    </div>
  );
}

export function BulkResultsPrinter() {
  const { students, updateStudent, schools, currentUser, updateSchool } = useStore();
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [printType, setPrintType] = useState<'all' | 'single'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'classic_portrait' | 'paper_i_ii_portrait' | 'landscape_new' | 'paper_i_ii_landscape' | 'nursery_kg' | 'nursery_kg_landscape'>('classic_portrait');

  const currentSchool = schools.find(school => school.id === currentUser?.schoolId);
  const brandColor = currentSchool?.reportCardColor || '#002060';

  const colorOptions = [
    { name: 'Classic Navy Blue', value: '#002060' },
    { name: 'Royal Blue', value: '#1e3a8a' },
    { name: 'Forest Green', value: '#065f46' },
    { name: 'Deep Crimson Red', value: '#991b1b' },
    { name: 'Plum Purple', value: '#5b21b6' },
    { name: 'Teal Green', value: '#0f766e' },
    { name: 'Maroon Red', value: '#800000' },
    { name: 'Charcoal Black', value: '#374151' }
  ];

  const existingGrades = Array.from(new Set(students.filter(s => !s.isDeleted).map(s => normalizeGrade(s.grade))));
  const classes = Array.from(new Set([...ALL_STANDARD_CLASSES, ...existingGrades]));

  const classStudents = students.filter(s => !s.isDeleted && (s.grade === selectedClass || isSameGrade(s.grade, selectedClass))).sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));

  const handlePrint = () => {
    window.print();
  };

  // Determine students to render
  const studentsToPrint = printType === 'all' 
    ? classStudents 
    : classStudents.filter(s => s.id === selectedStudentId);

  const isLandscape = selectedTemplate === 'landscape_new' || selectedTemplate === 'paper_i_ii_landscape' || selectedTemplate === 'nursery_kg_landscape';

  return (
    <div className="space-y-6">
      <ReportCardStyles isLandscape={isLandscape} brandColor={brandColor} />

      {/* Control Panel (Hidden when printing) */}
      <Card className="p-4 bg-slate-50 border border-slate-200 flex flex-wrap gap-4 items-end no-print">
        <div className="flex-1 min-w-[150px]">
          <Label>Select Class</Label>
          <Input 
            as="select" 
            value={selectedClass} 
            onChange={e => {
              const val = e.target.value;
              setSelectedClass(val);
              setSelectedStudentId('');
              if (isNurseryOrKg(val)) {
                setSelectedTemplate('nursery_kg');
              }
            }}
          >
            {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
          </Input>
        </div>

        <div className="flex-1 min-w-[150px]">
          <Label>Select Template</Label>
          <Input 
            as="select" 
            value={selectedTemplate} 
            onChange={async (e) => {
              const val = e.target.value as any;
              setSelectedTemplate(val);
              
              try {
                if (printType === 'single' && selectedStudentId) {
                  await updateStudent(selectedStudentId, { reportCardTemplate: val });
                } else if (printType === 'all') {
                  for (const st of classStudents) {
                    await updateStudent(st.id, { reportCardTemplate: val });
                  }
                }
              } catch (err) {
                console.error('Error updating student template preference in bulk:', err);
              }
            }}
          >
            <option value="classic_portrait">Classic Portrait (Writ / Prac)</option>
            <option value="landscape_new">Landscape Pro (Writ / Prac)</option>
            <option value="paper_i_ii_portrait">Paper I &amp; II (Portrait)</option>
            <option value="paper_i_ii_landscape">Paper I &amp; II (Landscape A4)</option>
            <option value="nursery_kg">Nursery / KG (Portrait)</option>
            <option value="nursery_kg_landscape">Nursery / KG (Landscape A4)</option>
          </Input>
        </div>

        <div className="flex-1 min-w-[150px]">
          <Label>Select Theme Color</Label>
          <Input 
            as="select" 
            value={brandColor} 
            onChange={async (e) => {
              const val = e.target.value;
              if (currentSchool?.id) {
                try {
                  await updateSchool(currentSchool.id, { reportCardColor: val });
                } catch (err) {
                  console.error('Error updating school report card color:', err);
                }
              }
            }}
          >
            {colorOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.name}</option>
            ))}
          </Input>
        </div>

        <div className="flex-1 min-w-[150px]">
          <Label>Printing Option</Label>
          <Input 
            as="select" 
            value={printType} 
            onChange={e => {
              setPrintType(e.target.value as 'all' | 'single');
              setSelectedStudentId('');
            }}
          >
            <option value="all">Print All Students (Bulk)</option>
            <option value="single">Print Single Student</option>
          </Input>
        </div>

        {printType === 'single' && (
          <div className="flex-1 min-w-[200px]">
            <Label>Select Student</Label>
            <Input 
              as="select" 
              value={selectedStudentId} 
              onChange={async (e) => {
                const sId = e.target.value;
                setSelectedStudentId(sId);
                const targetStudent = classStudents.find(s => s.id === sId);
                if (targetStudent?.reportCardTemplate) {
                  setSelectedTemplate(targetStudent.reportCardTemplate);
                }
              }}
            >
              <option value="">-- Choose Student --</option>
              {classStudents.map(st => (
                <option key={st.id} value={st.id}>Roll {st.rollNo || '-'}: {st.name}</option>
              ))}
            </Input>
          </div>
        )}

        <div className="shrink-0">
          <Button 
            onClick={handlePrint}
            disabled={studentsToPrint.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-6 py-2 shadow-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report Cards ({studentsToPrint.length})</span>
          </Button>
        </div>
      </Card>

      {/* Preview Header (Hidden when printing) */}
      <div className="no-print flex justify-between items-center border-b border-slate-150 pb-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
          <Award className="w-4 h-4 text-indigo-600" />
          Report Card Print Preview ({selectedClass})
        </h3>
        {printType === 'all' && (
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100">
            Bulk Mode: Prints {studentsToPrint.length} cards continuously with page breaks
          </span>
        )}
      </div>

      {/* Main Container */}
      <div id="printable-bulk-results" className="space-y-8 print:space-y-0">
        {studentsToPrint.length === 0 ? (
          <div className="no-print text-center py-12 text-slate-400 italic bg-white border rounded">
            {printType === 'single' && !selectedStudentId 
              ? 'Please select a student from the dropdown list to preview their report card.'
              : `No students enrolled in ${selectedClass} yet.`}
          </div>
        ) : (
          studentsToPrint.map(student => (
            <div key={student.id} className="print-card-wrapper bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm print:bg-white print:border-none print:shadow-none print:p-0">
              {/* Optional tag showing which student this is in the preview list */}
              <div className="no-print mb-3 flex justify-between items-center bg-indigo-50/60 p-2.5 rounded border border-indigo-100 text-xs text-indigo-900 font-sans font-semibold">
                <span className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
                  Roll {student.rollNo || '-'}: {student.name}
                </span>
                <span className="text-[10px] text-slate-500 uppercase">A4 Printable Page</span>
              </div>
              
              <ReportCardPrintSheet student={student} selectedTemplate={selectedTemplate} brandColor={brandColor} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
