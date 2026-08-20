import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Input, Label } from '../UI';
import { RotateCcw, Trash2 } from 'lucide-react';

export function RecycleBin() {
  const { 
    currentUser, 
    allStudents,
    deletedStudents,
    updateStudent,
    restoreStudent,
    hardDeleteStudent 
  } = useStore();

  const currentSchoolId = currentUser?.schoolId || '';
  const students = React.useMemo(() => allStudents.filter(s => !s.isDeleted), [allStudents]);

  const [revertSearch, setRevertSearch] = useState('');
  const [recycleSearch, setRecycleSearch] = useState('');

  const handleRevertPromotion = async (studentId: string) => {
    if (!window.confirm("Are you sure you want to revert this student's last promotion? This will restore their previous class and session.")) return;
    try {
      const student = students.find(s => s.id === studentId);
      if (!student || !student.academicHistory || student.academicHistory.length === 0) return;
      
      const history = [...student.academicHistory];
      const lastEntry = history.pop()!;
      
      await updateStudent(studentId, {
        academicSession: lastEntry.academicSession,
        grade: lastEntry.grade,
        rollNo: lastEntry.rollNo,
        section: lastEntry.section,
        academicHistory: history,
        hasPreviousClass: history.length > 0,
        previousClass: history.length > 0 ? `${history[history.length - 1].grade} (${history[history.length - 1].academicSession})` : '',
        previousDues: lastEntry.feeBalanceAtPromotion || 0,
        feeBalance: lastEntry.feeBalanceAtPromotion || 0
      });
      alert("Promotion reverted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to revert promotion.");
    }
  };

  const promotedStudentsList = students.filter(s => 
    s.schoolId === currentSchoolId && 
    s.hasPreviousClass && 
    s.academicHistory && 
    s.academicHistory.length > 0 &&
    s.name.toLowerCase().includes(revertSearch.toLowerCase())
  ).slice(0, 20);

  const deletedStudentsList = (deletedStudents || []).filter(s =>
    s.schoolId === currentSchoolId &&
    s.name.toLowerCase().includes(recycleSearch.toLowerCase())
  ).slice(0, 20);

  return (
    <div className="space-y-6">
      <Card className="p-4 border-rose-200 bg-rose-50/30">
        <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest block mb-4">
          Mistake Correction & Recycle Bin
        </span>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Undo Promotion */}
          <div>
            <Label className="text-rose-800">Undo Accidental Promotion (वापस पुरानी क्लास में भेजें)</Label>
            <div className="flex gap-2 mt-1 mb-3">
              <Input 
                placeholder="Search student by name..." 
                value={revertSearch}
                onChange={e => setRevertSearch(e.target.value)}
                className="text-xs py-1.5 h-8 bg-white border-rose-200"
              />
            </div>
            {promotedStudentsList.length > 0 ? (
              <div className="space-y-2">
                {promotedStudentsList.map(s => {
                  const lastHistory = s.academicHistory![s.academicHistory!.length - 1];
                  return (
                    <div key={s.id} className="flex justify-between items-center bg-white p-2 border border-rose-100 rounded text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{s.name}</div>
                        <div className="text-[10px] text-slate-500">Currently: {s.grade} ({s.academicSession})</div>
                        <div className="text-[10px] text-rose-600 font-medium">Revert to: {lastHistory.grade} ({lastHistory.academicSession})</div>
                      </div>
                      <Button 
                        onClick={() => handleRevertPromotion(s.id)}
                        className="bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300 text-[10px] px-3 py-1 h-auto"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Revert
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">No recently promoted students found matching search.</p>
            )}
          </div>

          {/* Restore Deleted Students */}
          <div>
            <Label className="text-rose-800">Restore Deleted Students (डिलीट हुए छात्र वापस लाएं)</Label>
            <div className="flex gap-2 mt-1 mb-3">
              <Input 
                placeholder="Search deleted student by name..." 
                value={recycleSearch}
                onChange={e => setRecycleSearch(e.target.value)}
                className="text-xs py-1.5 h-8 bg-white border-rose-200"
              />
            </div>
            {deletedStudentsList.length > 0 ? (
              <div className="space-y-2">
                {deletedStudentsList.map(s => (
                  <div key={s.id} className="flex justify-between items-center bg-white p-2 border border-rose-100 rounded text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[10px] text-slate-500">{s.grade} ({s.academicSession}) | ID: {s.id}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button 
                        onClick={() => {
                          if (window.confirm("Restore this deleted student?")) {
                            restoreStudent(s.id);
                            alert("Student restored successfully!");
                          }
                        }}
                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300 text-[10px] px-2 py-1 h-auto"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Restore
                      </Button>
                      <Button 
                        onClick={() => {
                          if (window.confirm("PERMANENTLY delete this student? This cannot be undone!")) {
                            hardDeleteStudent(s.id);
                          }
                        }}
                        className="bg-rose-600 text-white hover:bg-rose-700 text-[10px] px-2 py-1 h-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">No deleted students found matching search.</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
