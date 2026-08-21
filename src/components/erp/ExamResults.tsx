import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type ExamType, type ExamMark } from '../../types';
import { Award, CheckCircle, Search, Save, Calendar, CheckSquare, Sparkles, TrendingUp, Users } from 'lucide-react';
import { normalizeGrade, isSameGrade, getDefaultSubjectsForGrade, ALL_STANDARD_CLASSES } from '../../utils/gradeHelper';

export function ExamResults() {
  const { students, marks, addMark, updateStudent } = useStore();
  const [activeMode, setActiveMode] = useState<'marks' | 'attendance'>('marks');
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [examType, setExamType] = useState<ExamType>('Half-Yearly Test');
  const [searchQuery, setSearchQuery] = useState('');

  const classStudents = students.filter(s => !s.isDeleted && (s.grade === selectedClass || isSameGrade(s.grade, selectedClass)));
  const filteredStudents = classStudents.filter(s => 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.rollNo && String(s.rollNo).includes(searchQuery)) ||
    (s.srNo && s.srNo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Dynamically compile subjects based on class standards and student enrollment choices
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
  
  const subjects = classSubjectsSet.size > 0 
    ? Array.from(classSubjectsSet)
    : ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Drawing', 'G.K Moral', 'Reasoning', 'P.T.', 'Sanskrit', 'Computer Science', 'Urdu', 'Home Science'];

  const [subject, setSubject] = useState(subjects[0] || 'Hindi');

  // Ensure subject is within valid list when class changes
  if (!subjects.includes(subject) && subjects.length > 0) {
    setSubject(subjects[0]);
  }

  // Local state for grade sheet entry
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});
  const [maxMarksMap, setMaxMarksMap] = useState<Record<string, number>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Attendance ledger local states
  const [attendancePresentMap, setAttendancePresentMap] = useState<Record<string, number>>({});
  const [attendanceTotalMap, setAttendanceTotalMap] = useState<Record<string, number>>({});
  const [bulkTotalDays, setBulkTotalDays] = useState<string>('220');
  const [isAttendanceSaved, setIsAttendanceSaved] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const existingGrades = Array.from(new Set(students.filter(s => !s.isDeleted).map(s => normalizeGrade(s.grade))));
  const classes = Array.from(new Set([...ALL_STANDARD_CLASSES, ...existingGrades]));
  const examTypes: ExamType[] = ['Half-Yearly Test', 'Half-Yearly Exam', 'Yearly Test', 'Yearly Exam'];

  // Helper getters for marks
  const getObtainedMarks = (studentId: string) => {
    if (marksMap[studentId] !== undefined) return marksMap[studentId];
    const existing = marks.find(m => m.studentId === studentId && m.examType === examType && m.subject.toLowerCase() === subject.toLowerCase());
    return existing ? existing.marksObtained : 0;
  };

  const getMaxMarks = (studentId: string) => {
    if (maxMarksMap[studentId] !== undefined) return maxMarksMap[studentId];
    const existing = marks.find(m => m.studentId === studentId && m.examType === examType && m.subject.toLowerCase() === subject.toLowerCase());
    return existing ? existing.maxMarks : 70;
  };

  const handleMarkChange = (studentId: string, value: string) => {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: Number(value)
    }));
    setIsSaved(false);
  };

  const handleMaxMarkChange = (studentId: string, value: string) => {
    setMaxMarksMap(prev => ({
      ...prev,
      [studentId]: Number(value)
    }));
    setIsSaved(false);
  };

  // Helper getters for attendance
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

  // Apply total working days in bulk to all students in current class
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

  // Quick 100% full attendance action
  const handleMarkFullAttendance = (st: Student) => {
    const total = getStudentTotalDays(st);
    setAttendancePresentMap(prev => ({
      ...prev,
      [st.id]: total
    }));
    setIsAttendanceSaved(false);
  };

  // Submit marks
  const handleSubmitMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (classStudents.length === 0) return;

    for (const st of classStudents) {
      const marksObtained = getObtainedMarks(st.id);
      const maxMarks = getMaxMarks(st.id);

      await addMark({
        studentId: st.id,
        teacherId: 't001',
        examType,
        subject,
        marksObtained,
        maxMarks
      });
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 4000);
  };

  // Submit and save attendance to database (links directly to Report Cards)
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
      setTimeout(() => {
        setIsAttendanceSaved(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('उपस्थिति सुरक्षित करने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setAttendanceSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('marks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'marks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>1. Subject Marks Entry (विषयवार परीक्षा अंक)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'attendance'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Report Card Attendance Entry (रिपोर्ट कार्ड उपस्थिति)</span>
            <span className="bg-emerald-500/30 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-black border border-emerald-400/40">
              Auto-Link
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold px-2">
          {classStudents.length} छात्र नामांकित ({selectedClass})
        </div>
      </div>

      {/* Common Class & Filter Header */}
      <Card className="p-4 bg-slate-50/70 border border-slate-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[140px]">
          <Label className="font-bold text-slate-700 flex items-center gap-1.5">
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

        {activeMode === 'marks' && (
          <>
            <div className="flex-1 min-w-[150px]">
              <Label className="font-bold text-slate-700">Exam Scheme / Type</Label>
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

            <div className="flex-1 min-w-[150px]">
              <Label className="font-bold text-slate-700">Subject Paper</Label>
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

        <div className="flex-1 min-w-[180px]">
          <Label className="font-bold text-slate-700">Search Student</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input 
              type="text" 
              placeholder="Filter by name, roll no, SR..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full text-xs bg-white border border-slate-300 rounded pl-7 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODE 1: SUBJECT MARKS LEDGER */}
      {/* ========================================================================= */}
      {activeMode === 'marks' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <form onSubmit={handleSubmitMarks} className="space-y-4">
            <div className="flex flex-wrap justify-between items-center border-b pb-2 mb-2 gap-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                <Award className="w-4 h-4 text-indigo-600"/> Subject Result Sheet entry ledger ({subject})
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border border-indigo-100">{examType}</span>
                <button
                  type="button"
                  onClick={() => setActiveMode('attendance')}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" /> Edit Class Attendance
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-500">
                <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 w-16">Roll No</th>
                    <th className="px-4 py-2">Student Name</th>
                    <th className="px-4 py-2">SR / Admn No</th>
                    <th className="px-4 py-2 text-center w-32">Max Marks</th>
                    <th className="px-4 py-2 text-center w-32">Marks Obtained</th>
                    <th className="px-4 py-2 text-center w-28">Status</th>
                    <th className="px-4 py-2 text-center w-28">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 italic text-slate-400">
                        {selectedClass} में कोई छात्र नामांकित नहीं है। पहले छात्रों का पंजीकरण करें।
                      </td>
                    </tr>
                  ) : (() => {
                    const studentsHavingSubject = filteredStudents.filter(st => {
                      const hasMain = st.subjects && st.subjects.includes(subject);
                      const hasOpt = st.optionalSubject === subject;
                      if (classSubjectsSet.size === 0) return true;
                      return hasMain || hasOpt;
                    }).sort((a,b) => Number(a.rollNo) - Number(b.rollNo));

                    if (studentsHavingSubject.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="text-center py-6 italic text-slate-400">
                            कोई छात्र खोज से मेल नहीं खाता या {subject} विषय का चयन नहीं किया है।
                          </td>
                        </tr>
                      );
                    }

                    return studentsHavingSubject.map(st => {
                      const mObt = getObtainedMarks(st.id);
                      const mMax = getMaxMarks(st.id);
                      const pct = mMax > 0 ? (mObt / mMax) * 100 : 0;
                      const isFail = pct < 33;
                      const pDays = getStudentPresentDays(st);
                      const tDays = getStudentTotalDays(st);
                      const attPct = tDays > 0 ? Math.round((pDays / tDays) * 100) : 0;
                      
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-bold text-slate-700">{st.rollNo || '-'}</td>
                          <td className="px-4 py-2 font-black text-slate-800 text-xs">{st.name}</td>
                          <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{st.srNo || st.admissionNo || 'N/A'}</td>
                          <td className="px-4 py-1 text-center">
                            <input
                              type="number"
                              value={mMax}
                              onChange={e => handleMaxMarkChange(st.id, e.target.value)}
                              className="w-16 text-center font-mono font-bold bg-slate-50 text-xs border border-slate-200 rounded py-1 focus:bg-white text-slate-800"
                            />
                          </td>
                          <td className="px-4 py-1 text-center">
                            <input
                              type="number"
                              value={mObt}
                              max={mMax}
                              onChange={e => handleMarkChange(st.id, e.target.value)}
                              className={`w-16 text-center font-mono font-bold text-xs border rounded py-1 focus:bg-white ${isFail ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-indigo-200 bg-indigo-50/50 text-indigo-700'}`}
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            {isFail ? (
                              <span className="text-[8px] uppercase font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 leading-none">Fail/Improve</span>
                            ) : (
                              <span className="text-[8px] uppercase font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 leading-none">Passed ({Math.round(pct)}%)</span>
                            )}
                          </td>
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
              <div className="pt-4 flex flex-wrap justify-between items-center border-t border-slate-100 gap-3">
                <span className="text-[10px] text-slate-400 italic">
                  * परीक्षा अंक सबमिट करने पर सीधे रिपोर्ट कार्ड और ट्रांसक्रिप्ट में लाइव अपडेट हो जाएंगे।
                </span>
                <div className="flex items-center gap-3">
                  {isSaved && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded shadow-xs">
                      <CheckCircle className="w-4 h-4" />
                      <span>Grading sheet compiled & updated!</span>
                    </span>
                  )}
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2 shadow-md flex items-center gap-1.5">
                    <Save className="w-4 h-4" />
                    <span>Submit Subject Marksheet</span>
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: REPORT CARD ATTENDANCE LEDGER */}
      {/* ========================================================================= */}
      {activeMode === 'attendance' && (
        <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-4">
          {/* Header Info & Bulk Setter */}
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
                className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold px-3 py-1 rounded shadow-xs transition-all flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>सभी पर लागू करें</span>
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto">
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
                  <th className="px-4 py-2.5 text-center w-32">उपस्थिति % (Percentage)</th>
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
                  filteredStudents
                    .sort((a, b) => Number(a.rollNo) - Number(b.rollNo))
                    .map(st => {
                      const present = getStudentPresentDays(st);
                      const total = getStudentTotalDays(st);
                      const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
                      const numPct = Number(pct);
                      const isLow = numPct < 75;

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
                          {/* Present Days Input */}
                          <td className="px-4 py-1.5 text-center bg-emerald-50/30">
                            <input
                              type="number"
                              min="0"
                              max={total}
                              value={present}
                              onChange={e => handlePresentDaysChange(st.id, e.target.value)}
                              className="w-20 text-center font-mono font-black text-xs border border-emerald-300 rounded py-1 px-2 focus:bg-white bg-white text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                            />
                          </td>
                          {/* Total Days Input */}
                          <td className="px-4 py-1.5 text-center bg-slate-50/40">
                            <input
                              type="number"
                              min="1"
                              value={total}
                              onChange={e => handleTotalDaysChange(st.id, e.target.value)}
                              className="w-20 text-center font-mono font-bold text-xs border border-slate-300 rounded py-1 px-2 focus:bg-white bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                            />
                          </td>
                          {/* Percentage Badge */}
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
                          {/* Quick 100% full button */}
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleMarkFullAttendance(st)}
                              className="text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-300 px-2 py-0.5 rounded font-bold transition-all"
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

          {/* Save Attendance Footer */}
          {classStudents.length > 0 && (
            <div className="pt-4 flex flex-wrap justify-between items-center border-t border-slate-200 gap-4">
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

