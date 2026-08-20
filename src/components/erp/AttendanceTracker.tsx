import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type AttendanceRecord } from '../../types';
import { Check, X, ShieldAlert, Sparkles, Calendar, Search, Printer, Download } from 'lucide-react';

export function AttendanceTracker() {
  const { currentUser, students, teachers, users, attendances, saveAttendance, addNotificationLog, attendanceRequests, approveAttendanceRequest, rejectAttendanceRequest } = useStore();
  const [viewTab, setViewTab] = useState<'daily' | 'monthly'>('daily');
  
  // Daily view states
  const [attendanceType, setAttendanceType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Monthly view states
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear().toString());
  const [reportMonth, setReportMonth] = useState(() => (new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [reportClass, setReportClass] = useState('Class 9');
  const [reportType, setReportType] = useState<'STUDENT' | 'STAFF'>('STUDENT');

  // Current attendance states in-flight
  const [statusMap, setStatusMap] = useState<Record<string, 'Present' | 'Absent' | 'Excused'>>({});
  const [searchWord, setSearchWord] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const classes = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const classStudents = attendanceType === 'STUDENT' ? students.filter(s => s.grade === selectedClass) : [];
  let staffMembers = attendanceType === 'STAFF'
    ? [
        ...users.filter(u => u.role === 'TEACHER' || u.role === 'CLERK'),
        ...teachers
      ]
    : [];

  staffMembers = Array.from(new Map(staffMembers.map(item => [item.id, item])).values());
  if (currentUser?.role === 'TEACHER') {
    staffMembers = staffMembers.filter(m => m.id === currentUser.id);
  }
  
  const currentEntityList = attendanceType === 'STUDENT' ? classStudents : staffMembers;
  const filteredEntities = currentEntityList.filter(s => s.name.toLowerCase().includes(searchWord.toLowerCase()));

  const pendingRequests = (attendanceRequests || []).filter(req => 
    req.status === 'Pending' && 
    (currentUser?.role === 'MASTER_ADMIN' || req.schoolId === currentUser?.schoolId)
  );

  const historicRequests = (attendanceRequests || []).filter(req => 
    req.status !== 'Pending' && 
    (currentUser?.role === 'MASTER_ADMIN' || req.schoolId === currentUser?.schoolId)
  );

  // Setup default 'Present' for entities who don't have a status yet in current state
  const getStatus = (entityId: string) => {
    if (statusMap[entityId]) return statusMap[entityId];
    
    // Check if there is an existing database record for this date and entity
    const existing = attendances.find(a => (a.userId === entityId || a.studentId === entityId) && a.date === selectedDate);
    if (existing) return existing.status;

    return 'Present'; // default
  };

  const handleStatusChange = (entityId: string, status: 'Present' | 'Absent' | 'Excused') => {
    setStatusMap(prev => ({
      ...prev,
      [entityId]: status
    }));
    setIsSaved(false);
  };

  const markAll = (status: 'Present' | 'Absent' | 'Excused') => {
    const nextMap: Record<string, 'Present' | 'Absent' | 'Excused'> = {};
    currentEntityList.forEach(s => {
      nextMap[s.id] = status;
    });
    setStatusMap(nextMap);
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentEntityList.length === 0) return;

    const entitiesToSave = currentEntityList.filter(s => {
      const existing = attendances.find(a => (a.userId === s.id || a.studentId === s.id) && a.date === selectedDate);
      return !existing;
    });

    if (entitiesToSave.length === 0) {
      alert("All students' attendance is already recorded for this date. Cannot change existing records.");
      return;
    }

    const recordsToSave: AttendanceRecord[] = entitiesToSave.map(s => {
      if (attendanceType === 'STUDENT') {
        const student = s as typeof students[0];
        return {
          id: `${student.id}_${selectedDate}`,
          schoolId: '', // store sets it
          studentId: student.id,
          userId: student.id,
          userType: 'STUDENT',
          grade: student.grade,
          date: selectedDate,
          status: getStatus(student.id)
        } as AttendanceRecord;
      } else {
        const staff = s as typeof users[0];
        return {
          id: `${staff.id}_${selectedDate}`,
          schoolId: '', // store sets it
          userId: staff.id,
          userType: staff.role === 'TEACHER' ? 'TEACHER' : 'CLERK',
          date: selectedDate,
          status: getStatus(staff.id)
        } as AttendanceRecord;
      }
    });

    await saveAttendance(recordsToSave);
    setIsSaved(true);

    if (attendanceType === 'STUDENT') {
      // Send virtual SMS warnings to parents of newly marked ABSENT students
      const absentStudents = entitiesToSave.filter(s => getStatus(s.id) === 'Absent');
      for (const abs of absentStudents as typeof students) {
        await addNotificationLog({
          type: 'SMS',
          recipientName: abs.fatherName || abs.name,
          mobile: abs.fatherMobile || abs.mobile || '91XXXXXXXX',
          category: 'Attendance',
          message: `Dear Parent, your child ${abs.name} (Roll No: ${abs.rollNo}, Class: ${abs.grade}) of T.R.S.M College is ABSENT today (${new Date(selectedDate).toLocaleDateString()}) without prior leave application. Kindly advise.`,
          status: 'Delivered'
        });
      }
    }

    setTimeout(() => {
      setIsSaved(false);
    }, 4000);
  };

  const presentCount = currentEntityList.filter(s => getStatus(s.id) === 'Present').length;
  const absentCount = currentEntityList.filter(s => getStatus(s.id) === 'Absent').length;
  const excusedCount = currentEntityList.filter(s => getStatus(s.id) === 'Excused').length;

  // Monthly report calculations
  let monthlyPeople = reportType === 'STUDENT'
    ? students.filter(s => s.grade === reportClass)
    : [
        ...users.filter(u => u.role === 'TEACHER' || u.role === 'CLERK'),
        ...teachers
      ];

  if (reportType === 'STAFF') {
    monthlyPeople = Array.from(new Map(monthlyPeople.map(item => [item.id, item])).values());
    if (currentUser?.role === 'TEACHER') {
      monthlyPeople = monthlyPeople.filter(m => m.id === currentUser.id);
    }
  }

  const daysInSelMonth = Array.from(
    { length: new Date(Number(reportYear), Number(reportMonth), 0).getDate() },
    (_, i) => (i + 1).toString().padStart(2, '0')
  );

  let totalLogsForMonth = 0;
  let totalPresentLogs = 0;
  let totalAbsentLogs = 0;
  let totalLeaveLogs = 0;

  monthlyPeople.forEach(p => {
    daysInSelMonth.forEach(day => {
      const fullDate = `${reportYear}-${reportMonth}-${day}`;
      const record = attendances.find(a => (a.userId === p.id || a.studentId === p.id) && a.date === fullDate);
      if (record) {
        totalLogsForMonth++;
        if (record.status === 'Present') totalPresentLogs++;
        else if (record.status === 'Absent') totalAbsentLogs++;
        else if (record.status === 'Excused' || record.status === 'Leave') totalLeaveLogs++;
      }
    });
  });

  const overallPercentage = (totalPresentLogs + totalAbsentLogs) > 0
    ? Math.round((totalPresentLogs / (totalPresentLogs + totalAbsentLogs)) * 100)
    : 100;

  const handleExportCSV = () => {
    const headers = [
      reportType === 'STUDENT' ? 'Roll No' : 'Staff ID',
      'Name',
      'Role/Class',
      ...daysInSelMonth.map(d => `${reportMonth}/${d}`),
      'P', 'A', 'L', 'Attendance %'
    ];

    const rows = monthlyPeople.map((st, idx) => {
      let pCount = 0;
      let aCount = 0;
      let lCount = 0;

      const dailyStatuses = daysInSelMonth.map(day => {
        const fullDate = `${reportYear}-${reportMonth}-${day}`;
        const record = attendances.find(a => (a.userId === st.id || a.studentId === st.id) && a.date === fullDate);
        if (record) {
          if (record.status === 'Present') { pCount++; return 'P'; }
          if (record.status === 'Absent') { aCount++; return 'A'; }
          if (record.status === 'Excused' || record.status === 'Leave') { lCount++; return 'L'; }
        }
        return '-';
      });

      const totalActive = pCount + aCount;
      const pct = totalActive > 0 ? `${Math.round((pCount / totalActive) * 100)}%` : '100%';

      return [
        reportType === 'STUDENT' ? ((st as any).rollNo || '') : `Staff-${idx + 1}`,
        st.name,
        reportType === 'STUDENT' ? ((st as any).grade || '') : st.role,
        ...dailyStatuses,
        pCount.toString(),
        aCount.toString(),
        lCount.toString(),
        pct
      ];
    });

    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Attendance_${reportYear}_${reportMonth}_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthsList = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const yearsList = ['2025', '2026', '2027'];

  return (
    <div className="space-y-4">
      {/* Sub-tab segment selection */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 no-print font-sans">
        <button
          type="button"
          onClick={() => setViewTab('daily')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
            viewTab === 'daily'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          📅 Daily Attendance Entry
        </button>
        <button
          type="button"
          onClick={() => setViewTab('monthly')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
            viewTab === 'monthly'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          📊 Monthly Record Report
        </button>
      </div>

      {viewTab === 'daily' ? (
        <>
          {/* Attendance correction requests for Admin */}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER_ADMIN') && (
            <Card className="p-4 border-amber-200 bg-amber-50/20 space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-sans">
                  Staff Attendance Correction Requests
                </h3>
                <span className="bg-amber-600 text-white font-black px-2 py-0.5 rounded-full text-[9px] font-mono">
                  {pendingRequests.length} pending
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic font-sans animate-pulse">No pending attendance correction requests from staff members.</p>
              ) : (
                <div className="divide-y divide-amber-100 max-h-60 overflow-y-auto">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-sans">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800">{req.userName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                            {req.userRole}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Wants to correct attendance on <strong className="font-mono text-slate-800">{req.date}</strong> from <span className="font-bold underline">{req.currentStatus || 'Not Marked'}</span> to <span className="font-bold text-indigo-600 underline">{req.requestedStatus}</span>.
                        </p>
                        {req.reason && (
                          <p className="text-[10px] text-slate-500 bg-white border rounded px-2 py-1 mt-1.5 italic max-w-xl">
                            " {req.reason} "
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto font-mono">
                        <button
                          type="button"
                          onClick={() => approveAttendanceRequest(req.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectAttendanceRequest(req.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {historicRequests.length > 0 && (
                <details className="pt-2 border-t border-slate-200 mt-1 font-sans">
                  <summary className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                    View Past Correction Request Logs ({historicRequests.length})
                  </summary>
                  <div className="mt-2 divide-y divide-slate-100 max-h-45 overflow-y-auto pr-1">
                    {historicRequests.map(req => (
                      <div key={req.id} className="py-1.5 flex justify-between items-center text-[10px] text-slate-500">
                        <div>
                          <span className="font-bold text-slate-700">{req.userName}</span>
                          <span className="mx-1 text-slate-300">|</span>
                          <span>Date: {req.date}</span>
                          <span className="mx-1 text-slate-300">|</span>
                          <span>Requested: {req.requestedStatus}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          )}

          {/* Filtering selectors */}
          <Card className="p-4 bg-slate-50/50 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Attendance Type</Label>
              <Input as="select" value={attendanceType} onChange={e => {
                setAttendanceType(e.target.value as 'STUDENT' | 'STAFF');
                setStatusMap({});
                setIsSaved(false);
              }}>
                <option value="STUDENT">Students</option>
                <option value="STAFF">{currentUser?.role === 'TEACHER' ? 'My Daily Attendance' : 'Staff (Teachers & Clerks)'}</option>
              </Input>
            </div>
            {attendanceType === 'STUDENT' && (
              <div className="flex-1 min-w-[150px]">
                <Label>Target Class</Label>
                <Input as="select" value={selectedClass} onChange={e => {
                  setSelectedClass(e.target.value);
                  setStatusMap({});
                  setIsSaved(false);
                }}>
                  {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                </Input>
              </div>
            )}
            <div className="flex-1 min-w-[150px]">
              <Label>Register Entry Date</Label>
              <Input type="date" value={selectedDate} onChange={e => {
                setSelectedDate(e.target.value);
                setStatusMap({});
                setIsSaved(false);
              }} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Quick filter by name</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input 
                  type="text" 
                  placeholder="Filter names..." 
                  value={searchWord} 
                  onChange={e => setSearchWord(e.target.value)} 
                  className="w-full text-xs bg-white border border-slate-200 rounded pl-7 pr-2 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </Card>

          {/* Stats counter */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 rounded border border-emerald-100 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase font-sans">Present</span>
              <span className="text-sm font-black text-emerald-950 font-mono">{presentCount} {attendanceType === 'STUDENT' ? 'students' : 'staff'}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded border border-rose-100 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-rose-800 uppercase font-sans">Absent</span>
              <span className="text-sm font-black text-rose-950 font-mono">{absentCount} {attendanceType === 'STUDENT' ? 'students' : 'staff'}</span>
            </div>
            <div className="p-3 bg-slate-100 rounded border border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase font-sans">Excused Leave</span>
              <span className="text-sm font-black text-slate-700 font-mono">{excusedCount} {attendanceType === 'STUDENT' ? 'students' : 'staff'}</span>
            </div>
          </div>

          {/* Directory Registration sheet */}
          <Card className="p-4 bg-white border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2 mb-2 font-sans">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-indigo-600"/> {attendanceType === 'STUDENT' ? 'Class Attendance' : 'Staff Attendance'} register
                </h4>
                
                {currentEntityList.length > 0 && (
                  <div className="flex gap-1.5 text-[10px] font-bold uppercase no-print">
                    <button type="button" onClick={() => markAll('Present')} className="text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded border border-emerald-200">Mark all present</button>
                    <button type="button" onClick={() => markAll('Absent')} className="text-rose-700 hover:bg-rose-50 px-2 py-1 rounded border border-rose-200">Mark all absent</button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-500 font-sans">
                  <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 w-16">{attendanceType === 'STUDENT' ? 'Roll No' : 'ID'}</th>
                      <th className="px-4 py-2">{attendanceType === 'STUDENT' ? 'Student Name' : 'Staff Name'}</th>
                      <th className="px-4 py-2">{attendanceType === 'STUDENT' ? 'Parent / Contact' : 'Role & Email'}</th>
                      <th className="px-4 py-2 text-center w-56 font-bold">Attendance status toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentEntityList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 italic text-slate-400">
                          {attendanceType === 'STUDENT' ? `No students are currently admitted to ${selectedClass}.` : 'No staff members found.'}
                        </td>
                      </tr>
                    ) : filteredEntities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 italic text-slate-400">No matches found.</td>
                      </tr>
                    ) : filteredEntities.sort((a,b) => {
                      if (attendanceType === 'STUDENT') {
                         return Number((a as any).rollNo) - Number((b as any).rollNo);
                      }
                      return a.name.localeCompare(b.name);
                    }).map(st => {
                      const existingRecord = attendances.find(a => (a.userId === st.id || a.studentId === st.id) && a.date === selectedDate);
                      const s = existingRecord ? existingRecord.status : getStatus(st.id);
                      const isStudent = attendanceType === 'STUDENT';
                      const student = st as any;
                      
                      const isLocked = !!existingRecord;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-bold text-slate-700">{isStudent ? student.rollNo : 'STAFF'}</td>
                          <td className="px-4 py-2">
                            <span className="font-extrabold text-slate-800 text-xs block">{st.name}</span>
                            <span className="block text-[9px] text-slate-400">{isStudent ? `SR No: ${student.srNo || 'N/A'}` : `Type: ${st.role}`}</span>
                            {existingRecord?.status === 'Leave' && existingRecord?.leaveReason && (
                              <span className="block text-[10px] text-amber-600 font-bold mt-0.5 whitespace-normal max-w-xs leading-tight">Reason (Early Leave): {existingRecord.leaveReason}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            <span className="block">{isStudent ? (student.fatherName || 'Father detail empty') : st.email}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {isStudent ? `Mobile: ${student.mobile || student.fatherMobile || 'N/A'}` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {isLocked ? (
                              <div className="flex gap-2 justify-center flex-wrap items-center">
                                <span className={`px-2 py-1 text-[10px] font-bold rounded border ${s === 'Present' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s === 'Absent' ? 'bg-rose-100 text-rose-700 border-rose-200' : s === 'Leave' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                  {s} (Locked)
                                </span>
                                {s === 'Present' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const reason = window.prompt('Enter reason for leaving early:');
                                      if (reason && reason.trim()) {
                                        saveAttendance([{
                                          ...existingRecord,
                                          status: 'Leave',
                                          leaveReason: reason.trim()
                                        }]);
                                      }
                                    }}
                                    className="text-[9px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded font-bold transition-colors cursor-pointer"
                                  >
                                    Mark Early Leave
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex gap-1.5 justify-center font-bold font-mono">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, 'Present')}
                                  className={`px-2.5 py-1 text-[10px] rounded flex items-center gap-0.5 border ${s === 'Present' ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Present</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, 'Absent')}
                                  className={`px-2.5 py-1 text-[10px] rounded flex items-center gap-0.5 border ${s === 'Absent' ? 'bg-rose-600 border-rose-700 text-white shadow-sm' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                                >
                                  <X className="w-3 h-3" />
                                  <span>Absent</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, 'Excused')}
                                  className={`px-2.5 py-1 text-[10px] rounded flex items-center gap-0.5 border ${s === 'Excused' ? 'bg-amber-500 border-amber-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                                >
                                  <span>Excused</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {currentEntityList.length > 0 && (
                <div className="pt-4 flex justify-between items-center border-t border-slate-100 font-sans">
                  <span className="text-[10px] text-slate-400 italic">
                    {attendanceType === 'STUDENT' ? '* Saving absent register logs alert simulations down to parents.' : '* Staff attendance will be recorded.'}
                  </span>
                  <div className="flex items-center gap-3">
                    {isSaved && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <Sparkles className="w-4 h-4" />
                        <span>Roll Register Saved & Alerts Pushed!</span>
                      </span>
                    )}
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-6 py-2 shadow-md">
                      Submit Today's Attendance Register
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Card>
        </>
      ) : (
        <>
          {/* Monthly Attendance records sheet */}
          <Card className="p-4 bg-slate-50/50 flex flex-wrap gap-4 items-end no-print font-sans">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-slate-600 font-bold">Report Type</Label>
              <Input as="select" value={reportType} onChange={e => setReportType(e.target.value as 'STUDENT' | 'STAFF')}>
                <option value="STUDENT">Students Directory</option>
                <option value="STAFF">{currentUser?.role === 'TEACHER' ? 'My Monthly Attendance' : 'All Staff Members'}</option>
              </Input>
            </div>

            {reportType === 'STUDENT' && (
              <div className="flex-1 min-w-[140px]">
                <Label className="text-slate-600 font-bold">Grade Level/Class</Label>
                <Input as="select" value={reportClass} onChange={e => setReportClass(e.target.value)}>
                  {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                </Input>
              </div>
            )}

            <div className="flex-1 min-w-[140px]">
              <Label className="text-slate-600 font-bold">Select Month</Label>
              <Input as="select" value={reportMonth} onChange={e => setReportMonth(e.target.value)}>
                {monthsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Input>
            </div>

            <div className="flex-1 min-w-[120px]">
              <Label className="text-slate-600 font-bold">Select Academic Year</Label>
              <Input as="select" value={reportYear} onChange={e => setReportYear(e.target.value)}>
                {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
              </Input>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleExportCSV}
                disabled={monthlyPeople.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 border-transparent shadow shadow-emerald-200 flex items-center gap-1 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel/CSV
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                disabled={monthlyPeople.length === 0}
                className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 border-transparent shadow flex items-center gap-1 disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
            </div>
          </Card>

          {/* Quick Stats overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-sans">
            <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">Selected Period</span>
              <span className="text-xs font-black text-slate-800 mt-0.5 block">{monthsList.find(m => m.value === reportMonth)?.label} {reportYear}</span>
            </div>
            <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">Monitored Personnel</span>
              <span className="text-xs font-black text-indigo-600 mt-0.5 block">{monthlyPeople.length} {reportType === 'STUDENT' ? 'Students' : 'Staff'}</span>
            </div>
            <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">Total System Logs</span>
              <span className="text-xs font-black text-emerald-600 mt-0.5 block">{totalLogsForMonth} marked entries</span>
            </div>
            <div className="p-3.5 bg-indigo-50/50 rounded-lg border border-indigo-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black tracking-wider text-indigo-700 uppercase block font-sans">Average Presence Rate</span>
                <span className="text-base font-black text-indigo-950 mt-0.5 block">{overallPercentage}%</span>
              </div>
              <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
          </div>

          {/* Large Monthly Matrix Register */}
          <Card className="p-4 bg-white border border-slate-200">
            <div className="flex justify-between items-center border-b pb-2.5 mb-3 font-sans">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  {reportType === 'STUDENT' ? `Monthly Attendance Sheet: ${reportClass}` : 'Staff Monthly Attendance Summary'}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Showing attendance presence matrix for {monthsList.find(m => m.value === reportMonth)?.label} {reportYear}</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {daysInSelMonth.length}-Day Calendar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-600 border-collapse font-sans font-mono selection:bg-slate-100 select-none">
                <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left bg-slate-50 z-10 w-44 shadow-lg sticky left-0">Name</th>
                    {daysInSelMonth.map(day => (
                      <th key={day} className="px-1 py-2 text-center w-6 border-l border-slate-100">{Number(day)}</th>
                    ))}
                    <th className="px-2 py-2 text-center w-10 border-l border-slate-200 bg-emerald-50/50 text-emerald-800 font-bold">P</th>
                    <th className="px-2 py-2 text-center w-10 border-l border-slate-150 bg-rose-50/50 text-rose-800 font-bold">A</th>
                    <th className="px-2 py-2 text-center w-10 border-l border-slate-150 bg-amber-50/50 text-amber-800 font-bold">L</th>
                    <th className="px-3 py-2 text-center w-16 border-l border-slate-200 bg-indigo-50 font-bold text-indigo-900 sticky right-0 shadow-lg">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyPeople.length === 0 ? (
                    <tr>
                      <td colSpan={daysInSelMonth.length + 5} className="text-center py-12 italic text-slate-400 font-sans">
                        No records logged for this filter parameters combination.
                      </td>
                    </tr>
                  ) : (
                    monthlyPeople.sort((a,b) => {
                      if (reportType === 'STUDENT') {
                        return Number((a as any).rollNo || 0) - Number((b as any).rollNo || 0);
                      }
                      return a.name.localeCompare(b.name);
                    }).map(person => {
                      let pCount = 0;
                      let aCount = 0;
                      let lCount = 0;

                      return (
                        <tr key={person.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 font-sans font-bold text-slate-800 text-xs bg-white z-10 shadow-lg truncate max-w-[176px] sticky left-0">
                            {person.name}
                            <span className="block text-[8px] font-normal text-slate-400 font-sans">
                              {reportType === 'STUDENT' ? `Roll No: ${(person as any).rollNo || 'N/A'}` : person.role}
                            </span>
                          </td>

                          {daysInSelMonth.map(day => {
                            const fullDate = `${reportYear}-${reportMonth}-${day}`;
                            const record = attendances.find(a => (a.userId === person.id || a.studentId === person.id) && a.date === fullDate);
                            
                            let cellBg = 'text-slate-300';
                            let char = '-';

                            if (record) {
                              if (record.status === 'Present') {
                                pCount++;
                                cellBg = 'bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-100 rounded-sm';
                                char = 'P';
                              } else if (record.status === 'Absent') {
                                aCount++;
                                cellBg = 'bg-rose-50 text-rose-700 font-extrabold border border-rose-100 rounded-sm';
                                char = 'A';
                              } else if (record.status === 'Excused' || record.status === 'Leave') {
                                lCount++;
                                cellBg = 'bg-amber-50 text-amber-700 font-extrabold border border-amber-100 rounded-sm';
                                char = 'L';
                              }
                            }

                            return (
                              <td key={day} className={`p-0.5 text-center text-[9px] border-l border-slate-100 ${cellBg}`}>
                                <div className="h-5 flex items-center justify-center">{char}</div>
                              </td>
                            );
                          })}

                          <td className="px-2 py-2 text-center text-[10px] font-bold border-l border-slate-200 bg-emerald-50/25 text-emerald-700 font-mono">{pCount}</td>
                          <td className="px-2 py-2 text-center text-[10px] font-bold border-l border-slate-150 bg-rose-50/25 text-rose-700 font-mono">{aCount}</td>
                          <td className="px-2 py-2 text-center text-[10px] font-bold border-l border-slate-150 bg-amber-50/25 text-amber-700 font-mono">{lCount}</td>
                          
                          <td className="px-3 py-2 text-center text-[10px] font-black border-l border-slate-200 bg-indigo-50 text-indigo-900 sticky right-0 shadow-lg font-mono">
                            {pCount + aCount > 0 ? `${Math.round((pCount / (pCount + aCount)) * 105) > 100 ? 100 : Math.round((pCount / (pCount + aCount)) * 100)}%` : '100%'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 bg-emerald-50 border border-emerald-250 text-emerald-700 flex items-center justify-center rounded text-[8px] font-mono font-black">P</span> Present</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 bg-rose-50 border border-rose-250 text-rose-700 flex items-center justify-center rounded text-[8px] font-mono font-black">A</span> Absent</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 bg-amber-50 border border-amber-250 text-amber-700 flex items-center justify-center rounded text-[8px] font-mono font-black">L</span> Excused Leave</span>
              <span className="flex items-center gap-1"><span className="text-slate-300 font-semibold font-mono">-</span> No Record</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
