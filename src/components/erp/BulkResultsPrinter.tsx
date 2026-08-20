import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type ExamMark } from '../../types';
import { Printer, Search, Award, FileText, ChevronRight, Eye } from 'lucide-react';

const getSchoolNameStyle = (name: string, template: 'classic_portrait' | 'landscape_new') => {
  const len = name.length;
  let sizeInPx = 28;
  
  if (template === 'classic_portrait') {
    if (len < 20) {
      sizeInPx = 34;
    } else if (len < 30) {
      sizeInPx = 28;
    } else if (len < 40) {
      sizeInPx = 23;
    } else if (len < 50) {
      sizeInPx = 19;
    } else {
      sizeInPx = 16;
    }
  } else {
    // landscape_new is wide, so we can make the school name much larger and prominent
    if (len < 20) {
      sizeInPx = 36;
    } else if (len < 30) {
      sizeInPx = 30;
    } else if (len < 40) {
      sizeInPx = 25;
    } else if (len < 50) {
      sizeInPx = 21;
    } else {
      sizeInPx = 18;
    }
  }
  
  return {
    fontSize: `${sizeInPx}px`,
    lineHeight: '1.2',
  };
};

const getAddressStyle = (address: string, template: 'classic_portrait' | 'landscape_new') => {
  const len = address.length;
  let sizeInPx = 11;
  
  if (template === 'classic_portrait') {
    if (len < 35) {
      sizeInPx = 13;
    } else if (len < 55) {
      sizeInPx = 11;
    } else {
      sizeInPx = 9.5;
    }
  } else {
    if (len < 35) {
      sizeInPx = 11;
    } else if (len < 55) {
      sizeInPx = 9.5;
    } else {
      sizeInPx = 8.5;
    }
  }
  
  return {
    fontSize: `${sizeInPx}px`,
    lineHeight: '1.3',
  };
};

// Single Report Card Printable Sheet
interface ReportCardSheetProps {
  student: Student;
  selectedTemplate?: 'classic_portrait' | 'landscape_new';
}

