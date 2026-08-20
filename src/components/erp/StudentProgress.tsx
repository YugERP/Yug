import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { Card, Button, Input, Label } from '../UI';
import { 
  TrendingUp, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  Users, 
  DollarSign, 
  CheckCircle,
  FileText,
  UserX,
  Award,
  RefreshCw,
  Download,
  Upload,
  RotateCcw,
  Trash2
} from 'lucide-react';
import type { Student, AcademicHistoryEntry } from '../../types';

const CLASSES = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const SECTIONS = ['A', 'B', 'C', 'D'];

interface PromotionRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  selected: boolean;
  resultStatus: 'Pass' | 'Fail' | 'Compartment' | 'Absent';
  promotionType: 'Promote' | 'Detain' | 'TC Issue' | 'Dropout';
  newSection: string;
  newRollNo: string;
  currentDues: number;
  carryForward: boolean;
}

export function StudentProgress() {
  const { 
    currentUser, 
    schools, 
    allStudents,
    deletedStudents,
    updateStudent,
    restoreStudent,
    hardDeleteStudent,
    importStudents,
    activeAcademicSession, 
    academicSessions, 
    getStudentBalance 
  } = useStore();

  const students = React.useMemo(() => allStudents.filter(s => !s.isDeleted), [allStudents]);

  const currentSchoolId = currentUser?.schoolId || '';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const EXPORT_FIELDS = [
    'id', 'name', 'password', 'role', 'grade', 'schoolId', 'feeBalance', 
    'academicSession', 'admissionNo', 'penNo', 'srNo', 'admissionDate', 
    'dateOfBirth', 'gender', 'bloodGroup', 'nationality', 'religion', 'category', 
    'aadhaarNo', 'fatherName', 'fatherMobile', 'motherName', 'motherMobile', 
    'address', 'email', 'rollNo', 'section', 'previousDues', 'hasPreviousClass', 'previousClass'
  ] as (keyof Student)[];

  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const handleExportCSV = () => {
    const sessionStudents = students.filter(s => s.schoolId === currentSchoolId && s.academicSession === fromSession);
    if (sessionStudents.length === 0) {
      alert(`No students found for session ${fromSession} to export backup.`);
      return;
    }

    const header = EXPORT_FIELDS.join(',');
    const rows = sessionStudents.map(stu => EXPORT_FIELDS.map(f => escapeCSV(stu[f])).join(','));
    const csvContent = [header, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StudentBackup_${fromSession}_${Date.now()}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Warning: Importing a backup WILL OVERWRITE current student records for matching IDs in this session. Proceed?")) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          alert('Invalid or empty CSV format.');
          return;
        }
        
        const headers = parseCSVLine(lines.shift()!).map(h => h.trim()) as (keyof Student)[];
        const idIndex = headers.indexOf('id');
        if (idIndex === -1) {
            alert('CSV is missing required "id" column.');
            return;
        }

        const studentsToImport: Student[] = [];

        for (const line of lines) {
          const values = parseCSVLine(line);
          const stuData: any = {};
          headers.forEach((h, i) => {
             let val: any = values[i];
             if (h === 'feeBalance' || h === 'previousDues') val = Number(val) || 0;
             if (h === 'hasPreviousClass') val = val === 'true';
             stuData[h] = val;
          });

          // Enforce structure security
          stuData.role = 'STUDENT';
          stuData.schoolId = currentSchoolId;
          
          studentsToImport.push(stuData as Student);
        }

        await importStudents(studentsToImport);
        alert(`Import successful: Upserted ${studentsToImport.length} records from Backup.`);
      } catch (err) {
        console.error(err);
        alert('Error parsing or uploading CSV data.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 1. Session / Class Form State
  const [fromSession, setFromSession] = useState(activeAcademicSession || '2026-27');
  const [toSession, setToSession] = useState('');
  const [fromClass, setFromClass] = useState(CLASSES[0]);
  const [toClass, setToClass] = useState(CLASSES[1] || CLASSES[0]);
  const [fromSection, setFromSection] = useState('A');
  const [toSection, setToSection] = useState('A');

  // Rows and summary state
  const [promotionRows, setPromotionRows] = useState<PromotionRow[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionFinishedSummary, setPromotionFinishedSummary] = useState<{
    totalProcessed: number;
    promoted: number;
    detained: number;
    left: number;
    duesCarried: number;
  } | null>(null);

  // Auto-shift 'toSession' and 'toClass' based on current selections
  useEffect(() => {
    // Session Shift
    const sIndex = academicSessions.indexOf(fromSession);
    if (sIndex !== -1 && sIndex < academicSessions.length - 1) {
      setToSession(academicSessions[sIndex + 1]);
    } else {
      // Create helper default next session e.g. '2027-28' if current is '2026-27'
      const parts = fromSession.split('-');
      if (parts.length === 2) {
        const yr1 = parseInt(parts[0]) + 1;
        const yr2 = parseInt(parts[1]) + 1;
        setToSession(`${yr1}-${yr2.toString().slice(-2)}`);
      } else {
        setToSession('2027-28');
      }
    }

    // Class Shift
    const cIndex = CLASSES.indexOf(fromClass);
    if (cIndex !== -1 && cIndex < CLASSES.length - 1) {
      setToClass(CLASSES[cIndex + 1]);
    } else {
      setToClass('Graduated');
    }
  }, [fromSession, fromClass, academicSessions]);

  // Keep toSection in sync with fromSection as starter
  useEffect(() => {
    setToSection(fromSection);
  }, [fromSection]);

  // Filter students from store matching: School, From Session, From Class, From Section
  const matchedStudents = students.filter(s => 
    s.schoolId === currentSchoolId &&
    s.academicSession === fromSession &&
    s.grade === fromClass &&
    s.section === fromSection
  );

  // Pull matched students into our rows staging state whenever criteria change
  useEffect(() => {
    const rows: PromotionRow[] = matchedStudents.map(student => {
      const balanceInfo = getStudentBalance(student.id);
      return {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        selected: true,
        resultStatus: 'Pass',
        promotionType: 'Promote',
        newSection: toSection,
        newRollNo: student.rollNo,
        currentDues: balanceInfo.balance,
        carryForward: true
      };
    });
    setPromotionRows(rows);
    setPromotionFinishedSummary(null);
  }, [fromSession, fromClass, fromSection, toSection, students, currentSchoolId]);

  // Bulk operation triggers
  const handleBulkResultStatus = (status: 'Pass' | 'Fail' | 'Compartment' | 'Absent') => {
    setPromotionRows(prev => prev.map(row => {
      if (!row.selected) return row;
      const promoType = status === 'Pass' ? 'Promote' : 'Detain';
      return {
        ...row,
        resultStatus: status,
        promotionType: promoType
      };
    }));
  };

  const handleBulkPromotionType = (type: 'Promote' | 'Detain' | 'TC Issue' | 'Dropout' | 'Class Jump') => {
    setPromotionRows(prev => prev.map(row => {
      if (!row.selected) return row;
      return {
        ...row,
        promotionType: type
      };
    }));
  };

  const handleBulkCarryForward = (checked: boolean) => {
    setPromotionRows(prev => prev.map(row => {
      if (!row.selected) return row;
      return {
        ...row,
        carryForward: checked
      };
    }));
  };

  const handleAutoAssignRollNumbers = (orderBy: 'alphabetical' | 'current') => {
    const listToAssign = [...promotionRows];
    if (orderBy === 'alphabetical') {
      listToAssign.sort((a, b) => a.studentName.localeCompare(b.studentName));
    }

    let nextRollNo = 1;
    const rollNoMap: Record<string, string> = {};
    listToAssign.forEach(row => {
      if (row.selected) {
        rollNoMap[row.studentId] = nextRollNo.toString();
        nextRollNo++;
      } else {
        rollNoMap[row.studentId] = row.rollNo;
      }
    });

    setPromotionRows(prev => prev.map(row => ({
      ...row,
      newRollNo: rollNoMap[row.studentId] || row.rollNo
    })));
  };

  const handleRowToggle = (studentId: string) => {
    setPromotionRows(prev => prev.map(row => 
      row.studentId === studentId ? { ...row, selected: !row.selected } : row
    ));
  };

  const handleRowChange = (studentId: string, fields: Partial<PromotionRow>) => {
    setPromotionRows(prev => prev.map(row => 
      row.studentId === studentId ? { ...row, ...fields } : row
    ));
  };

  // Bulk execution of promotion
  const handleExecutePromotion = async () => {
    const selectedRows = promotionRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert("Please select at least one student to promote.");
      return;
    }

    if (!window.confirm(`Are you sure you want to process promotions for ${selectedRows.length} students?`)) {
      return;
    }

    setIsPromoting(true);

    let promotedCount = 0;
    let detainedCount = 0;
    let leftCount = 0;
    let totalDuesCarried = 0;

    try {
      for (const row of selectedRows) {
        const fullStudent = students.find(s => s.id === row.studentId);
        if (!fullStudent) continue;

        // Archive current record details
        const oldHistoryEntry: AcademicHistoryEntry = {
          academicSession: fromSession,
          grade: fromClass,
          rollNo: fullStudent.rollNo,
          section: fullStudent.section || '',
          resultStatus: row.resultStatus,
          promotionType: row.promotionType,
          archivedAt: new Date().toISOString(),
          feeBalanceAtPromotion: row.currentDues
        };

        const updatedHistory = [...(fullStudent.academicHistory || []), oldHistoryEntry];

        let targetGrade = fromClass;
        let targetSession = toSession;
        let targetSection = row.newSection;

        if (row.promotionType === 'Promote') {
          targetGrade = toClass;
          promotedCount++;
        } else if (row.promotionType === 'Class Jump') {
          targetGrade = toClass;
          targetSession = fromSession; // Class Jump moves them in the SAME session
          promotedCount++;
        } else if (row.promotionType === 'Detain') {
          targetGrade = fromClass;
          detainedCount++;
        } else {
          // TC Issued or Dropout
          targetGrade = row.promotionType === 'TC Issue' ? 'School Left (TC Issued)' : 'School Left (Dropout)';
          targetSession = fromSession; // Left students stay in their current session
          leftCount++;
        }

        const remainingDues = row.carryForward ? row.currentDues : 0;
        if (remainingDues > 0) {
          totalDuesCarried += remainingDues;
        }

        // Update the existing record in-place to the target session and grade
        // This preserves the unique student ID, historical fee transaction records, and exam marks.
        // The previous session details are archived in academicHistory.
        const updates: Partial<Student> = {
          academicSession: targetSession,
          grade: targetGrade,
          section: targetSection,
          rollNo: row.newRollNo,
          previousDues: remainingDues,
          feeBalance: remainingDues, // carries over balance
          academicHistory: updatedHistory,
          hasPreviousClass: true,
          previousClass: `${fromClass} (${fromSession})`
        };

        await updateStudent(row.studentId, updates);
      }

      setPromotionFinishedSummary({
        totalProcessed: selectedRows.length,
        promoted: promotedCount,
        detained: detainedCount,
        left: leftCount,
        duesCarried: totalDuesCarried
      });

    } catch (err) {
      console.error("Error running batch student promotion:", err);
      alert("Encountered an error while running promotion batch.");
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="border-b pb-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-5 bg-indigo-600 rounded-full"></span>
              Student Progress & Registry Backups
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Perform batch promotions, carry forward dues, and download/restore comprehensive student data backups via CSV.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
             <Button onClick={handleExportCSV} className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold py-1.5 px-3 flex items-center gap-1.5 transition-colors">
               <Download className="w-3.5 h-3.5"/> Download Session Backup (CSV)
             </Button>
             <div className="relative">
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleImportCSV} 
                 accept=".csv" 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
               <Button disabled={isImporting} className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-3 flex items-center gap-1.5 pointer-events-none transition-colors">
                 {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5"/>} Restore Backup
               </Button>
             </div>
          </div>
        </div>
      </div>

      {/* Main Parameters Setup */}
      <Card className="p-4 bg-slate-50/50 border-slate-200">
        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block mb-3">
          1. Session & Class Mapping Configurations
        </span>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <Label>From academic session</Label>
            <Input 
              as="select" 
              value={fromSession} 
              onChange={e => setFromSession(e.target.value)}
            >
              {academicSessions.map(sess => (
                <option key={sess} value={sess}>{sess}</option>
              ))}
            </Input>
          </div>

          <div>
            <Label>To academic session</Label>
            <Input 
              type="text"
              value={toSession}
              onChange={e => setToSession(e.target.value)}
              placeholder="e.g. 2027-28"
            />
          </div>

          <div>
            <Label>From Grade / Class</Label>
            <Input 
              as="select" 
              value={fromClass} 
              onChange={e => setFromClass(e.target.value)}
            >
              {CLASSES.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </Input>
          </div>

          <div>
            <Label>To Grade / Class</Label>
            <Input 
              as="select" 
              value={toClass} 
              onChange={e => setToClass(e.target.value)}
            >
              {CLASSES.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
              <option value="Graduated">Graduated (Out of School)</option>
            </Input>
          </div>

          <div>
            <Label>From Section</Label>
            <Input 
              as="select" 
              value={fromSection} 
              onChange={e => setFromSection(e.target.value)}
            >
              {SECTIONS.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </Input>
          </div>

          <div>
            <Label>To Section</Label>
            <Input 
              as="select" 
              value={toSection} 
              onChange={e => setToSection(e.target.value)}
            >
              {SECTIONS.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </Input>
          </div>
        </div>
      </Card>

      {/* Promotion Staging Workspace */}
      <Card className="p-4 border-slate-200">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">
              2. Student Cohort Register ({matchedStudents.length} Active Records)
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Refined filters: {fromClass} ({fromSection}) ➔ {toClass} ({toSection}) [{toSession}]
            </p>
          </div>

          {/* Staging Bulk Operations Controls */}
          {matchedStudents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <div className="bg-slate-50 border rounded p-1.5 flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Set Results:</span>
                <button 
                  onClick={() => handleBulkResultStatus('Pass')}
                  className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  All Pass
                </button>
                <button 
                  onClick={() => handleBulkResultStatus('Fail')}
                  className="bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded hover:bg-rose-100 border border-rose-200 transition-colors"
                >
                  All Fail
                </button>
              </div>

              <div className="bg-slate-50 border rounded p-1.5 flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Set Action:</span>
                <button 
                  onClick={() => handleBulkPromotionType('Promote')}
                  className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded hover:bg-indigo-100 border border-indigo-200 transition-colors"
                >
                  Promote
                </button>
                <button 
                  onClick={() => handleBulkPromotionType('Class Jump')}
                  className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded hover:bg-amber-100 border border-amber-200 transition-colors"
                  title="Jump to next class in same session"
                >
                  ⚡ Class Jump
                </button>
                <button 
                  onClick={() => handleBulkPromotionType('Detain')}
                  className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded hover:bg-slate-300 transition-colors"
                >
                  Detain
                </button>
              </div>

              <div className="bg-slate-50 border rounded p-1.5 flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Auto-Roll Series:</span>
                <button 
                  onClick={() => handleAutoAssignRollNumbers('current')}
                  className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded hover:bg-slate-300 transition-colors"
                >
                  By Prev Roll
                </button>
                <button 
                  onClick={() => handleAutoAssignRollNumbers('alphabetical')}
                  className="bg-white border text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors"
                >
                  Alphabetical
                </button>
              </div>

              <div className="bg-slate-50 border rounded p-1.5 flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Old Bal:</span>
                <button 
                  onClick={() => handleBulkCarryForward(true)}
                  className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-slate-350"
                  title="Carry forward overall pending dues in new database instance"
                >
                  Carry
                </button>
                <button 
                  onClick={() => handleBulkCarryForward(false)}
                  className="bg-white border text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded hover:bg-slate-50"
                  title="Wipe previous dues for new session"
                >
                  Wipe
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Finished Promotion Confirmation Alert */}
        {promotionFinishedSummary && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg mb-6 flex items-start gap-3 animated fade-in">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-1">Batch promotion success!</h4>
              <p className="text-xs text-emerald-700">
                All selected student records have been upgraded to <strong>{toSession}</strong>. Dynamic archives of past grades were generated.
              </p>
              <div className="mt-2.5 grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-2.5 rounded border border-emerald-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Handled</span>
                  <span className="font-extrabold text-slate-700">{promotionFinishedSummary.totalProcessed} Students</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-500 font-bold block uppercase">Promoted</span>
                  <span className="font-extrabold text-emerald-600 font-mono">+{promotionFinishedSummary.promoted}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-500 font-bold block uppercase">Retained (Detain)</span>
                  <span className="font-extrabold text-amber-600 font-mono">{promotionFinishedSummary.detained}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 font-bold block uppercase">Left / Drop</span>
                  <span className="font-extrabold text-rose-600 font-mono">{promotionFinishedSummary.left}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Carry Bal</span>
                  <span className="font-extrabold text-indigo-600">₹{promotionFinishedSummary.duesCarried.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Staging Table */}
        {promotionRows.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded border border-dashed border-slate-200">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">No matching students found</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              We couldn't spot active students in {fromClass} ({fromSection}) for academic year {fromSession} cohort registers. Select alternative filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="inline-block min-w-full align-middle">
            <table className="min-w-full w-full text-xs text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-slate-100 text-slate-650 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <th className="px-3 py-3 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded accent-indigo-600 cursor-pointer"
                      checked={promotionRows.every(r => r.selected)}
                      onChange={e => {
                        const checked = e.target.checked;
                        setPromotionRows(prev => prev.map(r => ({ ...r, selected: checked })));
                      }}
                    />
                  </th>
                  <th className="px-3 py-3">Student Informational Attributes</th>
                  <th className="px-3 py-3 w-36">Result status</th>
                  <th className="px-3 py-3 w-40">Promotion action</th>
                  <th className="px-3 py-3 w-28">New section</th>
                  <th className="px-3 py-3 w-24">New Roll</th>
                  <th className="px-3 py-3 w-36">Old Balance (Dues)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {promotionRows.map(row => {
                  return (
                    <tr key={row.studentId} className={`hover:bg-slate-50/70 transition-colors ${row.selected ? 'bg-indigo-50/15' : 'opacity-65'}`}>
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center align-middle">
                        <input 
                          type="checkbox" 
                          checked={row.selected}
                          onChange={() => handleRowToggle(row.studentId)}
                          className="rounded accent-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* Info */}
                      <td className="px-3 py-3">
                        <div className="font-extrabold text-slate-800 leading-tight">
                          {row.studentName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {row.studentId} | Prev Roll: {row.rollNo}
                        </div>
                      </td>

                      {/* Result Status */}
                      <td className="px-3 py-3">
                        <select 
                          value={row.resultStatus}
                          onChange={e => {
                            const val = e.target.value as any;
                            const promoType = val === 'Pass' ? 'Promote' : 'Detain';
                            handleRowChange(row.studentId, { resultStatus: val, promotionType: promoType });
                          }}
                          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 w-full"
                        >
                          <option value="Pass">✅ Pass</option>
                          <option value="Fail">❌ Fail</option>
                          <option value="Compartment">🔁 Compartment</option>
                          <option value="Absent">📝 Absent</option>
                        </select>
                      </td>

                      {/* Promotion action */}
                      <td className="px-3 py-3">
                        <select 
                          value={row.promotionType}
                          onChange={e => handleRowChange(row.studentId, { promotionType: e.target.value as any })}
                          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 w-full"
                        >
                          <option value="Promote">Promote ({toClass})</option>
                          <option value="Class Jump">⚡ Class Jump (Jump to {toClass} in same session)</option>
                          <option value="Detain">Detain (Repeat Class)</option>
                          <option value="TC Issue">TC Issue (Leave)</option>
                          <option value="Dropout">Dropout</option>
                        </select>
                      </td>

                      {/* Target Section */}
                      <td className="px-3 py-3">
                        <select 
                          value={row.newSection}
                          disabled={row.promotionType !== 'Promote' && row.promotionType !== 'Detain' && row.promotionType !== 'Class Jump'}
                          onChange={e => handleRowChange(row.studentId, { newSection: e.target.value })}
                          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 w-full disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {SECTIONS.map(sec => (
                            <option key={sec} value={sec}>Sec {sec}</option>
                          ))}
                        </select>
                      </td>

                      {/* New Roll Number */}
                      <td className="px-3 py-3">
                        <input 
                          type="text"
                          value={row.newRollNo}
                          disabled={row.promotionType !== 'Promote' && row.promotionType !== 'Detain' && row.promotionType !== 'Class Jump'}
                          onChange={e => handleRowChange(row.studentId, { newRollNo: e.target.value })}
                          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 w-full text-center disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* Old Dues */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={row.carryForward}
                              onChange={e => handleRowChange(row.studentId, { carryForward: e.target.checked })}
                              className="accent-indigo-600 rounded-sm"
                            />
                            <span className={`text-[11px] font-bold font-mono ${row.currentDues > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                              ₹{row.currentDues}
                            </span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Promotion Action Footer Trigger */}
        {promotionRows.filter(r => r.selected).length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200 flex justify-between sm:justify-end gap-3 items-center flex-wrap">
            <div className="text-[10px] text-left sm:text-right text-slate-400 font-medium">
              Ready to promote <strong>{promotionRows.filter(r => r.selected).length}</strong> records.
            </div>
            <Button
              onClick={handleExecutePromotion}
              disabled={isPromoting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-widest text-[10.5px] px-5 py-2.5 flex items-center gap-2 rounded-lg transition-all shadow w-full sm:w-auto justify-center"
            >
              {isPromoting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating Promotion Logs...
                </>
              ) : (
                <>
                  <Award className="h-3.5 w-3.5" />
                  Promote Selected Cohort
                </>
              )}
            </Button>
          </div>
        )}

      </Card>
      
    </div>
  );
}
