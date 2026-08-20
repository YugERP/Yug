import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Label, Input } from '../components/UI';
import { IndianRupee, Printer, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Student, FeeRecord } from '../types';
import { AdminPanel } from './AdminPanel';
import { TeacherPanel } from './TeacherPanel';

const CLASSES = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

export function ClerkPanel() {
  const { currentUser, schools, students, feeRecords, addFeePayment, classFees, setClassFee, getStudentBalance, updateStudent, attendances, saveAttendance, submitAttendanceRequest, attendanceRequests } = useStore();
  const [activeModule, setActiveModule] = useState<'fees' | 'admin' | 'teacher'>('fees');

  const [isRequestingCorrection, setIsRequestingCorrection] = useState(false);
  const [targetCorrectionStatus, setTargetCorrectionStatus] = useState<'Present' | 'Absent'>('Present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('portrait');

  const currentSchool = schools.find(s => s.id === (currentUser?.schoolId || ''));
  const activeFeatures = currentSchool?.features;
  const checkFeature = (id: string) => !currentSchool || !activeFeatures || activeFeatures.includes(id);

  const clerkModules = [
    { id: 'fees', label: 'Fee Management', show: checkFeature('fees') },
    { id: 'admin', label: 'Admin Functions', show: true },
    { id: 'teacher', label: 'Teacher Functions', show: true }
  ].filter(m => m.show);

  const [selectedClassConfig, setSelectedClassConfig] = useState('');
  const [classFeeAmount, setClassFeeAmount] = useState('');

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [remarks, setRemarks] = useState('');

  const [lastReceipt, setLastReceipt] = useState<{record: FeeRecord, student: Student, monthDisplay: string} | null>(null);
  
  const [viewingReceiptsFor, setViewingReceiptsFor] = useState<Student | null>(null);
  
  const [editingArrearsFor, setEditingArrearsFor] = useState<Student | null>(null);
  const [arrearsAmount, setArrearsAmount] = useState('');

  const handleSetClassFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassConfig || !classFeeAmount) return;
    setClassFee(selectedClassConfig, Number(classFeeAmount));
    setSelectedClassConfig('');
    setClassFeeAmount('');
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !amount || Number(amount) <= 0 || !month) return;
    
    const record = addFeePayment(selectedStudent, Number(amount), month, remarks);
    const student = students.find(s => s.id === selectedStudent);
    
    if (student) {
      setLastReceipt({ record, student, monthDisplay: month });
    }
    
    setAmount('');
    setMonth('');
    setRemarks('');
  };

  const handleUpdateArrears = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArrearsFor && arrearsAmount) {
      updateStudent(editingArrearsFor.id, { previousDues: Number(arrearsAmount) });
      setEditingArrearsFor(null);
      setArrearsAmount('');
    }
  };

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
      userRole: 'CLERK',
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

  const printReceipt = () => {
    window.print();
  };

  // Recompute balances since the app is fully dynamic now
  let totalDues = 0;
  students.forEach(s => {
    const bal = getStudentBalance(s.id);
    totalDues += bal.balance;
  });
  const totalCollections = feeRecords.reduce((acc, f) => acc + f.amount, 0);

  const chartData = [
    {
      name: 'Fees Overview',
      Collections: totalCollections,
      'Outstanding Dues': totalDues,
    }
  ];

  const filteredStudents = students.filter(s => s.grade === selectedClass);
  const selectedStudentObj = students.find(s => s.id === selectedStudent);
  const selectedStudentBal = selectedStudentObj ? getStudentBalance(selectedStudentObj.id) : null;

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
            <p className="text-xs font-bold text-slate-500 tracking-wide">Clerk / Fee Portal</p>
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
                ? `Your presence for today (${todayStr}) is logged as: ${myAttendanceToday.status}.` 
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
          <form onSubmit={handleCorrectionSubmit} className="bg-white p-3 rounded border border-indigo-150 space-y-3 mt-1 shadow-sm font-sans text-xs">
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
            <h4 className="text-[10px] font-bold text-indigo-900 uppercase font-sans">My Correction Request Statuses</h4>
            <div className="space-y-1.5 mt-1">
              {myRequests.map(req => (
                <div key={req.id} className="text-[10px] bg-white border rounded px-2.5 py-1.5 flex justify-between items-center shadow-sm font-sans">
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

      <div className="flex gap-3 border-b-2 border-slate-800 pb-3 overflow-x-auto mb-6">
        {clerkModules.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveModule(tab.id as any)}
            className={`px-4 py-2 font-bold rounded text-sm capitalize whitespace-nowrap transition-colors ${activeModule === tab.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200 border border-transparent'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeModule === 'fees' && checkFeature('fees') && (
        <div className="space-y-6">
          {/* Printable Receipt Area */}
      {lastReceipt && (
        <div className="mb-6 p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-emerald-800 font-bold">Payment Successful</h3>
            <div className="flex items-center gap-2">
              <select
                value={printLayout}
                onChange={(e) => setPrintLayout(e.target.value as any)}
                className="text-xs border-emerald-200 rounded px-2 py-1 mr-2 bg-white text-emerald-800 hidden md:block"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
              <Button onClick={printReceipt} className="bg-emerald-600 hover:bg-emerald-700 text-sm flex items-center gap-2"><Printer className="w-4 h-4"/> Print Receipt</Button>
              <Button onClick={() => setLastReceipt(null)} className="bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100 p-2 text-sm">Close</Button>
            </div>
          </div>
          
          <style>{`
            @media print {
              @page { size: A4 ${printLayout}; margin: 5mm; }
            }
          `}</style>

          <div id="printable-area" className="bg-white border rounded shadow-sm mx-auto" style={{ width: '105mm', padding: '15px' }}>
            <div className="text-center border-b border-slate-200 pb-2 mb-3">
              <h1 className="text-lg font-bold text-slate-800 uppercase">{currentSchool?.name || 'FEE RECEIPT'}</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Fee Collection Receipt</p>
            </div>
            <div className="text-[11px] text-slate-700 space-y-1 mb-4 flex justify-between">
               <div>
                 <p><span className="font-semibold text-slate-500">Receipt No:</span> {lastReceipt.record.id}</p>
                 <p><span className="font-semibold text-slate-500">Date:</span> {new Date(lastReceipt.record.date).toLocaleDateString()}</p>
               </div>
               <div className="text-right">
                 <p><span className="font-semibold text-slate-500">Month:</span> {lastReceipt.monthDisplay || lastReceipt.record.remarks?.split(' ')[0]}</p>
               </div>
            </div>
            <div className="text-[11px] text-slate-800 space-y-1.5 border-b border-slate-100 pb-3 mb-3">
              <p><span className="font-semibold text-slate-500 w-24 inline-block">Student Name:</span> {lastReceipt.student.name}</p>
              <p><span className="font-semibold text-slate-500 w-24 inline-block">Father's Name:</span> {lastReceipt.student.fatherName || 'N/A'}</p>
              <p><span className="font-semibold text-slate-500 w-24 inline-block">Class/Roll No:</span> {lastReceipt.student.grade} / {lastReceipt.student.rollNo}</p>
            </div>
            <div className="text-[12px] flex justify-between items-center mb-4">
              <span className="font-semibold text-slate-600">Amount Paid:</span>
              <span className="font-bold text-lg text-slate-900 border border-slate-200 px-2 py-1 rounded bg-slate-50">₹{lastReceipt.record.amount.toLocaleString()}</span>
            </div>
            
            {/* Show totals after this payment */}
            <div className="bg-slate-50 p-2 rounded text-[10px] space-y-1 mt-2 border border-slate-100">
              <div className="flex justify-between text-slate-500"><span>Total Class Fee:</span> <span>₹{getStudentBalance(lastReceipt.student.id).total.toLocaleString()}</span></div>
              <div className="flex justify-between text-slate-500"><span>Total Paid up to date:</span> <span>₹{getStudentBalance(lastReceipt.student.id).paid.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-slate-700 pt-1 border-t border-slate-200 mt-1"><span>Remaining Dues:</span> <span>₹{getStudentBalance(lastReceipt.student.id).balance.toLocaleString()}</span></div>
            </div>

            <div className="text-[9px] text-slate-400 text-center mt-6">
              * This is a computer generated receipt. Signature not required.
            </div>
          </div>
        </div>
      )}

      {/* Class Fee Configuration */}
      <Card className="p-4 border-l-4 border-l-blue-500">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
          Configure Class Fees (Yearly/Total)
        </h2>
        <form onSubmit={handleSetClassFee} className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Select Class</Label>
            <Input as="select" value={selectedClassConfig} onChange={e => setSelectedClassConfig(e.target.value)} required>
              <option value="">Choose Class...</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </Input>
          </div>
          <div className="flex-1">
            <Label>Total Fee Amount (₹)</Label>
            <Input type="number" min="0" value={classFeeAmount} onChange={e => setClassFeeAmount(e.target.value)} required placeholder="e.g. 25000" />
          </div>
          <Button type="submit" className="w-32 bg-blue-600 hover:bg-blue-700 text-white">Set Fee</Button>
        </form>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(classFees).filter(([cls]) => !cls.includes('_HalfYearly') && !cls.includes('_Yearly')).map(([cls, amt]) => (
            <div key={cls} className="bg-slate-100 px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-600 border border-slate-200">
              {cls}: <span className="text-blue-600">₹{amt.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {editingArrearsFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <Card className="p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Set Arrears (Previous Dues)</h2>
              <p className="text-sm text-slate-600 mb-4">Set the previous academic year pending dues for <span className="font-bold">{editingArrearsFor.name}</span>.</p>
              <form onSubmit={handleUpdateArrears} className="space-y-4">
                <div>
                  <Label>Arrears Amount (₹)</Label>
                  <Input type="number" min="0" value={arrearsAmount} onChange={e => setArrearsAmount(e.target.value)} required placeholder="e.g. 5000" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" onClick={() => setEditingArrearsFor(null)} className="bg-slate-200 text-slate-700 hover:bg-slate-300">Cancel</Button>
                  <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Save Arrears</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {viewingReceiptsFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <Card className="p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Fee Receipts</h2>
                  <p className="text-xs text-slate-500">{viewingReceiptsFor.name} ({viewingReceiptsFor.rollNo} / {viewingReceiptsFor.grade})</p>
                </div>
                <Button onClick={() => setViewingReceiptsFor(null)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 p-2 text-xs">Close</Button>
              </div>
              
              <div className="space-y-4">
                {feeRecords.filter(f => f.studentId === viewingReceiptsFor.id).length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No fee receipts found for this student.</p>
                ) : (
                  feeRecords.filter(f => f.studentId === viewingReceiptsFor.id).map(r => (
                    <div key={r.id} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">₹{r.amount.toLocaleString()} <span className="font-normal text-xs text-slate-500 ml-2">({new Date(r.date).toLocaleDateString()})</span></p>
                        <p className="text-xs text-slate-500 mt-1">{r.remarks || 'Fee Payment'}</p>
                      </div>
                      <Button onClick={() => { setViewingReceiptsFor(null); setLastReceipt({ record: r, student: viewingReceiptsFor, monthDisplay: r.remarks?.split(' ')[0] || '' }); }} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs px-3 py-1.5 flex items-center gap-1">
                        <Printer className="w-3 h-3" /> View / Print
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Record Fee Payment Form */}
        <Card className="p-4 md:col-span-2 border-l-4 border-l-emerald-500">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            Record Fee Payment
          </h2>
          <form onSubmit={handlePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
             <div className="md:col-span-1">
               <Label>1. Select Class</Label>
               <Input as="select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); }} required>
                 <option value="">Choose Class...</option>
                 {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
               </Input>
             </div>

             <div className="md:col-span-1">
               <Label>2. Select Student</Label>
               <Input as="select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} required disabled={!selectedClass}>
                 <option value="">Choose Student...</option>
                 {filteredStudents.map(s => (
                   <option key={s.id} value={s.id}>
                     {s.name} (Roll: {s.rollNo})
                   </option>
                 ))}
               </Input>
             </div>

             {selectedStudentBal && (
               <div className="md:col-span-2 bg-slate-50 p-3 rounded border border-slate-200 flex justify-between text-sm items-center">
                 <div>
                   <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Class Fee</p>
                   <p className="font-bold text-slate-700">₹{selectedStudentBal.total.toLocaleString()}</p>
                 </div>
                 <div>
                   <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Paid So Far</p>
                   <p className="font-bold text-emerald-600">₹{selectedStudentBal.paid.toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Pending Balance</p>
                   <p className="font-bold text-rose-600 text-lg">₹{selectedStudentBal.balance.toLocaleString()}</p>
                 </div>
               </div>
             )}

             <div className="md:col-span-1">
               <Label>3. Select Month</Label>
               <Input as="select" value={month} onChange={e => setMonth(e.target.value)} required>
                 <option value="">Choose Month...</option>
                 {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
               </Input>
             </div>
             
             <div className="md:col-span-1">
               <Label>4. Amount to Pay (₹)</Label>
               <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="e.g. 2000" />
             </div>

             <div className="md:col-span-2">
               <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-emerald-700">Submit Payment & Generate Receipt</Button>
             </div>
          </form>
        </Card>

        {/* Global Stats */}
        <Card className="p-4 bg-slate-900 border-slate-900 text-white flex flex-col justify-center items-center text-center">
          <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-400 mb-2">
            <IndianRupee className="h-6 w-6" />
          </div>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Total Collections</p>
          <p className="text-2xl font-bold text-emerald-400">₹{totalCollections.toLocaleString()}</p>
          
          <div className="w-full h-px bg-slate-800 my-4" />

          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Total Outstanding Dues</p>
          <p className="text-xl font-bold text-rose-400">₹{totalDues.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
          <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
          Financial Overview (Session)
        </h2>
        <div className="h-64 mt-4 text-xs font-semibold">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              barGap={40}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(value) => `₹${value / 1000}k`}
              />
              <Tooltip 
                cursor={{ fill: '#F1F5F9' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Collections" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={60} />
              <Bar dataKey="Outstanding Dues" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
          <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
          Student Fee Defaulters / Balances
        </h2>
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-left text-[12px] text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
              <tr>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-right">Total Fee</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(s => {
                const bal = getStudentBalance(s.id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono">{s.rollNo}</td>
                    <td className="px-4 py-2">
                       <span className="font-semibold text-slate-800 block">{s.name}</span>
                       <span className="text-[10px] text-slate-400 block -mt-1">Arrears: ₹{bal.previous.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-2">{s.grade}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-500">₹{bal.total.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">₹{bal.balance.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">
                      {bal.balance <= 0 ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider font-bold rounded-full">Cleared</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] uppercase tracking-wider font-bold rounded-full">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <Button onClick={() => setViewingReceiptsFor(s)} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200">Receipts</Button>
                      <Button onClick={() => { setEditingArrearsFor(s); setArrearsAmount(bal.previous.toString() === '0' ? '' : bal.previous.toString()); }} className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200">Set Arrears</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
      )}

      {activeModule === 'admin' && (
         <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Administration Module</h2>
            <AdminPanel />
         </div>
      )}

      {activeModule === 'teacher' && (
         <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Academic Module</h2>
            <TeacherPanel />
         </div>
      )}
    </div>
  );
}
