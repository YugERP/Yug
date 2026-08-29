import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type ExamMark } from '../../types';
import { Printer, Search, Award, FileText, ChevronRight, Eye } from 'lucide-react';
import { isSameGrade, normalizeGrade, ALL_STANDARD_CLASSES, isSameSubject, isValidPhotoUrl, isPracticalSubject, isNurseryOrKg } from '../../utils/gradeHelper';
import { type SubjectRowData } from '../reportCard/types';
import { ClassicPortraitTemplate } from '../reportCard/ClassicPortraitTemplate';
import { LandscapeProTemplate } from '../reportCard/LandscapeProTemplate';
import { NurseryKgPortraitTemplate } from '../reportCard/NurseryKgPortraitTemplate';
import { NurseryKgLandscapeTemplate } from '../reportCard/NurseryKgLandscapeTemplate';

// Single Report Card Printable Sheet
interface ReportCardSheetProps {
  student: Student;
  selectedTemplate?: 'classic_portrait' | 'landscape_new' | 'nursery_kg' | 'nursery_kg_landscape';
  brandColor: string;
}

function ReportCardPrintSheet({ student, selectedTemplate = 'classic_portrait', brandColor }: ReportCardSheetProps) {
  const { marks, activeAcademicSession, schools, currentUser, attendances, students } = useStore();
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const currentSchool = schools.find(school => school.id === currentUser?.schoolId);
  const sessionToUse = student.academicSession || activeAcademicSession;
  const studentMarks = marks.filter(m => m.studentId === student.id);
  const activePhoto = isValidPhotoUrl(student.photoUrl) ? student.photoUrl : (isValidPhotoUrl(student.docStudentPhoto) ? student.docStudentPhoto : null);

  const defaultSubjects = [
    'Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 
    'Drawing', 'G.K Moral', 'Reasoning', 'P.T.', 'Sanskrit', 'Computer Science'
  ];
  
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
    const hyPrac = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Half-Yearly Practical');

    const yTest = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Yearly Test');
    const yExam = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Yearly Exam');
    const yPrac = studentMarks.find(m => isSameSubject(m.subject, subject) && m.examType === 'Yearly Practical');

    const hasHy = !!(hyTest || hyExam || hyPrac);
    const hasY = !!(yTest || yExam || yPrac);
    const hasAny = hasHy || hasY;

    // Half-yearly values
    const hyTestVal = hyTest ? hyTest.marksObtained : 0;
    const hyTestMax = hyTest ? hyTest.maxMarks : 10;

    const isHyPractical = isSubjectPractical || (hyExam && hyExam.practicalMaxMarks && hyExam.practicalMaxMarks > 0) || !!hyPrac;
    const hyExamVal = hyExam ? hyExam.marksObtained : 0;
    const defaultHyTheoryMax = isHyPractical ? 60 : 90;
    const hyExamMax = hyExam ? (hyExam.maxMarks ?? defaultHyTheoryMax) : defaultHyTheoryMax;

    const hyPracVal = hyExam && hyExam.practicalMarksObtained !== undefined 
      ? hyExam.practicalMarksObtained 
      : (hyPrac ? hyPrac.marksObtained : 0);
    const hyPracMax = hyExam && hyExam.practicalMaxMarks !== undefined 
      ? hyExam.practicalMaxMarks 
      : (hyPrac ? hyPrac.maxMarks : (isHyPractical ? 30 : 0));

    const hyMax = hyTestMax + hyExamMax + (isHyPractical ? hyPracMax : 0);
    const hyObt = hyTestVal + hyExamVal + (isHyPractical ? hyPracVal : 0);

    // Yearly values
    const yTestVal = yTest ? yTest.marksObtained : 0;
    const yTestMax = yTest ? yTest.maxMarks : 10;

    const isYPractical = isSubjectPractical || (yExam && yExam.practicalMaxMarks && yExam.practicalMaxMarks > 0) || !!yPrac;
    const yExamVal = yExam ? yExam.marksObtained : 0;
    const defaultYTheoryMax = isYPractical ? 60 : 90;
    const yExamMax = yExam ? (yExam.maxMarks ?? defaultYTheoryMax) : defaultYTheoryMax;

    const yPracVal = yExam && yExam.practicalMarksObtained !== undefined 
      ? yExam.practicalMarksObtained 
      : (yPrac ? yPrac.marksObtained : 0);
    const yPracMax = yExam && yExam.practicalMaxMarks !== undefined 
      ? yExam.practicalMaxMarks 
      : (yPrac ? yPrac.maxMarks : (isYPractical ? 30 : 0));

    const yMax = yTestMax + yExamMax + (isYPractical ? yPracMax : 0);
    const yObt = yTestVal + yExamVal + (isYPractical ? yPracVal : 0);

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

    const hasHyPracData = (hyExam && hyExam.practicalMarksObtained !== undefined) || !!hyPrac;
    const hasYPracData = (yExam && yExam.practicalMarksObtained !== undefined) || !!yPrac;

    const hasHyPrac = isHyPractical && (hasHyPracData || (hasHy && hyPracMax > 0));
    const hasYPrac = isYPractical && (hasYPracData || (hasY && yPracMax > 0));

    return {
      subject,
      isGradingOnly,
      isSubjectPractical,
      hasHy,
      hasY,
      hasAny,
      hasHyPrac,
      hasYPrac,
      hyTestVal,
      hyExamVal,
      hyPracVal,
      hyTestMax,
      hyExamMax,
      hyPracMax,
      hyMax,
      hyObt,
      yTestVal,
      yExamVal,
      yPracVal,
      yTestMax,
      yExamMax,
      yPracMax,
      yMax,
      yObt,
      finalMax,
      finalObt,
      grade,
      hyTestExists: !!hyTest,
      hyExamExists: !!hyExam,
      hyPracExists: hasHyPracData,
      yTestExists: !!yTest,
      yExamExists: !!yExam,
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

  const isLandscape = selectedTemplate === 'landscape_new' || selectedTemplate === 'nursery_kg_landscape';

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

      {selectedTemplate === 'landscape_new' && (
        <LandscapeProTemplate {...commonProps} />
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
  const [selectedTemplate, setSelectedTemplate] = useState<'classic_portrait' | 'landscape_new' | 'nursery_kg' | 'nursery_kg_landscape'>('classic_portrait');

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

  const isLandscape = selectedTemplate === 'landscape_new' || selectedTemplate === 'nursery_kg_landscape';

  return (
    <div className="space-y-6">
      {/* Page break CSS inject */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
            margin: 3mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #printable-bulk-results {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            --rc-color: ${brandColor} !important;
          }
 
          .no-print {
            display: none !important;
          }
 
          .print-card-wrapper {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
            max-height: ${isLandscape ? '200mm' : '288mm'} !important;
            position: relative !important;
            overflow: hidden !important;
          }
          
          .print-container {
            border: 5px double var(--rc-color, #002060) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: ${isLandscape ? '3mm 4mm' : '4mm 5mm'} !important;
            background: white !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            max-height: ${isLandscape ? '200mm' : '288mm'} !important;
            margin: 0 auto !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
 
          .traditional-border {
            border: 5px double var(--rc-color, #002060) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: ${isLandscape ? '3mm 4mm' : '4mm 5mm'} !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 auto !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-card-wrapper:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
 
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }
        }

        .report-card-container .text-\\[\\#002060\\] {
          color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-\\[\\#002060\\] {
          border-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .bg-\\[\\#002060\\] {
          background-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .divide-\\[\\#002060\\] > * + * {
          border-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-t-\\[\\#002060\\] {
          border-top-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-b-\\[\\#002060\\] {
          border-bottom-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-r-\\[\\#002060\\] {
          border-right-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-l-\\[\\#002060\\] {
          border-left-color: var(--rc-color, #002060) !important;
        }
        .report-card-container.traditional-border, 
        .report-card-container .traditional-border {
          border: 5px double var(--rc-color, #002060) !important;
        }
        .report-card-container.print-container,
        .report-card-container .print-container {
          border-color: var(--rc-color, #002060) !important;
        }
      `}} />

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
            <option value="classic_portrait">Classic Portrait</option>
            <option value="landscape_new">Landscape Pro (New)</option>
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
