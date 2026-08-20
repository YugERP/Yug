import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Label, Input } from '../components/UI';
import { type ExamType } from '../types';
import { AttendanceTracker } from '../components/erp/AttendanceTracker';
import { BulkResultsPrinter } from '../components/erp/BulkResultsPrinter';
import { UserCheck } from 'lucide-react';

export function TeacherPanel() {
  const { currentUser, schools, students, homeworks, marks, addHomework, addMark, saveAttendance, attendances, submitAttendanceRequest, attendanceRequests } = useStore();
  const [activeTab, setActiveTab ] = useState<'attendance' | 'homework' | 'marks' | 'results'>('attendance');

  const [isRequestingCorrection, setIsRequestingCorrection] = useState(false);
  const [targetCorrectionStatus, setTargetCorrectionStatus] = useState<'Present' | 'Absent'>('Present');
  const [correctionReason, setCorrectionReason] = useState('');

  const currentSchool = schools.find(s => s.id === (currentUser?.schoolId || ''));
  const activeFeatures = currentSchool?.features;
  const checkFeature = (id: string) => !currentSchool || !activeFeatures || activeFeatures.includes(id);

  const teacherTabs = [
    { id: 'attendance', label: 'Take Attendance', show: checkFeature('attendance') },
    { id: 'homework', label: 'Assign Homework', show: checkFeature('homework') },
    { id: 'marks', label: 'Upload Marks', show: checkFeature('marks') },
    { id: 'results', label: 'View & Print Results', show: checkFeature('marks') }
  ].filter(t => t.show);

  // Homework form state
  const [hwClass, setHwClass] = useState('');
  const [hwSubject, setHwSubject] = useState('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');

  // Marks form state
  const [markGrade, setMarkGrade] = useState('');
  const [markStudentId, setMarkStudentId] = useState('');
  const [markExamType, setMarkExamType] = useState<ExamType>('Half-Yearly Test');
  const [markSubject, setMarkSubject] = useState('');
  const [markObtained, setMarkObtained] = useState('');
  const [markMax, setMarkMax] = useState('100');

  const selectedStudent = students.find(s => s.id === markStudentId);
  const uploadedSubjectsForStudentAndExam = marks
    .filter(m => m.studentId === markStudentId && m.examType === markExamType)
    .map(m => m.subject);

  const availableStudentSubjects = (selectedStudent 
    ? [...(selectedStudent.subjects || []), selectedStudent.optionalSubject].filter(Boolean)
    : ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Computer', 'Sanskrit', 'Art', 'Commerce', 'Home Science']
  ).filter(sub => !uploadedSubjectsForStudentAndExam.includes(String(sub)));

  const handleGiveHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !hwClass || !hwSubject || !hwTitle) return;
    addHomework({
      teacherId: currentUser.id,
      grade: hwClass,
      subject: hwSubject,
      title: hwTitle,
      description: hwDesc
    });
    setHwTitle(''); setHwDesc('');
  };

  const handleUploadMarks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !markStudentId || !markSubject || !markObtained || !markMax) return;
    addMark({
      studentId: markStudentId,
      teacherId: currentUser.id,
      examType: markExamType,
      subject: markSubject,
      marksObtained: Number(markObtained),
      maxMarks: Number(markMax)
    });
    setMarkSubject('');
    setMarkObtained('');
  };

  const isSuperUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'CLERK';
  const myHomeworks = isSuperUser ? homeworks : homeworks.filter(h => h.teacherId === currentUser?.id);
  const myUploadedMarks = isSuperUser ? marks : marks.filter(m => m.teacherId === currentUser?.id);

  const todayStr = new Date().toISOString().split('T')[0];
  const myAttendanceToday = attendances.find(a => a.userId === currentUser?.id && a.date === todayStr);

  const markSelfAttendance = async (status: 'Present' | 'Absent' | 'Excused' | 'Leave') => {
    if (!currentUser) return;
    await saveAttendance([{
      id: `${currentUser.id}_${todayStr}`,
      schoolId: '',
      userId: currentUser.id,
      userType: currentUser.role === 'TEACHER' ? 'TEACHER' : 'CLERK',
      date: todayStr,
      status: status
    }]);
    alert(`You have successfully marked your attendance as ${status} for today!`);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!correctionReason.trim()) {
      alert("Please specify a reason for the correction.");
      return;
    }
    await submitAttendanceRequest({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'TEACHER',
      date: todayStr,
      currentStatus: myAttendanceToday?.status,
      requestedStatus: targetCorrectionStatus,
      reason: correctionReason,
    });
    alert("Correction request submitted to Admin successfully!");
    setIsRequestingCorrection(false);
    setCorrectionReason('');
  };

  const myRequests = attendanceRequests.filter(r => r.userId === currentUser?.id);

  return (
    <div className="space-y-6">
      {/* School Branding Header */}
      {currentSchool && (
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          {currentSchool.logo && (
            <img src={currentSchool.logo} alt="School Logo" className="w-16 h-16 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold uppercase text-slate-800 font-serif leading-tight">{currentSchool.name}</h1>
            <p className="text-xs font-bold text-slate-500 tracking-wide">Teacher Portal</p>
          </div>
        </div>
      )}

      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-150 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> My Daily Attendance Register
            </h2>
            <p className="text-[11px] text-indigo-700 mt-1">
              {myAttendanceToday 
                ? `Your presence for today (${todayStr}) is locked as: ${myAttendanceToday.status}.` 
                : `You have not marked your presence for today (${todayStr}) yet.`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              disabled={!!myAttendanceToday} 
              onClick={() => markSelfAttendance('Present')} 
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold py-1.5 px-3 border-transparent text-white shadow-sm"
            >
              Mark Present
            </Button>
            <Button 
              disabled={!!myAttendanceToday} 
              onClick={() => markSelfAttendance('Absent')} 
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold py-1.5 px-3 border-transparent text-white shadow-sm"
            >
              Mark Absent
            </Button>
            <Button 
              disabled={myAttendanceToday?.status !== 'Present'} 
              onClick={() => markSelfAttendance('Excused')} 
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold py-1.5 px-3 border-transparent text-white shadow-sm"
            >
              Leave / Check-out
            </Button>
          </div>
        </div>

        {myAttendanceToday && (
          <div className="border-t border-indigo-100 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <span className="text-[10px] text-indigo-800">
              Need to change your attendance? You cannot self-correct after marking to protect register integrity.
            </span>
            <Button 
              onClick={() => {
                setTargetCorrectionStatus(myAttendanceToday.status === 'Absent' ? 'Present' : 'Absent');
                setIsRequestingCorrection(!isRequestingCorrection);
              }} 
              className="bg-slate-700 hover:bg-slate-800 text-[9px] font-bold py-1 px-2 border-transparent text-white self-start md:self-auto"
            >
              {isRequestingCorrection ? 'Cancel Request' : 'Request Correction from Admin'}
            </Button>
          </div>
        )}

        {isRequestingCorrection && (
          <form onSubmit={handleCorrectionSubmit} className="bg-white p-3 rounded border border-indigo-150 space-y-3 mt-1 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800">Submit Attendance Correction Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-slate-500">Requested Attendance Status</Label>
                <Input 
                  as="select" 
                  value={targetCorrectionStatus} 
                  onChange={e => setTargetCorrectionStatus(e.target.value as 'Present' | 'Absent')}
                  className="text-xs"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Leave / Excused</option>
                </Input>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 font-bold">Reason for Change (e.g. mistake, late arrival)</Label>
                <Input 
                  type="text" 
                  placeholder="Explain why correction is needed..." 
                  value={correctionReason} 
                  onChange={e => setCorrectionReason(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                onClick={() => setIsRequestingCorrection(false)} 
                className="bg-slate-200 hover:bg-slate-300 text-[10px] text-slate-700 border-transparent py-1 px-3"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-[10px] text-white border-transparent py-1 px-3"
              >
                Submit Correction Request
              </Button>
            </div>
          </form>
        )}

        {myRequests.length > 0 && (
          <div className="mt-2 border-t border-indigo-100 pt-3">
            <h4 className="text-[10px] font-bold text-indigo-900 uppercase">My Correction Request Statuses</h4>
            <div className="space-y-1.5 mt-1">
              {myRequests.map(req => (
                <div key={req.id} className="text-[10px] bg-white border rounded px-2.5 py-1.5 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="font-semibold text-slate-700">Date: {req.date}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-slate-600">Requested status: <strong className="text-indigo-600 font-bold">{req.requestedStatus}</strong></span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">Reason: "{req.reason}"</span>
                  </div>
                  <div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide border ${
                      req.status === 'Approved' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : req.status === 'Rejected' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {teacherTabs.length > 0 && (
        <div className="flex gap-3 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
          {teacherTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 font-medium rounded text-xs capitalize transition-colors border ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow border-transparent' : 'text-slate-600 hover:bg-slate-100 border-transparent'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {teacherTabs.length === 0 && (
        <div className="text-center py-10 text-slate-500 italic">No modules accessible holding your current permissions context.</div>
      )}

      {activeTab === 'attendance' && checkFeature('attendance') && (
        <Card className="p-4 bg-white border border-slate-200">
           <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
             <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
             Class Attendance Tracker
           </h2>
           <AttendanceTracker />
        </Card>
      )}

      {activeTab === 'homework' && checkFeature('homework') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
              Assign New Homework
            </h2>
            <form onSubmit={handleGiveHomework} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Class/Grade</Label>
                  <Input as="select" value={hwClass} onChange={e => setHwClass(e.target.value)}>
                    <option value="">Select...</option>
                    {['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => <option key={c} value={c}>{c}</option>)}
                  </Input>
                </div>
                <div><Label>Subject</Label><Input value={hwSubject} onChange={e => setHwSubject(e.target.value)} placeholder="e.g. Math" /></div>
              </div>
              <div><Label>Title</Label><Input value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="Homework Title" /></div>
              <div>
                <Label>Description</Label>
                <textarea 
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] placeholder:text-slate-400" 
                  value={hwDesc} 
                  onChange={e => setHwDesc(e.target.value)} 
                  placeholder="Describe the task..." 
                />
              </div>
              <Button type="submit" className="w-full">Assign Homework</Button>
            </form>
          </Card>

          <Card className="p-4">
             <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
               <span className="w-1.5 h-4 bg-slate-400 rounded-full"></span>
               Recent Assignments
             </h2>
             <div className="space-y-2">
               {myHomeworks.length === 0 ? <p className="text-center py-4 text-slate-500 text-xs">No homework assigned yet.</p> : null}
               {myHomeworks.map(hw => (
                 <div key={hw.id} className="p-2 border border-slate-200 bg-slate-50 rounded">
                   <div className="flex justify-between items-start mb-1">
                     <span className="font-bold text-indigo-700 text-[10px] uppercase tracking-wider">{hw.subject} • {hw.grade}</span>
                     <span className="text-[10px] text-slate-400">{new Date(hw.date).toLocaleDateString()}</span>
                   </div>
                   <h3 className="font-semibold text-slate-800 text-xs">{hw.title}</h3>
                 </div>
               ))}
             </div>
          </Card>
        </div>
      )}

      {activeTab === 'marks' && checkFeature('marks') && (
        <Card className="p-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
            Upload Examination Results
          </h2>
          <form onSubmit={handleUploadMarks} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 items-end bg-slate-50 p-3 rounded border border-slate-200 text-xs">
             <div>
               <Label>Class</Label>
               <Input as="select" value={markGrade} onChange={e => {
                   setMarkGrade(e.target.value);
                   setMarkStudentId('');
                   setMarkSubject('');
               }}>
                 <option value="">All Classes...</option>
                 {Array.from(new Set(students.map(s => s.grade))).sort().map(grade => (
                   <option key={grade} value={grade}>{grade}</option>
                 ))}
               </Input>
             </div>
             <div>
               <Label>Student</Label>
               <Input as="select" value={markStudentId} onChange={e => {
                   setMarkStudentId(e.target.value);
                   setMarkSubject('');
               }}>
                 <option value="">Select Student...</option>
                 {students.filter(s => markGrade === '' || s.grade === markGrade).map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
               </Input>
             </div>
             <div>
               <Label>Exam Type</Label>
               <Input as="select" value={markExamType} onChange={e => {
                   setMarkExamType(e.target.value as ExamType);
                   setMarkSubject('');
               }}>
                 <option value="Half-Yearly Test">Half-Yearly Test</option>
                 <option value="Half-Yearly Exam">Half-Yearly Exam</option>
                 <option value="Yearly Test">Yearly Test</option>
                 <option value="Yearly Exam">Yearly Exam</option>
               </Input>
             </div>
             <div>
               <Label>Subject</Label>
               <Input as="select" value={markSubject} onChange={e => setMarkSubject(e.target.value)}>
                 <option value="">Select Subject...</option>
                 {availableStudentSubjects.map(sub => (
                   <option key={sub} value={sub}>{sub}</option>
                 ))}
               </Input>
             </div>
             <div>
               <Label>Marks Obtained</Label>
               <Input type="number" min="0" value={markObtained} onChange={e => setMarkObtained(e.target.value)} />
             </div>
             <div>
               <Label>Max Marks</Label>
               <Input type="number" min="1" value={markMax} onChange={e => setMarkMax(e.target.value)} />
             </div>
             <div className="md:col-span-3 flex justify-end">
                <Button type="submit" className="w-full md:w-auto">Upload Marks</Button>
             </div>
          </form>

          <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-2">Recently Uploaded Marks</h3>
           <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left text-[12px] text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
                <tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Exam</th><th className="px-4 py-2">Subject</th><th className="px-4 py-2 text-indigo-600">Score</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myUploadedMarks.map(m => {
                  const s = students.find(x => x.id === m.studentId);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-semibold text-slate-800">{s?.name || 'Unknown'}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] border border-slate-200">{m.examType}</span>
                      </td>
                      <td className="px-4 py-2 font-medium">{m.subject}</td>
                      <td className="px-4 py-2 font-mono text-indigo-700 font-bold bg-indigo-50/50">{m.marksObtained} / {m.maxMarks}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'results' && checkFeature('marks') && (
        <Card className="p-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2 no-print">
            <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
            View & Print Report Cards
          </h2>
          <BulkResultsPrinter />
        </Card>
      )}
    </div>
  );
}