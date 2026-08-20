import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { type Student, type ExamMark, type ExamType } from '../types';
import { Card, Button, Label } from './UI';
import { Printer, Upload, RefreshCw, Award, BookOpen, CheckCircle, AlertCircle, FileText, X, Download, BarChart2, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

interface StudentReportCardProps {
  student: Student;
  onClose?: () => void;
  allowEditPhoto?: boolean;
}

export function StudentReportCard({ student, onClose, allowEditPhoto = true }: StudentReportCardProps) {
  const { marks, updateStudent, activeAcademicSession, schools, currentUser, attendances, students, updateSchool } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [activeViewTab, setActiveViewTab] = useState<'transcript' | 'analytics'>('transcript');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>(
    student.reportCardTemplate === 'landscape_new' ? 'landscape' : 'portrait'
  );
  const [selectedTemplate, setSelectedTemplate] = useState<'classic_portrait' | 'landscape_new'>(
    student.reportCardTemplate || 'classic_portrait'
  );

  // School details
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

  // Student specific marks matching the active session
  const sessionToUse = student.academicSession || activeAcademicSession;
  const studentMarks = marks.filter(m => m.studentId === student.id);
  
  // Available subjects (either from student subjects, or derived from marks/defaults)
  const defaultSubjects = [
    'Hindi', 'Mathematics', 'English', 'Social Science', 'Science', 
    'Drawing', 'Sanskrit', 'Computer', 'G.K/Moral Science'
  ];
  
  const studentSubjects = student.subjects && student.subjects.length > 0 
    ? student.subjects 
    : Array.from(new Set([...defaultSubjects, ...studentMarks.map(m => m.subject)]));

  // Helper to determine Grade from Percentage based on 8-point grading scale
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

  // Helper to determine Remark from Percentage
  const getRemarkFromPercentage = (pct: number): string => {
    if (pct >= 90) return 'OUTSTANDING';
    if (pct >= 80) return 'EXCELLENT';
    if (pct >= 70) return 'VERY GOOD';
    if (pct >= 50) return 'GOOD';
    if (pct >= 33) return 'SATISFACTORY';
    return 'NEEDS IMPROVEMENT';
  };

  // Calculate global totals dynamically across all subjects
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

    // Accumulate global totals
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

  // Calculate Student Rank inside Class
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

  // Calculate Attendance dynamically
  const studentAttendance = attendances.filter(a => a.studentId === student.id || a.userId === student.id);
  const totalPresent = student.reportCardPresentDays ?? studentAttendance.filter(a => a.status === 'Present').length;
  const totalDays = student.reportCardTotalDays ?? studentAttendance.length;
  const attendanceString = totalDays > 0 ? `${totalPresent} / ${totalDays}` : '194 / 220';

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      updateStudent(student.id, { photoUrl: base64Str });
      setPhotoUploading(false);
    };
    reader.onerror = () => {
      setPhotoUploading(false);
      alert('Error reading file. Please try smaller or standard images.');
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    window.print();
  };

  const displayVal = (exists: boolean, val: number) => exists ? val : '';

  // Recharts Chart Data (Online view only)
  const chartData = subjectRows
    .filter(s => s.hasAny)
    .map(s => ({
      subject: s.subject,
      'Obtained Marks': s.finalObt,
      'Max Marks': s.finalMax,
      percentage: s.finalMax > 0 ? Math.round((s.finalObt / s.finalMax) * 100) : 0
    }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:static print:bg-white print:backdrop-none print:z-0">
      <Card className={`w-full ${selectedTemplate === 'landscape_new' ? 'max-w-5xl' : 'max-w-4xl'} bg-white shadow-2xl rounded-2xl border border-slate-200 overflow-hidden relative flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none transition-all duration-300`}>
        
        {/* Controls - Hidden in print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden shrink-0 no-print gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <div>
              <span className="font-bold text-slate-800 text-sm block">Academic Transcript Console</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{student.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Manual Attendance Overrides */}
            <div className="flex items-center gap-2 mr-4 bg-white px-2 py-1 border border-slate-200 rounded-lg">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Attendance</div>
              <input 
                type="number" 
                placeholder="Present" 
                title="Present Days"
                className="w-14 text-xs p-1 border border-slate-200 rounded text-center font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                value={student.reportCardPresentDays ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  updateStudent(student.id, { reportCardPresentDays: isNaN(val) ? undefined : val });
                }}
              />
              <span className="text-slate-400 font-bold">/</span>
              <input 
                type="number" 
                placeholder="Total" 
                title="Total Days"
                className="w-14 text-xs p-1 border border-slate-200 rounded text-center font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                value={student.reportCardTotalDays ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  updateStudent(student.id, { reportCardTotalDays: isNaN(val) ? undefined : val });
                }}
              />
            </div>

            {/* View Tab Toggles */}
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-white mr-2">
              <button
                onClick={() => setActiveViewTab('transcript')}
                className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${activeViewTab === 'transcript' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Transcript Preview</span>
              </button>
              <button
                onClick={() => setActiveViewTab('analytics')}
                className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${activeViewTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Analytics Chart</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template:</span>
              <select
                value={selectedTemplate}
                onChange={async (e) => {
                  const val = e.target.value as any;
                  setSelectedTemplate(val);
                  setPrintLayout(val === 'landscape_new' ? 'landscape' : 'portrait');
                  if (currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER_ADMIN' || currentUser?.role === 'CLERK') {
                    await updateStudent(student.id, { reportCardTemplate: val });
                  }
                }}
                className="text-xs border-slate-200 rounded px-2.5 py-1.5 bg-white border font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="classic_portrait">Classic (Portrait)</option>
                <option value="landscape_new">Landscape Pro (New)</option>
              </select>
            </div>

            {(currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER_ADMIN' || currentUser?.role === 'CLERK') && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Theme Color:</span>
                <select
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
                  className="text-xs border-slate-200 rounded px-2.5 py-1.5 bg-white border font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {colorOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3.5 flex items-center gap-1.5 rounded-lg shadow-sm">
              <Printer className="w-4 h-4" />
              <span>Print Report Card</span>
            </Button>
            
            {onClose && (
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors ml-1">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Transcript Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 print:overflow-visible print:p-0">
          
          {/* Print specific stylesheet */}
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
              
              /* Anchor print-container precisely to avoid positioning bugs and fit layout */
              .print-container {
                position: relative !important;
                background: white !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                box-sizing: border-box !important;
                border: 6px double var(--rc-color, #002060) !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                padding: ${selectedTemplate === 'landscape_new' ? '0.3cm 0.4cm' : '0.6cm'} !important;
                margin: 0 auto !important;
                overflow: visible !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
 
              /* Hide digital tab widgets and controls */
              .no-print, .no-print *, button.no-print, .print\\:hidden {
                display: none !important;
              }
 
              /* Double border styling in physical print sheets */
              .traditional-border {
                border: 6px double var(--rc-color, #002060) !important;
                padding: 0.6cm !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                box-sizing: border-box !important;
                width: 100% !important;
                height: auto !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              
              /* Ensure table cells are compact in print */
              .print-container table th, .print-container table td {
                padding: 4px 6px !important;
                font-size: 9.5px !important;
              }
              .print-container table tr {
                height: auto !important;
              }
              /* Smaller margins on headings & elements to ensure single-page fit */
              .print-container h1 {
                font-size: 20px !important;
                margin-bottom: 2px !important;
              }
              .print-container p {
                font-size: 9px !important;
              }
              .print-container .my-2, .print-container .my-4 {
                margin-top: 6px !important;
                margin-bottom: 6px !important;
              }
              .print-container .mb-3, .print-container .mb-4, .print-container .mb-5 {
                margin-bottom: 6px !important;
              }
              .print-container .mt-12 {
                margin-top: 1.5rem !important;
              }
              .print-container .gap-6 {
                gap: 0.75rem !important;
              }
              .print-container .gap-x-8 {
                column-gap: 1.5rem !important;
              }
              .print-container .gap-y-3.5 {
                row-gap: 0.5rem !important;
              }
              
              /* Ensure standard background colors & lines print exactly as on screen */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-shadow: none !important;
              }
            }
          `}} />

          {activeViewTab === 'analytics' && (
            <div className="space-y-6 no-print">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Marks</span>
                  <p className="text-2xl font-black text-slate-800 font-mono mt-1">{totalFinalObt} / {totalFinalMax}</p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregated Percentage</span>
                  <p className="text-2xl font-black text-indigo-600 font-mono mt-1">{overallPercentage.toFixed(2)}%</p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Final Board Grade</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{overallGrade}</p>
                </div>
              </div>

              <Card className="p-4 bg-white border">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-indigo-500" />
                  Subject Performance Breakdown (Final Obtained vs. Max)
                </h3>
                {chartData.length === 0 ? (
                  <p className="text-slate-400 italic text-xs text-center py-10">No examination records logged yet to render chart visualization.</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" />
                        <Tooltip />
                        <Bar dataKey="Obtained Marks" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#059669' : entry.percentage >= 50 ? '#4f46e5' : entry.percentage >= 33 ? '#d97706' : '#dc2626'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* PRINT CARD WRAPPER */}
          <div 
            className={`report-card-container print-container bg-white traditional-border border-[6px] border-double border-[#002060] ${selectedTemplate === 'landscape_new' ? 'p-3 sm:p-4' : 'p-6 sm:p-8'} m-2 rounded-xl shadow-lg relative overflow-hidden ${activeViewTab === 'analytics' ? 'hidden print:block' : 'block'}`}
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
            
            {/* hidden upload input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {selectedTemplate === 'classic_portrait' ? (
              <>
                {/* Header section with UDISE */}
                <div className="flex justify-end items-center font-serif text-[10px] sm:text-[11px] font-black text-[#CC0000] uppercase tracking-wider mb-1">
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
                      className="font-black text-[#002060] font-serif uppercase tracking-wide leading-tight"
                    >
                      {currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL'}
                    </h1>
                    <p 
                      style={getAddressStyle(currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001', 'classic_portrait')}
                      className="font-bold text-[#002060] uppercase tracking-widest mt-1"
                    >
                      {currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001'}
                    </p>
                    <p className="font-bold text-[#002060] text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-wider mt-0.5">
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
                  <div className="px-6 py-1 bg-[#002060] text-white rounded-md border-2 border-double border-white font-serif text-[15px] sm:text-[16px] font-black tracking-widest uppercase inline-block shadow-sm">
                    REPORT CARD
                  </div>
                </div>

                {/* Session Text */}
                <p className="text-center font-serif text-[#002060] text-[11px] sm:text-[12px] font-extrabold tracking-widest uppercase mb-4">
                  ACADEMIC SESSION {sessionToUse}
                </p>

                {/* Decorative bottom lines */}
                <div className="border-b border-[#002060] mb-4"></div>

                {/* Student metadata + passport photo container */}
                <div className="flex flex-col sm:flex-row gap-6 items-start justify-between mb-5">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 text-[11px] sm:text-[12px] text-slate-900 font-serif w-full">
                    <div className="flex items-baseline">
                      <span className="font-bold text-[#002060] w-28 shrink-0">Admn.No</span>
                      <span className="font-extrabold text-slate-800 flex-1">: {student.admissionNo || student.srNo || '532'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="font-bold text-[#002060] w-28 shrink-0">Class/Section</span>
                      <span className="font-extrabold text-slate-800 flex-1">: {student.grade || 'VIII'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="font-bold text-[#002060] w-28 shrink-0">Student's Name</span>
                      <span className="font-black text-[#002060] uppercase flex-1">: {student.name}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="font-bold text-[#002060] w-28 shrink-0">Roll No</span>
                      <span className="font-extrabold text-slate-800 flex-1">: {student.rollNo || '383'}</span>
                    </div>
                    <div className="flex items-baseline col-span-1">
                      <span className="font-bold text-[#002060] w-28 shrink-0">Father's Name</span>
                      <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.fatherName || 'KAMRUDDIN MIYA'}</span>
                    </div>
                    <div className="flex items-baseline col-span-1">
                      <span className="font-bold text-[#002060] w-28 shrink-0">Mother's Name</span>
                      <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.motherName || 'AJARA KHATOON'}</span>
                    </div>
                    <div className="flex items-baseline col-span-1">
                      <span className="font-bold text-[#002060] w-28 shrink-0">D.O.B</span>
                      <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.dob || '-'}</span>
                    </div>
                    <div className="flex items-baseline col-span-1">
                      <span className="font-bold text-[#002060] w-28 shrink-0">Address</span>
                      <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.address || student.presentVillageMohalla || '-'}</span>
                    </div>
                  </div>
                  
                  {/* Passport photo box */}
                  <div className="relative w-20 h-24 border border-dashed border-[#002060] rounded flex items-center justify-center text-center bg-slate-50 overflow-hidden shrink-0 shadow-inner group">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[7.5px] uppercase font-bold text-slate-400 p-1 font-serif leading-tight">Passport Photo</div>
                    )}
                    {allowEditPhoto && (
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold no-print"
                      >
                        Upload
                      </button>
                    )}
                  </div>
                </div>

                {/* Subjects & Marks Grid table */}
                <div className="overflow-x-auto my-4">
                  <table className="w-full border-2 border-[#002060] text-center text-[10.5px] font-serif border-collapse">
                    <thead>
                      <tr className="border-b-2 border-[#002060]">
                        <th rowSpan={2} className="border-r-2 border-[#002060] p-2 text-center align-middle text-slate-800 font-black w-[18%]">SUBJECT</th>
                        <th colSpan={4} className="border-r-2 border-[#002060] p-1.5 text-center font-extrabold text-[#002060] uppercase bg-slate-50 text-[10px]">HALF YEARLY EXAMINATION</th>
                        <th colSpan={7} className="p-1.5 text-center font-extrabold text-[#002060] uppercase bg-slate-50 text-[10px]">ANNUAL EXAMINATION</th>
                      </tr>
                      <tr className="border-b-2 border-[#002060] text-[8.5px] font-bold text-slate-700 bg-slate-50/50">
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
                          <td className="border-r-2 border-[#002060] text-left px-3 py-1.5 font-extrabold uppercase text-[#002060] bg-slate-50/20">{sub.subject}</td>
                          <td className="border-r border-[#002060] p-1.5 font-bold text-center font-mono">{displayVal(sub.hyTestExists, sub.hyTestVal)}</td>
                          <td className="border-r border-[#002060] p-1.5 font-bold text-center font-mono">{displayVal(sub.hyExamExists, sub.hyExamVal)}</td>
                          <td className="border-r border-[#002060] p-1.5 font-bold text-center font-mono text-slate-500">{sub.hasHy ? 100 : ''}</td>
                          <td className="border-r-2 border-[#002060] p-1.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10">{sub.hasHy ? sub.hyObt : ''}</td>
                          <td className="border-r border-[#002060] p-1.5 font-bold text-center font-mono">{displayVal(sub.yTestExists, sub.yTestVal)}</td>
                          <td className="border-r border-[#002060] p-1.5 font-bold text-center font-mono">{displayVal(sub.yExamExists, sub.yExamVal)}</td>
                          <td className="border-r border-[#002060] p-1.5 font-bold text-center font-mono text-slate-500">{sub.hasY ? 100 : ''}</td>
                          <td className="border-r border-[#002060] p-1.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10">{sub.hasY ? sub.yObt : ''}</td>
                          <td className="border-r border-[#002060] p-1.5 font-bold text-center font-mono text-slate-500">{sub.hasAny ? sub.finalMax : ''}</td>
                          <td className="border-r border-[#002060] p-1.5 font-black text-center font-mono text-[#002060] bg-indigo-50/25">{sub.hasAny ? sub.finalObt : ''}</td>
                          <td className="p-1.5 font-black text-center text-indigo-800 bg-indigo-50/40">{sub.hasAny ? sub.grade : ''}</td>
                        </tr>
                      ))}
                      
                      {/* Row Total */}
                      <tr className="font-black text-slate-900 bg-slate-100 border-t-2 border-[#002060]">
                        <td className="border-r-2 border-[#002060] text-left px-3 py-2 font-black uppercase text-[#002060]">TOTAL</td>
                        <td className="border-r border-[#002060] p-2"></td>
                        <td className="border-r border-[#002060] p-2"></td>
                        <td className="border-r border-[#002060] p-2 font-mono text-slate-600">{totalHyMax > 0 ? totalHyMax : ''}</td>
                        <td className="border-r-2 border-[#002060] p-2 font-mono text-slate-900">{totalHyObt > 0 ? totalHyObt : ''}</td>
                        <td className="border-r border-[#002060] p-2"></td>
                        <td className="border-r border-[#002060] p-2"></td>
                        <td className="border-r border-[#002060] p-2 font-mono text-slate-600">{totalYMax > 0 ? totalYMax : ''}</td>
                        <td className="border-r border-[#002060] p-2 font-mono text-slate-900">{totalYObt > 0 ? totalYObt : ''}</td>
                        <td className="border-r border-[#002060] p-2 font-mono text-slate-600">{totalFinalMax > 0 ? totalFinalMax : ''}</td>
                        <td className="border-r border-[#002060] p-2 font-mono text-[#002060] text-[11.5px] font-black">{totalFinalObt > 0 ? totalFinalObt : ''}</td>
                        <td className="p-2 text-indigo-900 text-[11.5px] font-black">{totalFinalMax > 0 ? overallGrade : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Results score summarizer details columns */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[11.5px] sm:text-[12px] text-slate-900 my-4 font-serif pt-1">
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="font-bold text-[#002060] w-28 shrink-0">RESULT</span>
                      <span className="font-extrabold text-slate-900">: {passed ? 'PASSED' : 'FAILED'}</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold text-[#002060] w-28 shrink-0">PERCENTAGE</span>
                      <span className="font-extrabold text-slate-900">: {overallPercentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold text-[#002060] w-28 shrink-0">GRADE</span>
                      <span className="font-extrabold text-slate-900">: {overallGrade}</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold text-[#002060] w-28 shrink-0">RANK</span>
                      <span className="font-extrabold text-slate-900">: {rank}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="font-bold text-[#002060] w-28 shrink-0">REMARK</span>
                      <span className="font-extrabold text-slate-900">: {remark}</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold text-[#002060] w-28 shrink-0">ATTENDANCE</span>
                      <span className="font-extrabold text-slate-900">: {attendanceString}</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold text-[#002060] w-28 shrink-0">DATE</span>
                      <span className="font-extrabold text-slate-900">: {new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures Row layout */}
                <div className="flex justify-between items-center mt-12 mb-4 px-8 text-center text-[11px] font-serif font-black text-[#002060]">
                  <div className="flex flex-col items-center">
                    <div className="h-9"></div>
                    <span className="border-t border-[#002060] pt-1 px-4 uppercase tracking-wider text-[10px]">CLASS TEACHER</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-9"></div>
                    <span className="border-t border-[#002060] pt-1 px-4 uppercase tracking-wider text-[10px]">PRINCIPAL</span>
                  </div>
                </div>

                {/* Grading Scale instruction footers */}
                <div className="border-t border-dashed border-[#002060] pt-3 mt-4">
                  <p className="text-center font-bold text-[10.5px] text-[#002060] uppercase tracking-wider mb-1.5">Instructions</p>
                  <p className="text-[9.5px] text-slate-600 font-semibold mb-1.5 text-center">
                    GRADING SCALE FOR SCHOLASTIC AREAS : Grade are awarded on 8- point grading scale as follows
                  </p>
                  
                  <table className="w-full text-center border border-[#002060] text-[8px] sm:text-[9px] font-serif border-collapse">
                    <thead>
                      <tr className="bg-slate-50 font-bold border-b border-[#002060] text-slate-700">
                        <td className="border-r border-[#002060] p-1 font-semibold uppercase text-slate-500">PERCENTAGE RANGE</td>
                        <td className="border-r border-[#002060] p-1">91%-100%</td>
                        <td className="border-r border-[#002060] p-1">81%-90%</td>
                        <td className="border-r border-[#002060] p-1">71%-80%</td>
                        <td className="border-r border-[#002060] p-1">61%-70%</td>
                        <td className="border-r border-[#002060] p-1">51%-60%</td>
                        <td className="border-r border-[#002060] p-1">41%-50%</td>
                        <td className="border-r border-[#002060] p-1">33%-40%</td>
                        <td className="p-1">32% & BELOW</td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-extrabold text-[#002060] text-[9.5px]">
                        <td className="border-r border-[#002060] p-1 font-bold text-slate-500 text-[8px]">GRADE</td>
                        <td className="border-r border-[#002060] p-1 bg-indigo-50/10">A1</td>
                        <td className="border-r border-[#002060] p-1 bg-indigo-50/10">A2</td>
                        <td className="border-r border-[#002060] p-1 bg-indigo-50/10">B1</td>
                        <td className="border-r border-[#002060] p-1 bg-indigo-50/10">B2</td>
                        <td className="border-r border-[#002060] p-1 bg-indigo-50/10">C1</td>
                        <td className="border-r border-[#002060] p-1 bg-indigo-50/10">C2</td>
                        <td className="border-r border-[#002060] p-1 bg-indigo-50/10">D</td>
                        <td className="p-1 bg-indigo-50/10">E</td>
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
                  
                  {/* Passport photo box */}
                  <div className="col-span-2 flex justify-end items-center">
                    <div className="relative w-14 h-18 border border-dashed border-[#002060] rounded flex items-center justify-center text-center bg-white overflow-hidden shrink-0 shadow-inner group">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-[6.5px] uppercase font-bold text-slate-400 p-1 font-serif leading-tight">Passport Photo</div>
                      )}
                      {allowEditPhoto && (
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold no-print"
                        >
                          Upload
                        </button>
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
                          <th className="border-r border-[#002060] p-0.5 w-[7%]">ANNUAL<br/>(90)</th>
                          <th className="border-r border-[#002060] p-0.5 w-[8%] text-[#002060]">OBT.<br/>(100)</th>
                          <th className="border-r border-[#002060] p-0.5 w-[9%]">TOTAL<br/>TOTAL (200)</th>
                          <th className="border-r border-[#002060] p-0.5 w-[9%] text-[#002060]">FINAL OBT.<br/>MARKS</th>
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
                            <td className="border-r border-[#002060] p-0.5 font-bold text-center font-mono text-slate-400">{sub.hasY ? 90 : ''}</td>
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
        </div>

      </Card>
    </div>
  );
}
