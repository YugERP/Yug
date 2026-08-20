import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type ExamType, type ExamMark } from '../../types';
import { Award, CheckCircle, Search, Save, Clipboard } from 'lucide-react';

export function ExamResults() {
  const { students, marks, addMark } = useStore();
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [examType, setExamType] = useState<ExamType>('Half-Yearly Test');
  const [searchQuery, setSearchQuery] = useState('');

  const classStudents = students.filter(s => s.grade === selectedClass);
  const filteredStudents = classStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Dynamically compile subjects based on student enrollment choices
  const classSubjectsSet = new Set<string>();
  classStudents.forEach(st => {
    if (st.subjects) {
      st.subjects.forEach(sub => classSubjectsSet.add(sub));
    }
    if (st.optionalSubject) {
      classSubjectsSet.add(st.optionalSubject);
    }
  });
  
  const subjects = classSubjectsSet.size > 0 
    ? Array.from(classSubjectsSet).sort() 
    : ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Computer', 'Sanskrit', 'Art', 'Commerce', 'Home Science'];

  const [subject, setSubject] = useState(subjects[0] || 'Hindi');

  // Ensure subject is within valid list when class changes
  if (!subjects.includes(subject) && subjects.length > 0) {
    setSubject(subjects[0]);
  }

  // Local state for grade sheet entry
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});
  const [maxMarksMap, setMaxMarksMap] = useState<Record<string, number>>({});
  const [isSaved, setIsSaved] = useState(false);

  const classes = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const examTypes: ExamType[] = ['Half-Yearly Test', 'Half-Yearly Exam', 'Yearly Test', 'Yearly Exam'];

  const getObtainedMarks = (studentId: string) => {
    if (marksMap[studentId] !== undefined) return marksMap[studentId];
    
    // Check existing marks in state/database
    const existing = marks.find(m => m.studentId === studentId && m.examType === examType && m.subject.toLowerCase() === subject.toLowerCase());
    return existing ? existing.marksObtained : 0;
  };

  const getMaxMarks = (studentId: string) => {
    if (maxMarksMap[studentId] !== undefined) return maxMarksMap[studentId];
    
    // Check existing max marks
    const existing = marks.find(m => m.studentId === studentId && m.examType === examType && m.subject.toLowerCase() === subject.toLowerCase());
    return existing ? existing.maxMarks : 70; // 70 is standard starting UP Board core theory marks
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (classStudents.length === 0) return;

    for (const st of classStudents) {
      const marksObtained = getObtainedMarks(st.id);
      const maxMarks = getMaxMarks(st.id);

      await addMark({
        studentId: st.id,
        teacherId: 't001', // system approved administrative clerk
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

  return (
    <div className="space-y-4">
      {/* Search Header Config */}
      <Card className="p-4 bg-slate-50/50 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[130px]">
          <Label>Target Class</Label>
          <Input as="select" value={selectedClass} onChange={e => {
            setSelectedClass(e.target.value);
            setMarksMap({});
            setMaxMarksMap({});
            setIsSaved(false);
          }}>
            {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
          </Input>
        </div>
        <div className="flex-1 min-w-[150px]">
          <Label>Exam Type / Scheme</Label>
          <Input as="select" value={examType} onChange={e => {
            setExamType(e.target.value as ExamType);
            setMarksMap({});
            setMaxMarksMap({});
            setIsSaved(false);
          }}>
            {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
          </Input>
        </div>
        <div className="flex-1 min-w-[150px]">
          <Label>Subject Paper Select</Label>
          <Input as="select" value={subject} onChange={e => {
            setSubject(e.target.value);
            setMarksMap({});
            setMaxMarksMap({});
            setIsSaved(false);
          }}>
            {subjects.map(sb => <option key={sb} value={sb}>{sb}</option>)}
          </Input>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label>Filter Names</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input 
              type="text" 
              placeholder="Search Student..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full text-xs bg-white border border-slate-200 rounded pl-7 pr-2 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </Card>

      {/* Grade entry grid details */}
      <Card className="p-4 bg-white border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2 mb-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <Award className="w-4 h-4 text-indigo-600"/> Subject Result Sheet entry ledger ({subject})
            </h4>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">{examType}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-500">
              <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 w-16">Roll No</th>
                  <th className="px-4 py-2">Student Name</th>
                  <th className="px-4 py-2">UP Board SR No</th>
                  <th className="px-4 py-2 text-center w-32">Max marks</th>
                  <th className="px-4 py-2 text-center w-32">Marks obtained</th>
                  <th className="px-4 py-2 text-center w-28">Status indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 italic text-slate-400">No students are currently admitted to {selectedClass}. Register students first to record marks.</td>
                  </tr>
                ) : (() => {
                  const studentsHavingSubject = filteredStudents.filter(st => {
                    const hasMain = st.subjects && st.subjects.includes(subject);
                    const hasOpt = st.optionalSubject === subject;
                    if (classSubjectsSet.size === 0) return true; // Fallback if no subjects registered for class
                    return hasMain || hasOpt;
                  }).sort((a,b) => Number(a.rollNo) - Number(b.rollNo));

                  if (studentsHavingSubject.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="text-center py-6 italic text-slate-400">No student matched filter or opted for {subject}.</td>
                      </tr>
                    );
                  }

                  return studentsHavingSubject.map(st => {
                    const mObt = getObtainedMarks(st.id);
                    const mMax = getMaxMarks(st.id);
                    const pct = mMax > 0 ? (mObt / mMax) * 100 : 0;
                    const isFail = pct < 33;
                    
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono font-bold text-slate-700">{st.rollNo}</td>
                        <td className="px-4 py-2 font-black text-slate-800 text-xs">{st.name}</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{st.srNo || 'N/A'}</td>
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
                            <span className="text-[8px] uppercase font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1 px-1.5 leading-none">Fail/Improve</span>
                          ) : (
                            <span className="text-[8px] uppercase font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1 px-1.5 leading-none">Passed ({Math.round(pct)}%)</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {classStudents.length > 0 && (
            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
              <span className="text-[10px] text-slate-400 italic">
                * Submitting results directly commits changes live to the central school reporting transcripts.
              </span>
              <div className="flex items-center gap-3">
                {isSaved && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded shadow-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Grading sheet compiled & updated!</span>
                  </span>
                )}
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-6 py-2 shadow-md flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  <span>Submit Subject Marksheet</span>
                </Button>
              </div>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
