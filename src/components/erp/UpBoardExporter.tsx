import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student } from '../../types';
import { Download, AlertCircle, CheckCircle, Search, HelpCircle } from 'lucide-react';

export function UpBoardExporter() {
  const { students } = useStore();
  const [targetClass, setTargetClass] = useState<'Class 9' | 'Class 10'>('Class 9');
  const [searchWord, setSearchWord] = useState('');

  const targetStudents = students.filter(s => s.grade === targetClass);
  const filteredStudents = targetStudents.filter(s => s.name.toLowerCase().includes(searchWord.toLowerCase()));

  // Compliance analysis count
  const analyzeComplianceValue = (s: Student) => {
    const issues: string[] = [];
    if (!s.studentNameHindi) issues.push('Missing Name in Hindi language script');
    if (!s.aadhar || s.aadhar.length !== 12) issues.push('Missing/Incorrect 12-digit Aadhaar Number');
    if (!s.srNo) issues.push('Missing Core Scholar Register (SR) Number');
    if (!s.subjects || s.subjects.length < 5) issues.push('Not enough subject combos chosen (Required minimum 5 subjects)');
    if (!s.dob) issues.push('Date of Birth missing');
    if (!s.fatherName) issues.push('Father full name missing');
    return issues;
  };

  const handleExportUpBoardCsv = () => {
    if (targetStudents.length === 0) {
      alert(`No student registrars registered in ${targetClass}. Cannot export sheet templates.`);
      return;
    }

    // Official Board Data schema columns
    const headers = [
      'SR_Number',
      'Admission_No',
      'Student_Name_English',
      'Student_Name_Hindi',
      'Gender',
      'DOB',
      'Aadhaar_No',
      'Category_GEN_OBC_SC_ST',
      'Caste_Name',
      'Father_Name',
      'Mother_Name',
      'Mobile_No',
      'Section_House',
      'Subjects_Registration_Combo'
    ];

    const rows = targetStudents.map(s => {
      const subCombo = (s.subjects || []).join(';');
      return [
        s.srNo || '',
        s.admissionNo || '',
        s.name,
        s.studentNameHindi || '',
        s.gender || 'Male',
        s.dob || '',
        s.aadhar || '',
        s.category || 'GEN',
        s.caste || '',
        s.fatherName || '',
        s.motherName || '',
        s.mobile || '',
        `${s.section || 'A'}-${s.houseGroup || 'Ganga'}`,
        subCombo
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create file trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UP_BOARD_REG_${targetClass.replace(' ', '_')}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Filtering area */}
      <Card className="p-4 bg-slate-50/50 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-4 flex-wrap flex-1">
          <div className="min-w-[150px]">
            <Label>UP Board Registration Class</Label>
            <Input as="select" value={targetClass} onChange={e => setTargetClass(e.target.value as any)}>
              <option value="Class 9">Class 9 (Prathamik Panjikaran)</option>
              <option value="Class 10">Class 10 (Main Secondary Exam)</option>
            </Input>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label>Quick Search Name</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input 
                type="text" 
                placeholder="Filter names..." 
                value={searchWord} 
                onChange={e => setSearchWord(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded pl-7 py-1.5 focus:outline" 
              />
            </div>
          </div>
        </div>

        <div>
          <Button onClick={handleExportUpBoardCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-6">
            <Download className="w-4 h-4" />
            <span>Download UP Board format CSV</span>
          </Button>
        </div>
      </Card>

      {/* Roster & Compliance checker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Compliance checklist details */}
        <div className="lg:col-span-2">
          <Card className="p-4 bg-white border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block border-b pb-1">Registration Compliance Auditor</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-500">
                <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2">SR No</th>
                    <th className="px-4 py-2">Student Name (English / Hindi)</th>
                    <th className="px-4 py-2">Combo Subjects Info</th>
                    <th className="px-4 py-2 text-center w-48">Compliance Auditing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 italic text-slate-450">No student profiles registered in {targetClass} directory yet.</td>
                    </tr>
                  ) : filteredStudents.map(st => {
                    const issues = analyzeComplianceValue(st);
                    const passes = issues.length === 0;

                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono font-bold text-slate-800">{st.srNo || 'Missing'}</td>
                        <td className="px-4 py-2">
                          <span className="font-extrabold text-slate-900 text-xs block">{st.name}</span>
                          <span className="block text-[9.5px] text-indigo-750 font-sans mt-0.5">{st.studentNameHindi || <span className="text-rose-500 font-bold italic font-sans">[हिंदी नाम खाली]</span>}</span>
                        </td>
                        <td className="px-4 py-2">
                          <p className="text-[10px] text-slate-650 max-w-[200px] truncate">{(st.subjects || []).join(', ')}</p>
                          <span className="text-[8.5px] uppercase font-bold text-slate-350">{st.medium || 'Hindi'} Medium</span>
                        </td>
                        <td className="px-4 py-2 text-center font-bold">
                          {passes ? (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 inline-flex items-center gap-1 leading-none"><CheckCircle className="w-3 h-3"/> Complete (Passed)</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[9px] text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-0.5 inline-flex items-center gap-1 leading-none"><AlertCircle className="w-3 h-3"/> Warning ({issues.length} Issues)</span>
                              <div className="text-[8px] text-rose-500 font-normal italic text-left leading-tight pl-1">
                                {issues.slice(0, 2).map((iss, i) => <p key={i}>• {iss}</p>)}
                                {issues.length > 2 && <p>• + {issues.length - 2} more errors</p>}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Board guideline rules sidebar */}
        <div>
          <Card className="p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-indigo-600"/> UP Board Rules Guide</h4>
            
            <div className="space-y-3.5 text-xs text-slate-605">
              <div className="space-y-1">
                <span className="font-extrabold text-slate-800 uppercase text-[9px] block">1. Name in Hindi</span>
                <p className="leading-normal">UP Board generates offline high school passing marksheet degree with dual English & Hindi character representation. Make sure to input matching Hindi strings for parent & student details.</p>
              </div>

              <div className="space-y-1">
                <span className="font-extrabold text-slate-800 uppercase text-[9px] block">2. SR Number validation</span>
                <p className="leading-normal">The scholar Register Number (SR Number) acts as the physical register link index. Board registrations cannot be completed without auditing the SR Number against physical registers.</p>
              </div>

              <div className="space-y-1">
                <span className="font-extrabold text-slate-800 uppercase text-[9px] block">3. Minimum Six subject combo</span>
                <p className="leading-normal">For secondary class 9 and class 10 standard registration, candidates must be declared under at least 5 standard papers including regular Language papers (Hindi, English), Science, Social Science and Mathematics or Home Science.</p>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
