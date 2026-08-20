import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Label } from '../components/UI';
import { Printer, GraduationCap, Calendar, CreditCard } from 'lucide-react';
import type { ParentAccount, Student } from '../types';
import { StudentReportCard } from '../components/StudentReportCard';

export function ParentPanel() {
  const { currentUser, parentAccounts, students, schools, homeworks, marks, feeRecords, getStudentBalance, attendances, activeAcademicSession } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'homework' | 'results' | 'fees' | 'attendance'>('homework');
  const [showReportOverlay, setShowReportOverlay] = useState(false);

  if (!currentUser || currentUser.role !== 'PARENT') return null;

  // currentUser might be an older cached version without studentIds populated,
  // let's grab the real-time parent account from state
  const parent = parentAccounts.find(p => p.id === currentUser.id) || (currentUser as unknown as ParentAccount);
  const linkedStudents = students.filter(s => parent.studentIds?.includes(s.id));

  const activeStudentId = selectedStudentId || (linkedStudents.length > 0 ? linkedStudents[0].id : null);
  const student = linkedStudents.find(s => s.id === activeStudentId);

  if (linkedStudents.length === 0 || !student) {
    return (
      <Card className="p-8 text-center max-w-2xl mx-auto mt-10">
        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to Parent Portal</h2>
        <p className="text-slate-500 text-sm">
          There are currently no students linked to your account. Please contact the school administration to link your children to your mobile number.
        </p>
      </Card>
    );
  }

  const currentSchool = schools.find(s => s.id === (student.schoolId || ''));
  const activeFeatures = currentSchool?.features;
  const checkFeature = (id: string) => !currentSchool || !activeFeatures || activeFeatures.includes(id);

  const parentTabs = [
    { id: 'homework', label: 'Homework', show: checkFeature('homework') },
    { id: 'results', label: 'Examinations', show: checkFeature('marks') },
    { id: 'fees', label: 'Fee Due & History', show: checkFeature('fees') },
    { id: 'attendance', label: 'Attendance', show: checkFeature('attendance') }
  ].filter(t => t.show);

  const studentHomeworks = homeworks.filter(h => h.grade === student.grade);
  const studentMarks = marks.filter(m => m.studentId === student.id);
  const studentFees = feeRecords.filter(f => f.studentId === student.id);
  const studentBal = getStudentBalance(student.id);

  const studentAttendances = attendances.filter(a => a.studentId === student.id || a.userId === student.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* School Branding Header */}
      {currentSchool && (
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          {currentSchool.logo && (
            <img src={currentSchool.logo} alt="School Logo" className="w-16 h-16 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold uppercase text-slate-800 font-serif leading-tight">{currentSchool.name}</h1>
            <p className="text-xs font-bold text-slate-500 tracking-wide">Parent Portal</p>
          </div>
        </div>
      )}

      {/* Student Selector */}
      {linkedStudents.length > 1 && (
        <Card className="p-4 bg-indigo-50 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-indigo-900 text-sm">Select Child</h2>
            <p className="text-xs text-indigo-700">You have multiple children linked to your account. Switch between them here.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {linkedStudents.map(rs => (
              <button
                key={rs.id}
                onClick={() => setSelectedStudentId(rs.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${rs.id === activeStudentId ? 'bg-indigo-600 border-indigo-700 text-white shadow' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}
              >
                {rs.name} (Class {rs.grade})
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Student Summary Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
             {student.photoUrl || student.docStudentPhoto ? (
               <img src={student.photoUrl || student.docStudentPhoto} alt={student.name} className="w-full h-full object-cover" />
             ) : (
               <GraduationCap className="w-10 h-10 text-slate-400" />
             )}
          </div>
          <div className="text-center md:text-left text-white flex-1">
            <h1 className="text-2xl font-bold tracking-tight mb-1">{student.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-mono text-slate-300">
              <span>Adm No: {student.admissionNo || 'N/A'}</span>
              <span>•</span>
              <span>Class: {student.grade}</span>
              <span>•</span>
              <span>Roll No: {student.rollNo}</span>
            </div>
          </div>
          {checkFeature('fees') && (
             <div className="bg-slate-900 rounded-lg p-3 text-center min-w-[120px] border border-slate-700">
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Dues</div>
               <div className={`text-lg font-mono font-bold ${studentBal.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>₹{studentBal.balance}</div>
             </div>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar p-2 bg-slate-50 border-b border-slate-200">
          {parentTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-semibold rounded-md text-xs uppercase tracking-wider transition-all border ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm border-slate-200 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 bg-slate-50 min-h-[400px]">
          {activeTab === 'homework' && checkFeature('homework') && (
            <div>
              <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> Recent Assignments
              </h3>
              {studentHomeworks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No assignments posted for Class {student.grade}.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentHomeworks.map(hw => (
                    <div key={hw.id} className="bg-white border text-sm border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-slate-100 text-slate-700 text-[10px] uppercase px-2 py-0.5 font-bold rounded">{hw.subject}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(hw.date).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 leading-tight mb-1">{hw.title}</h4>
                      <p className="text-slate-600 text-xs">{hw.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && checkFeature('marks') && (
            <div>
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-1 h-4 bg-purple-500 rounded-full"></span> Academic Results
                  </h3>
                  <Button 
                    onClick={() => setShowReportOverlay(true)} 
                    className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] py-1 px-3 flex items-center gap-1.5 rounded font-bold transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Report Card</span>
                  </Button>
               </div>
               
              {studentMarks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No marks have been recorded yet.</div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Exam Type</th>
                        <th className="px-4 py-3 text-right">Marks Obtained</th>
                        <th className="px-4 py-3 text-right">Max Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentMarks.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{m.subject}</td>
                          <td className="px-4 py-3 text-xs font-mono">{m.examType}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{m.marksObtained}</td>
                          <td className="px-4 py-3 text-right text-slate-500 text-xs">{m.maxMarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fees' && checkFeature('fees') && (
            <div>
               <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                 <span className="w-1 h-4 bg-emerald-500 rounded-full"></span> Fee Details & Statement
               </h3>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-white border justify-center border-slate-200 rounded p-4 text-center">
                   <div className="text-[10px] text-slate-400 uppercase font-bold">Total Fees</div>
                   <div className="text-lg font-bold text-slate-800">₹{studentBal.total}</div>
                 </div>
                 <div className="bg-white border justify-center border-slate-200 rounded p-4 text-center">
                   <div className="text-[10px] text-slate-400 uppercase font-bold">Previous Dues</div>
                   <div className="text-lg font-bold text-amber-600">₹{studentBal.previous}</div>
                 </div>
                 <div className="bg-white border justify-center border-slate-200 rounded p-4 text-center">
                   <div className="text-[10px] text-slate-400 uppercase font-bold">Paid</div>
                   <div className="text-lg font-bold text-emerald-600">₹{studentBal.paid}</div>
                 </div>
                 <div className="bg-white border justify-center border-emerald-300 shadow-sm rounded p-4 text-center">
                   <div className="text-[10px] text-slate-500 uppercase font-bold text-emerald-800">Net Due Balance</div>
                   <div className={`text-xl font-black ${studentBal.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>₹{studentBal.balance}</div>
                 </div>
               </div>

              {studentFees.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No fee receipts found.</div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Comments/Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentFees.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">{new Date(f.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${f.type === 'Payment' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {f.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">₹{f.amount}</td>
                          <td className="px-4 py-3 text-xs italic text-slate-500">{f.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && checkFeature('attendance') && (
            <div>
              <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Attendance History
              </h3>
              
              {studentAttendances.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No attendance records found yet.</div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600">
                     <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-bold border-b border-slate-200">
                       <tr>
                         <th className="px-4 py-3">Date</th>
                         <th className="px-4 py-3 text-center">Status</th>
                         <th className="px-4 py-3 text-right">Reason</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {studentAttendances.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs">{a.date}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${a.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Absent' ? 'bg-rose-100 text-rose-700' : a.status === 'Excused' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs">
                              {a.leaveReason ? <span className="text-amber-600 font-medium">Early leave: {a.leaveReason}</span> : '-'}
                            </td>
                          </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showReportOverlay && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto no-print">
          <div className="bg-white rounded max-w-4xl w-full flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Center
              </h3>
              <div className="flex gap-2 text-sm">
                <button onClick={() => window.print()} className="px-3 py-1 font-semibold text-white bg-indigo-600 rounded">Print Card</button>
                <button onClick={() => setShowReportOverlay(false)} className="px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100 rounded">Close</button>
              </div>
            </div>
            <div className="overflow-y-auto w-full p-4 printable-content flex justify-center bg-slate-100">
              <StudentReportCard student={student} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
