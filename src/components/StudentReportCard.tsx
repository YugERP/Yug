import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { type Student, type ExamMark, type ExamType } from '../types';
import { Card, Button, Label } from './UI';
import { Printer, Upload, RefreshCw, Award, BookOpen, CheckCircle, AlertCircle, FileText, X, Download, BarChart2, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { isSameGrade, isSameSubject, isValidPhotoUrl, isPracticalSubject, isNurseryOrKg } from '../utils/gradeHelper';
import { type SubjectRowData } from './reportCard/types';
import { ReportCardStyles } from './reportCard/ReportCardStyles';
import { ClassicPortraitTemplate } from './reportCard/ClassicPortraitTemplate';
import { LandscapeProTemplate } from './reportCard/LandscapeProTemplate';
import { NurseryKgPortraitTemplate } from './reportCard/NurseryKgPortraitTemplate';
import { NurseryKgLandscapeTemplate } from './reportCard/NurseryKgLandscapeTemplate';

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
  const defaultTpl = student.reportCardTemplate || (isNurseryOrKg(student.grade) ? 'nursery_kg' : 'classic_portrait');
  const [selectedTemplate, setSelectedTemplate] = useState<'classic_portrait' | 'landscape_new' | 'nursery_kg' | 'nursery_kg_landscape'>(defaultTpl);
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const isLandscape = selectedTemplate === 'landscape_new' || selectedTemplate === 'nursery_kg_landscape';
  const activePhoto = isValidPhotoUrl(student.photoUrl) ? student.photoUrl : (isValidPhotoUrl(student.docStudentPhoto) ? student.docStudentPhoto : null);

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
  
  // Available subjects
  const defaultSubjects = [
    'Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 
    'Drawing', 'G.K Moral', 'Reasoning', 'P.T.', 'Sanskrit', 'Computer Science'
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

  // Calculate Student Rank inside Class
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

  // Calculate Attendance dynamically
  const studentAttendance = attendances.filter(a => a.studentId === student.id || a.userId === student.id);
  const totalPresent = (student.reportCardPresentDays !== undefined && student.reportCardPresentDays !== null)
    ? student.reportCardPresentDays
    : (studentAttendance.length > 0 ? studentAttendance.filter(a => a.status === 'Present').length : 194);
  const totalDays = (student.reportCardTotalDays !== undefined && student.reportCardTotalDays !== null)
    ? student.reportCardTotalDays
    : (studentAttendance.length > 0 ? studentAttendance.length : 220);
  const attendanceString = `${totalPresent} / ${totalDays}`;

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      updateStudent(student.id, { photoUrl: base64Str });
      setPhotoLoadError(false);
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

  // Recharts Chart Data (Online view only)
  const chartData = subjectRows
    .filter(s => s.hasAny)
    .map(s => ({
      subject: s.subject,
      'Obtained Marks': s.finalObt,
      'Max Marks': s.finalMax,
      percentage: s.finalMax > 0 ? Math.round((s.finalObt / s.finalMax) * 100) : 0
    }));

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
    allowEditPhoto,
    onPhotoUploadClick: () => fileInputRef.current?.click(),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:static print:bg-white print:backdrop-none print:z-0">
      <Card className={`w-full ${isLandscape ? 'max-w-5xl' : 'max-w-4xl'} bg-white shadow-2xl rounded-2xl border border-slate-200 overflow-hidden relative flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none transition-all duration-300`}>
        
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
                  if (currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER_ADMIN' || currentUser?.role === 'CLERK') {
                    await updateStudent(student.id, { reportCardTemplate: val });
                  }
                }}
                className="text-xs border-slate-200 rounded px-2.5 py-1.5 bg-white border font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="classic_portrait">Classic (Portrait)</option>
                <option value="landscape_new">Landscape Pro (New)</option>
                <option value="nursery_kg">Nursery / KG (Portrait)</option>
                <option value="nursery_kg_landscape">Nursery / KG (Landscape A4)</option>
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
                        console.error('Failed to update school brand color', err);
                      }
                    }
                  }}
                  className="text-xs border-slate-200 rounded px-2 py-1.5 bg-white border font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {colorOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.name}
                    </option>
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
          
          <ReportCardStyles isLandscape={isLandscape} brandColor={brandColor} />

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
            className={`report-card-container print-container bg-white traditional-border border-[5px] border-double border-[#002060] ${isLandscape ? 'p-3 sm:p-4' : 'p-5 sm:p-6'} m-2 rounded-xl shadow-lg relative overflow-hidden ${activeViewTab === 'analytics' ? 'hidden print:block' : 'block'}`}
            style={{ '--rc-color': brandColor } as React.CSSProperties}
          >
            {/* hidden upload input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />

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
        </div>

      </Card>
    </div>
  );
}