function ReportCardPrintSheet({ student, selectedTemplate = 'classic_portrait' }: ReportCardSheetProps) {
  const { marks, activeAcademicSession, schools, currentUser, attendances, students } = useStore();

  const currentSchool = schools.find(school => school.id === currentUser?.schoolId);
  const brandColor = currentSchool?.reportCardColor || '#002060';
  const sessionToUse = student.academicSession || activeAcademicSession;
  const studentMarks = marks.filter(m => m.studentId === student.id);

  const defaultSubjects = [
    'Hindi', 'Mathematics', 'English', 'Social Science', 'Science', 
    'Drawing', 'Sanskrit', 'Computer', 'G.K/Moral Science'
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
  let totalHyMax = 0;
  let totalHyObt = 0;

  let totalYTestObt = 0;
  let totalYExamObt = 0;
  let totalYMax = 0;
  let totalYObt = 0;

  let totalFinalMax = 0;
  let totalFinalObt = 0;

  const subjectRows = studentSubjects.map(subject => {
    const hyTest = studentMarks.find(m => m.subject.toLowerCase() === subject.toLowerCase() && m.examType === 'Half-Yearly Test');
    const hyExam = studentMarks.find(m => m.subject.toLowerCase() === subject.toLowerCase() && m.examType === 'Half-Yearly Exam');
    const yTest = studentMarks.find(m => m.subject.toLowerCase() === subject.toLowerCase() && m.examType === 'Yearly Test');
    const yExam = studentMarks.find(m => m.subject.toLowerCase() === subject.toLowerCase() && m.examType === 'Yearly Exam');

    const hasHy = hyTest || hyExam;
    const hasY = yTest || yExam;
    const hasAny = hasHy || hasY;

    const hyTestVal = hyTest ? hyTest.marksObtained : 0;
    const hyExamVal = hyExam ? hyExam.marksObtained : 0;
    const yTestVal = yTest ? yTest.marksObtained : 0;
    const yExamVal = yExam ? yExam.marksObtained : 0;

    const hyTestMax = hyTest ? hyTest.maxMarks : (hasHy ? 10 : 0);
    const hyExamMax = hyExam ? hyExam.maxMarks : (hasHy ? 90 : 0);
    const yTestMax = yTest ? yTest.maxMarks : (hasY ? 10 : 0);
    const yExamMax = yExam ? yExam.maxMarks : (hasY ? 90 : 0);

    const hyObt = hyTestVal + hyExamVal;
    const hyMax = hyTestMax + hyExamMax;

    const yObt = yTestVal + yExamVal;
    const yMax = yTestMax + yExamMax;

    const finalObt = hyObt + yObt;
    const finalMax = hyMax + yMax;

    const percentage = finalMax > 0 ? (finalObt / finalMax) * 100 : 0;
    const grade = hasAny ? getGradeFromPercentage(percentage) : '';

    if (hasHy) {
      totalHyTestObt += hyTestVal;
      totalHyExamObt += hyExamVal;
      totalHyMax += hyMax;
      totalHyObt += hyObt;
    }
    if (hasY) {
      totalYTestObt += yTestVal;
      totalYExamObt += yExamVal;
      totalYMax += yMax;
      totalYObt += yObt;
    }
    totalFinalMax += finalMax;
    totalFinalObt += finalObt;

    return {
      subject,
      hasHy,
      hasY,
      hasAny,
      hyTestVal,
      hyExamVal,
      hyMax,
      hyObt,
      yTestVal,
      yExamVal,
      yMax,
      yObt,
      finalMax,
      finalObt,
      grade,
      hyTestExists: !!hyTest,
      hyExamExists: !!hyExam,
      yTestExists: !!yTest,
      yExamExists: !!yExam,
    };
  });

  const overallPercentage = totalFinalMax > 0 ? (totalFinalObt / totalFinalMax) * 100 : 0;
  const overallGrade = totalFinalMax > 0 ? getGradeFromPercentage(overallPercentage) : 'E';
  const remark = totalFinalMax > 0 ? getRemarkFromPercentage(overallPercentage) : 'NEEDS IMPROVEMENT';
  const passed = overallPercentage >= 33;

  const rank = (() => {
    const classStudents = students.filter(s => s.grade === student.grade && s.schoolId === student.schoolId);
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
  const totalPresent = student.reportCardPresentDays ?? studentAttendance.filter(a => a.status === 'Present').length;
  const totalDays = student.reportCardTotalDays ?? studentAttendance.length;
  const attendanceString = totalDays > 0 ? `${totalPresent} / ${totalDays}` : '194 / 220';

  const displayVal = (exists: boolean, val: number) => exists ? val : '';

  return (
    <div 
      className={`report-card-container print-container bg-white border-[6px] border-double border-[#002060] ${selectedTemplate === 'landscape_new' ? 'p-3 sm:p-4' : 'p-6 sm:p-8'} rounded-xl shadow-md relative overflow-hidden traditional-border font-serif mx-auto max-w-4xl text-slate-900 my-4 print:my-0 print:border-[6px] print:rounded-none print:shadow-none ${selectedTemplate === 'landscape_new' ? 'print:p-4' : 'print:p-8'}`}
      style={{ '--rc-color': brandColor } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{__html: `
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
          border: 6px double var(--rc-color, #002060) !important;
        }
        .report-card-container.print-container,
        .report-card-container .print-container {
          border-color: var(--rc-color, #002060) !important;
        }
      `}} />
      
      {selectedTemplate === 'classic_portrait' ? (
        <>
          {/* Header section with UDISE */}
          <div className="flex justify-end items-center text-[10px] sm:text-[11px] font-black text-[#CC0000] uppercase tracking-wider mb-1">
            <div>UDISE CODE-{currentSchool?.udiseCode || '09040803605'}</div>
          </div>

          {/* School Logo, Name & Address */}
          <div className="flex items-center justify-center gap-4 mb-3">
            {currentSchool?.logo && (
              <img 
                src={currentSchool.logo} 
                alt="School Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0" 
                referrerPolicy="no-referrer"
              />
            )}
            <div className="text-center flex-1">
              <h1 
                style={getSchoolNameStyle(currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL', 'classic_portrait')}
                className="font-black text-[#002060] uppercase tracking-wide leading-tight"
              >
                {currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL'}
              </h1>
              <p 
                style={getAddressStyle(currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001', 'classic_portrait')}
                className="font-bold text-[#002060] uppercase tracking-widest mt-1"
              >
                {currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001'}
              </p>
              <p className="font-bold text-[#002060] text-[9px] sm:text-[10px] uppercase tracking-wider mt-0.5">
                Contact No: {currentSchool?.mobile || '9411833501, 8057283623'}
                {currentSchool?.altMobile ? `, ${currentSchool.altMobile}` : ''}
              </p>
            </div>
            {currentSchool?.logo && <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 hidden sm:block"></div>}
          </div>

          {/* Double decorative horizontal header separator */}
          <div className="border-t-2 border-[#002060] py-0.5 my-2"></div>

          {/* REPORT CARD Pill */}
          <div className="text-center my-2">
            <div className="px-5 py-0.5 bg-[#002060] text-white rounded border-2 border-double border-white text-[13px] sm:text-[14px] font-black tracking-widest uppercase inline-block">
              REPORT CARD
            </div>
          </div>

          {/* Session Text */}
          <p className="text-center text-[#002060] text-[10.5px] sm:text-[11px] font-extrabold tracking-widest uppercase mb-3">
            ACADEMIC SESSION {sessionToUse}
          </p>

          {/* Decorative bottom lines */}
          <div className="border-b border-[#002060] mb-3"></div>

          {/* Student metadata + passport photo container */}
          <div className="flex flex-row gap-4 items-start justify-between mb-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[10.5px] sm:text-[11px] w-full">
              <div className="flex items-baseline">
                <span className="font-bold text-[#002060] w-24 shrink-0">Admn.No</span>
                <span className="font-extrabold flex-1">: {student.admissionNo || student.srNo || 'N/A'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-[#002060] w-24 shrink-0">Class/Section</span>
                <span className="font-extrabold flex-1">: {student.grade || 'N/A'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-[#002060] w-24 shrink-0">Student's Name</span>
                <span className="font-black text-[#002060] uppercase flex-1">: {student.name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-[#002060] w-24 shrink-0">Roll No</span>
                <span className="font-extrabold flex-1">: {student.rollNo || 'N/A'}</span>
              </div>
              <div className="flex items-baseline col-span-1">
                <span className="font-bold text-[#002060] w-24 shrink-0">Father's Name</span>
                <span className="font-extrabold uppercase flex-1">: {student.fatherName || 'N/A'}</span>
              </div>
              <div className="flex items-baseline col-span-1">
                <span className="font-bold text-[#002060] w-24 shrink-0">Mother's Name</span>
                <span className="font-extrabold uppercase flex-1">: {student.motherName || 'N/A'}</span>
              </div>
              <div className="flex items-baseline col-span-1">
                <span className="font-bold text-[#002060] w-24 shrink-0">D.O.B</span>
                <span className="font-extrabold uppercase flex-1">: {student.dob || '-'}</span>
              </div>
              <div className="flex items-baseline col-span-1">
                <span className="font-bold text-[#002060] w-24 shrink-0">Address</span>
                <span className="font-extrabold uppercase flex-1">: {student.address || student.presentVillageMohalla || '-'}</span>
              </div>
            </div>
            
            {/* Passport photo box */}
            <div className="w-16 h-20 border border-dashed border-[#002060] rounded flex items-center justify-center text-center bg-slate-50 overflow-hidden shrink-0 shadow-inner">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-[7px] uppercase font-bold text-slate-400 p-1 leading-tight">Passport Photo</div>
              )}
            </div>
          </div>

          {/* Subjects & Marks Grid table */}
          <div className="overflow-x-auto my-3">
            <table className="w-full border-2 border-[#002060] text-center text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#002060] bg-slate-50">
                  <th rowSpan={2} className="border-r-2 border-[#002060] p-1.5 text-center align-middle font-black w-[18%]">SUBJECT</th>
                  <th colSpan={4} className="border-r-2 border-[#002060] p-1 text-center font-extrabold text-[#002060] uppercase bg-slate-50 text-[9.5px]">HALF YEARLY EXAMINATION</th>
                  <th colSpan={7} className="p-1 text-center font-extrabold text-[#002060] uppercase bg-slate-50 text-[9.5px]">ANNUAL EXAMINATION</th>
                </tr>
                <tr className="border-b-2 border-[#002060] text-[8px] font-bold text-slate-700 bg-slate-50/50">
                  {/* Half Yearly columns */}
                  <th className="border-r border-[#002060] p-1 w-[6%]">TEST<br/>(10)</th>
                  <th className="border-r border-[#002060] p-1 w-[7%]">H.Y EXAM<br/>(90)</th>
                  <th className="border-r border-[#002060] p-1 w-[8%]">TOTAL<br/>(100)</th>
                  <th className="border-r-2 border-[#002060] p-1 w-[9%] text-[#002060]">OBT.<br/>MARKS</th>
                  {/* Annual columns */}
                  <th className="border-r border-[#002060] p-1 w-[6%]">TEST<br/>(10)</th>
                  <th className="border-r border-[#002060] p-1 w-[7%]">ANNUAL<br/>(90)</th>
                  <th className="border-r border-[#002060] p-1 w-[8%]">TOTAL<br/>(100)</th>
                  <th className="border-r border-[#002060] p-1 w-[9%] text-[#002060]">OBT.<br/>MARKS</th>
                  <th className="border-r border-[#002060] p-1 w-[7%]">FINAL<br/>TOTAL (200)</th>
                  <th className="border-r border-[#002060] p-1 w-[8%] text-[#002060]">FINAL OBT.<br/>MARKS</th>
                  <th className="p-1 w-[7%] text-indigo-700">GRADE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#002060]">
                {subjectRows.map((sub, index) => (
                  <tr key={`${sub.subject}-${index}`} className="hover:bg-slate-50/20">
                    <td className="border-r-2 border-[#002060] text-left px-2 py-1 font-extrabold uppercase text-[#002060] bg-slate-50/20 text-[9.5px]">{sub.subject}</td>
                    <td className="border-r border-[#002060] p-1 font-bold text-center font-mono">{displayVal(sub.hyTestExists, sub.hyTestVal)}</td>
                    <td className="border-r border-[#002060] p-1 font-bold text-center font-mono">{displayVal(sub.hyExamExists, sub.hyExamVal)}</td>
                    <td className="border-r border-[#002060] p-1 font-bold text-center font-mono text-slate-500">{sub.hasHy ? 100 : ''}</td>
                    <td className="border-r-2 border-[#002060] p-1 font-black text-center font-mono text-slate-900 bg-indigo-50/10">{sub.hasHy ? sub.hyObt : ''}</td>
                    <td className="border-r border-[#002060] p-1 font-bold text-center font-mono">{displayVal(sub.yTestExists, sub.yTestVal)}</td>
                    <td className="border-r border-[#002060] p-1 font-bold text-center font-mono">{displayVal(sub.yExamExists, sub.yExamVal)}</td>
                    <td className="border-r border-[#002060] p-1 font-bold text-center font-mono text-slate-500">{sub.hasY ? 100 : ''}</td>
                    <td className="border-r border-[#002060] p-1 font-black text-center font-mono text-slate-900 bg-indigo-50/10">{sub.hasY ? sub.yObt : ''}</td>
                    <td className="border-r border-[#002060] p-1 font-bold text-center font-mono text-slate-500">{sub.hasAny ? sub.finalMax : ''}</td>
                    <td className="border-r border-[#002060] p-1 font-black text-center font-mono text-[#002060] bg-indigo-50/25">{sub.hasAny ? sub.finalObt : ''}</td>
                    <td className="p-1 font-black text-center text-indigo-800 bg-indigo-50/40">{sub.hasAny ? sub.grade : ''}</td>
                  </tr>
                ))}
                
                {/* Row Total */}
                <tr className="font-black text-slate-900 bg-slate-100 border-t-2 border-[#002060]">
                  <td className="border-r-2 border-[#002060] text-left px-2 py-1.5 font-black uppercase text-[#002060] text-[9.5px]">TOTAL</td>
                  <td className="border-r border-[#002060] p-1.5"></td>
                  <td className="border-r border-[#002060] p-1.5"></td>
                  <td className="border-r border-[#002060] p-1.5 font-mono text-slate-600">{totalHyMax > 0 ? totalHyMax : ''}</td>
                  <td className="border-r-2 border-[#002060] p-1.5 font-mono text-slate-900">{totalHyObt > 0 ? totalHyObt : ''}</td>
                  <td className="border-r border-[#002060] p-1.5"></td>
                  <td className="border-r border-[#002060] p-1.5"></td>
                  <td className="border-r border-[#002060] p-1.5 font-mono text-slate-600">{totalYMax > 0 ? totalYMax : ''}</td>
                  <td className="border-r border-[#002060] p-1.5 font-mono text-slate-900">{totalYObt > 0 ? totalYObt : ''}</td>
                  <td className="border-r border-[#002060] p-1.5 font-mono text-slate-600">{totalFinalMax > 0 ? totalFinalMax : ''}</td>
                  <td className="border-r border-[#002060] p-1.5 font-mono text-[#002060] font-black">{totalFinalObt > 0 ? totalFinalObt : ''}</td>
                  <td className="p-1.5 text-indigo-900 font-black">{totalFinalMax > 0 ? overallGrade : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Results score summarizer details columns */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-1.5 text-[11px] sm:text-[11.5px] text-slate-900 my-3 pt-1">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="font-bold text-[#002060] w-24 shrink-0">RESULT</span>
                <span className="font-extrabold">: {passed ? 'PASSED' : 'FAILED'}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-24 shrink-0">PERCENTAGE</span>
                <span className="font-extrabold">: {overallPercentage.toFixed(2)}%</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-24 shrink-0">GRADE</span>
                <span className="font-extrabold">: {overallGrade}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-24 shrink-0">RANK</span>
                <span className="font-extrabold">: {rank}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex">
                <span className="font-bold text-[#002060] w-24 shrink-0">REMARK</span>
                <span className="font-extrabold">: {remark}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-24 shrink-0">ATTENDANCE</span>
                <span className="font-extrabold">: {attendanceString}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-24 shrink-0">DATE</span>
                <span className="font-extrabold">: {new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          {/* Signatures Row layout */}
          <div className="flex justify-between items-center mt-10 mb-2 px-8 text-center text-[10px] font-black text-[#002060]">
            <div className="flex flex-col items-center">
              <div className="h-8"></div>
              <span className="border-t border-[#002060] pt-1 px-4 uppercase tracking-wider text-[9px]">CLASS TEACHER</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8"></div>
              <span className="border-t border-[#002060] pt-1 px-4 uppercase tracking-wider text-[9px]">PRINCIPAL</span>
            </div>
          </div>

          {/* Grading Scale instruction footers */}
          <div className="border-t border-dashed border-[#002060] pt-2.5 mt-3">
            <p className="text-center font-bold text-[9.5px] text-[#002060] uppercase tracking-wider mb-1">Instructions</p>
            <p className="text-[9px] text-slate-600 font-semibold mb-1">
              GRADING SCALE FOR SCHOLASTIC AREAS : Grade are awarded on 8- point grading scale as follows
            </p>
            
            <table className="w-full text-center border border-[#002060] text-[7.5px] sm:text-[8px] border-collapse">
              <thead>
                <tr className="bg-slate-50 font-bold border-b border-[#002060] text-slate-700">
                  <td className="border-r border-[#002060] p-0.5 font-semibold uppercase text-slate-500">PERCENTAGE RANGE</td>
                  <td className="border-r border-[#002060] p-0.5">91%-100%</td>
                  <td className="border-r border-[#002060] p-0.5">81%-90%</td>
                  <td className="border-r border-[#002060] p-0.5">71%-80%</td>
                  <td className="border-r border-[#002060] p-0.5">61%-70%</td>
                  <td className="border-r border-[#002060] p-0.5">51%-60%</td>
                  <td className="border-r border-[#002060] p-0.5">41%-50%</td>
                  <td className="border-r border-[#002060] p-0.5">33%-40%</td>
                  <td className="p-0.5">32% & BELOW</td>
                </tr>
              </thead>
              <tbody>
                <tr className="font-extrabold text-[#002060] text-[8.5px]">
                  <td className="border-r border-[#002060] p-0.5 font-bold text-slate-500 text-[7.5px]">GRADE</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">A1</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">A2</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">B1</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">B2</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">C1</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">C2</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">D</td>
                  <td className="p-0.5 bg-indigo-50/10">E</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Header section with UDISE */}
          <div className="flex justify-end items-center font-serif text-[10px] sm:text-[11px] font-black text-[#CC0000] uppercase tracking-wider mb-1">
            <div>UDISE CODE-{currentSchool?.udiseCode || '09040803605'}</div>
          </div>

          {/* School Logo, Name & Address */}
          <div className="flex items-center justify-between gap-4 mb-2">
            {currentSchool?.logo ? (
              <img 
                src={currentSchool.logo} 
                alt="School Logo" 
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">Logo</div>
            )}
            <div className="text-center flex-1">
              <h1 
                style={getSchoolNameStyle(currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL', 'landscape_new')}
                className="font-black text-[#002060] font-serif uppercase tracking-wide leading-tight"
              >
                {currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL'}
              </h1>
              <p 
                style={getAddressStyle(currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001', 'landscape_new')}
                className="font-bold text-[#002060] uppercase tracking-widest mt-0.5"
              >
                {currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001'}
              </p>
              <p className="font-bold text-[#002060] text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-wider mt-0.5">
                Contact No: {currentSchool?.mobile || '9411833501, 8057283623'}
                {currentSchool?.altMobile ? `, ${currentSchool.altMobile}` : ''}
              </p>
            </div>
            <div className="w-12 h-12 shrink-0 hidden sm:block"></div>
          </div>

          {/* Double decorative horizontal header separator */}
          <div className="border-t border-[#002060] py-0.5 my-1"></div>

          {/* REPORT CARD Pill */}
          <div className="text-center my-1.5 flex flex-col items-center justify-center">
            <div className="px-5 py-0.5 bg-[#002060] text-white rounded-md border border-double border-white font-serif text-[12px] sm:text-[13px] font-black tracking-widest uppercase inline-block shadow-sm">
              REPORT CARD
            </div>
            <p className="text-center font-serif text-[#002060] text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase mt-1">
              ACADEMIC SESSION {sessionToUse}
            </p>
          </div>

          {/* Decorative bottom lines */}
          <div className="border-b border-[#002060] mb-3"></div>

          {/* Student Details Section (Landscape format) */}
          <div className="border border-[#002060] p-2.5 rounded bg-[#f4f7fa] mb-3 grid grid-cols-12 gap-2">
            <div className="col-span-10 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10.5px] font-serif">
              <div className="flex">
                <span className="font-bold text-[#002060] w-28 shrink-0">Admn. No</span>
                <span className="font-extrabold text-slate-800 flex-1">: {student.admissionNo || student.srNo || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-28 shrink-0">Class/Section</span>
                <span className="font-extrabold text-slate-800 flex-1">: {student.grade || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-28 shrink-0">Student's Name</span>
                <span className="font-black text-[#002060] uppercase flex-1">: {student.name}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-28 shrink-0">Roll No</span>
                <span className="font-extrabold text-slate-800 flex-1">: {student.rollNo || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-28 shrink-0">Father's Name</span>
                <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.fatherName || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-[#002060] w-28 shrink-0">Mother's Name</span>
                <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.motherName || '-'}</span>
              </div>
              <div className="flex pt-0.5">
                <span className="font-bold text-[#002060] w-28 shrink-0">D.O.B</span>
                <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.dob || '-'}</span>
              </div>
              <div className="flex pt-0.5">
                <span className="font-bold text-[#002060] w-28 shrink-0">Address</span>
                <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.address || student.presentVillageMohalla || '-'}</span>
              </div>
            </div>
            <div className="col-span-2 flex justify-end">
              <div className="relative group w-16 h-20 border border-dashed border-[#002060] rounded flex items-center justify-center text-center bg-slate-50 overflow-hidden shrink-0 shadow-inner">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[7px] uppercase font-bold text-slate-400 p-1 leading-tight">Passport Photo</div>
                )}
              </div>
            </div>
          </div>

          {/* Table and Summary Side-By-Side layout */}
          <div className="grid grid-cols-12 gap-3 mb-2">
            {/* Marks grid */}
            <div className="col-span-9 overflow-x-auto">
              <table className="w-full border-2 border-[#002060] text-center text-[9px] font-serif border-collapse">
                <thead>
                  <tr className="border-b border-[#002060] bg-slate-50/50">
                    <th rowSpan={2} className="border-r border-[#002060] p-1 text-center align-middle text-slate-800 font-black w-[18%]">SUBJECT</th>
                    <th colSpan={4} className="border-r border-[#002060] p-0.5 text-center font-extrabold text-[#002060] uppercase text-[8px]">HALF YEARLY EXAMINATION</th>
                    <th colSpan={7} className="p-0.5 text-center font-extrabold text-[#002060] uppercase text-[8px]">ANNUAL EXAMINATION</th>
                  </tr>
                  <tr className="border-b border-[#002060] text-[7.5px] font-bold text-slate-700 bg-slate-100/50">
                    {/* Half Yearly columns */}
                    <th className="border-r border-[#002060] p-0.5 w-[6%]">TEST<br/>(10)</th>
                    <th className="border-r border-[#002060] p-0.5 w-[7%]">H.Y. EXAM<br/>(90)</th>
                    <th className="border-r border-[#002060] p-0.5 w-[8%]">TOTAL<br/>(100)</th>
                    <th className="border-r border-[#002060] p-0.5 w-[9%] text-[#002060]">OBT.<br/>MARKS</th>
                    {/* Annual columns */}
                    <th className="border-r border-[#002060] p-0.5 w-[6%]">TEST<br/>(10)</th>
                    <th className="border-r border-[#002060] p-0.5 w-[7%]">ANNUAL<br/>(90)</th>
                    <th className="border-r border-[#002060] p-0.5 w-[8%]">TOTAL<br/>(100)</th>
                    <th className="border-r border-[#002060] p-0.5 w-[9%] text-[#002060]">OBT.<br/>MARKS</th>
                    <th className="border-r border-[#002060] p-0.5 w-[7%]">FINAL<br/>TOTAL (200)</th>
                    <th className="border-r border-[#002060] p-0.5 w-[8%] text-[#002060]">FINAL OBT.<br/>MARKS</th>
                    <th className="p-0.5 w-[6%] text-indigo-700">GRADE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#002060]">
                  {subjectRows.map((sub, index) => (
                    <tr key={`${sub.subject}-${index}`} className="hover:bg-slate-50/20 text-[9px]">
                      <td className="border-r border-[#002060] text-left px-1.5 py-0.5 font-extrabold uppercase text-[#002060] bg-slate-50/10">{sub.subject}</td>
                      <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono">{displayVal(sub.hyTestExists, sub.hyTestVal)}</td>
                      <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono">{displayVal(sub.hyExamExists, sub.hyExamVal)}</td>
                      <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono text-slate-400">{sub.hasHy ? 100 : ''}</td>
                      <td className="border-r border-[#002060] p-0.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10">{sub.hasHy ? sub.hyObt : ''}</td>
                      <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono">{displayVal(sub.yTestExists, sub.yTestVal)}</td>
                      <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono">{displayVal(sub.yExamExists, sub.yExamVal)}</td>
                      <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono text-slate-400">{sub.hasY ? 100 : ''}</td>
                      <td className="border-r border-[#002060] p-0.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10">{sub.hasY ? sub.yObt : ''}</td>
                      <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono text-slate-400">{sub.hasAny ? sub.finalMax : ''}</td>
                      <td className="border-r border-[#002060] p-0.5 font-black text-center font-mono text-[#002060] bg-indigo-50/25">{sub.hasAny ? sub.finalObt : ''}</td>
                      <td className="p-0.5 font-black text-center text-indigo-800 bg-indigo-50/40">{sub.hasAny ? sub.grade : ''}</td>
                    </tr>
                  ))}
                  
                  {/* Row Total */}
                  <tr className="font-black text-slate-900 bg-slate-100 border-t border-[#002060] text-[9px]">
                    <td className="border-r border-[#002060] text-left px-1.5 py-1 font-black uppercase text-[#002060]">TOTAL</td>
                    <td className="border-r border-[#002060] p-0.5"></td>
                    <td className="border-r border-[#002060] p-0.5"></td>
                    <td className="border-r border-[#002060] p-0.5 font-mono text-slate-600">{totalHyMax > 0 ? totalHyMax : ''}</td>
                    <td className="border-r border-[#002060] p-0.5 font-mono text-slate-900">{totalHyObt > 0 ? totalHyObt : ''}</td>
                    <td className="border-r border-[#002060] p-0.5"></td>
                    <td className="border-r border-[#002060] p-0.5"></td>
                    <td className="border-r border-[#002060] p-0.5 font-mono text-slate-600"></td>
                    <td className="border-r border-[#002060] p-0.5 font-mono text-slate-900">{totalYObt > 0 ? totalYObt : ''}</td>
                    <td className="border-r border-[#002060] p-0.5 font-mono text-slate-600">{totalFinalMax > 0 ? totalFinalMax : ''}</td>
                    <td className="border-r border-[#002060] p-0.5 font-mono text-[#002060] font-black">{totalFinalObt > 0 ? totalFinalObt : ''}</td>
                    <td className="p-0.5 text-indigo-900 font-black">{totalFinalMax > 0 ? overallGrade : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary card sidebar */}
            <div className="col-span-3">
              <div className="border border-[#002060] rounded overflow-hidden bg-[#f8fafc] flex flex-col h-full text-[9.5px] font-serif">
                <div className="bg-[#002060] text-white py-1 px-1.5 font-bold uppercase tracking-wider text-center text-[9px] border-b border-[#002060]">
                  SUMMARY CARD
                </div>
                <div className="flex-1 p-1.5 space-y-1 divide-y divide-slate-200/55">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="font-bold text-[#002060]">RESULT</span>
                    <span className={`font-extrabold ${passed ? 'text-emerald-700' : 'text-red-700'}`}>{passed ? 'PASSED' : 'FAILED'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 pt-1">
                    <span className="font-bold text-[#002060]">REMARK</span>
                    <span className="font-extrabold text-slate-900 uppercase text-right leading-tight max-w-[100px] truncate" title={remark}>{remark}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 pt-1">
                    <span className="font-bold text-[#002060]">PERCENTAGE</span>
                    <span className="font-extrabold text-slate-900 font-mono">{overallPercentage.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 pt-1">
                    <span className="font-bold text-[#002060]">GRADE</span>
                    <span className="font-extrabold text-[#002060]">{overallGrade}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 pt-1">
                    <span className="font-bold text-[#002060]">RANK</span>
                    <span className="font-extrabold text-slate-900">{rank}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 pt-1">
                    <span className="font-bold text-[#002060]">ATTENDANCE</span>
                    <span className="font-extrabold text-slate-900">{attendanceString}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 pt-1">
                    <span className="font-bold text-[#002060]">DATE</span>
                    <span className="font-extrabold text-slate-900">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures Row layout */}
          <div className="flex justify-between items-center mt-4 mb-2 px-10 text-center text-[9.5px] font-serif font-black text-[#002060]">
            <div className="flex flex-col items-center">
              <div className="h-4"></div>
              <span className="border-t border-[#002060] pt-0.5 px-4 uppercase tracking-wider text-[8.5px]">CLASS TEACHER</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-4"></div>
              <span className="border-t border-[#002060] pt-0.5 px-4 uppercase tracking-wider text-[8.5px]">PRINCIPAL</span>
            </div>
          </div>

          {/* Grading Scale instruction footers */}
          <div className="border-t border-dashed border-[#002060] pt-1.5 mt-1">
            <p className="text-center font-bold text-[9px] text-[#002060] uppercase tracking-wider mb-0.5">INSTRUCTIONS</p>
            <p className="text-[8px] text-slate-600 font-semibold mb-0.5 text-center">
              GRADING SCALE FOR SCHOLASTIC AREAS : Grade are awarded on 8-point grading scale as follows
            </p>
            
            <table className="w-full text-center border border-[#002060] text-[7px] font-serif border-collapse max-w-xl mx-auto">
              <thead>
                <tr className="bg-slate-50 font-bold border-b border-[#002060] text-slate-700">
                  <td className="border-r border-[#002060] p-0.5 font-semibold uppercase text-slate-500">PERCENTAGE RANGE</td>
                  <td className="border-r border-[#002060] p-0.5">91%-100%</td>
                  <td className="border-r border-[#002060] p-0.5">81%-90%</td>
                  <td className="border-r border-[#002060] p-0.5">71%-80%</td>
                  <td className="border-r border-[#002060] p-0.5">61%-70%</td>
                  <td className="border-r border-[#002060] p-0.5">51%-60%</td>
                  <td className="border-r border-[#002060] p-0.5">41%-50%</td>
                  <td className="border-r border-[#002060] p-0.5">33%-40%</td>
                  <td className="p-0.5">32% & BELOW</td>
                </tr>
              </thead>
              <tbody>
                <tr className="font-extrabold text-[#002060] text-[8px]">
                  <td className="border-r border-[#002060] p-0.5 font-bold text-slate-500 text-[7px]">GRADE</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">A1</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">A2</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">B1</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">B2</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">C1</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">C2</td>
                  <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">D</td>
                  <td className="p-0.5 bg-indigo-50/10">E</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}

export function BulkResultsPrinter() {
  const { students, updateStudent, schools, currentUser, updateSchool } = useStore();
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [printType, setPrintType] = useState<'all' | 'single'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'classic_portrait' | 'landscape_new'>('classic_portrait');

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

  const classes = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const classStudents = students.filter(s => s.grade === selectedClass).sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));

  const handlePrint = () => {
    window.print();
  };

  // Determine students to render
  const studentsToPrint = printType === 'all' 
    ? classStudents 
    : classStudents.filter(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* Page break CSS inject */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: ${selectedTemplate === 'landscape_new' ? 'A4 landscape' : 'A4 portrait'};
            margin: ${selectedTemplate === 'landscape_new' ? '5mm' : '10mm'};
          }
          body {
            background: white !important;
            color: black !important;
          }
          
          #printable-bulk-results {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          #printable-bulk-results {
            --rc-color: ${brandColor} !important;
          }
 
          .no-print {
            display: none !important;
          }
 
          .print-card-wrapper {
            page-break-after: always;
            break-after: page;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            position: relative !important;
            overflow: visible !important;
          }
          
          /* Ensure child print containers maintain their border and style when printing */
          .print-container {
            border: 6px double var(--rc-color, #002060) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: ${selectedTemplate === 'landscape_new' ? '0.3cm 0.4cm' : '0.6cm'} !important;
            background: white !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 auto !important;
            position: relative !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
 
          .traditional-border {
            border: 6px double var(--rc-color, #002060) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: ${selectedTemplate === 'landscape_new' ? '0.3cm 0.4cm' : '0.6cm'} !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 auto !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Ensure last item doesn't leave an empty page */
          .print-card-wrapper:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Ensure table cells are compact in print */
          #printable-bulk-results table th, #printable-bulk-results table td {
            padding: 4px 6px !important;
            font-size: 9.5px !important;
          }
          #printable-bulk-results table tr {
            height: auto !important;
          }
          /* Smaller margins on headings & elements to ensure single-page fit */
          #printable-bulk-results h1 {
            font-size: 20px !important;
            margin-bottom: 2px !important;
          }
          #printable-bulk-results p {
            font-size: 9px !important;
          }
          #printable-bulk-results .my-2, #printable-bulk-results .my-4 {
            margin-top: 6px !important;
            margin-bottom: 6px !important;
          }
          #printable-bulk-results .mb-3, #printable-bulk-results .mb-4, #printable-bulk-results .mb-5 {
            margin-bottom: 6px !important;
          }
          #printable-bulk-results .mt-12 {
            margin-top: 1.5rem !important;
          }
          #printable-bulk-results .gap-6 {
            gap: 0.75rem !important;
          }
          #printable-bulk-results .gap-x-8 {
            column-gap: 1.5rem !important;
          }
          #printable-bulk-results .gap-y-3.5 {
            row-gap: 0.5rem !important;
          }
 
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
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
              setSelectedClass(e.target.value);
              setSelectedStudentId('');
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
              const val = e.target.value as 'classic_portrait' | 'landscape_new';
              setSelectedTemplate(val);
              
              // Persist selection for students to automatically display results using this exact template in their student profile!
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
                // Sync template state with selected student's existing preferred template if any
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
              
              <ReportCardPrintSheet student={student} selectedTemplate={selectedTemplate} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
