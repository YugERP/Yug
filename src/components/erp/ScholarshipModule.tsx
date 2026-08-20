import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student } from '../../types';
import { Search, Award, CheckSquare, Edit3, Clipboard } from 'lucide-react';

export function ScholarshipModule() {
  const { students, updateStudent } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'GEN' | 'OBC' | 'SC' | 'ST' | 'Minority'>('All');

  // Local editor state
  const [editingScholar, setEditingScholar] = useState<Student | null>(null);
  const [schId, setSchId] = useState('');
  const [schCat, setSchCat] = useState('');
  const [acctNo, setAcctNo] = useState('');
  const [ifsc, setIfsc] = useState('');

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.srNo?.includes(searchTerm));
    if (selectedCategory === 'All') return matchSearch;
    if (selectedCategory === 'Minority') return matchSearch && s.minorityStatus === 'Yes';
    return matchSearch && s.category === selectedCategory;
  });

  const handleEditClick = (s: Student) => {
    setEditingScholar(s);
    setSchId(s.scholarshipId || '');
    setSchCat(s.scholarshipCategory || 'Pre Metric Scholarship');
    setAcctNo(s.bankAccountNo || '');
    setIfsc(s.ifscCode || '');
  };

  const handleSaveScholarship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScholar) return;

    updateStudent(editingScholar.id, {
      scholarshipId: schId,
      scholarshipCategory: schCat,
      bankAccountNo: acctNo,
      ifscCode: ifsc
    });

    setEditingScholar(null);
    alert('Scholarship ledger coordinates updated successfully inside school records.');
  };

  // Counting metrics
  const totalApplied = students.filter(s => !!s.scholarshipId).length;
  const genCount = students.filter(s => s.category === 'GEN').length;
  const obcCount = students.filter(s => s.category === 'OBC').length;
  const scstCount = students.filter(s => s.category === 'SC' || s.category === 'ST').length;
  const minCount = students.filter(s => s.minorityStatus === 'Yes').length;

  return (
    <div className="space-y-4">
      {/* Category count panels */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Applied</span>
          <span className="font-mono font-black text-indigo-700 text-lg leading-tight block mt-1">{totalApplied} students</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">General</span>
          <span className="font-mono font-black text-slate-700 text-lg leading-tight block mt-1">{genCount} students</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">OBC Backward</span>
          <span className="font-mono font-black text-amber-600 text-lg leading-tight block mt-1">{obcCount} students</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">SC / ST Tribes</span>
          <span className="font-mono font-black text-red-600 text-lg leading-tight block mt-1">{scstCount} students</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Minority Groups</span>
          <span className="font-mono font-black text-teal-600 text-lg leading-tight block mt-1">{minCount} students</span>
        </div>
      </div>

      {/* Roster database controller search */}
      <Card className="p-4 bg-slate-50/50 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-4 flex-wrap flex-1">
          <div className="min-w-[150px]">
            <Label>Filter Social Category</Label>
            <Input as="select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value as any)}>
              <option value="All">All Social Classes</option>
              <option value="GEN">General (GEN)</option>
              <option value="OBC">Backward Castes (OBC)</option>
              <option value="SC">Scheduled Castes (SC)</option>
              <option value="ST">Scheduled Tribes (ST)</option>
              <option value="Minority">Minority Communities Only</option>
            </Input>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label>Search by Student Name / SR No</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input 
                type="text" 
                placeholder="Find candidate..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded pl-7 py-1.5 focus:outline-none focus:border-indigo-500" 
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table registrar */}
      <Card className="p-4 bg-white border border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block border-b pb-1 flex items-center gap-1.5">Scholarship ledger sheets</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-500">
            <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2">Student Name</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">applied Scheme / Portal ID</th>
                <th className="px-4 py-2">Bank account Coordinates</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Ledger actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 italic text-slate-450">No scholar candidates matched current query. Ensure correct filters.</td>
                </tr>
              ) : filteredStudents.map(st => {
                const applied = !!st.scholarshipId;

                return (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <span className="font-extrabold text-slate-900 text-xs block">{st.name}</span>
                      <span className="block text-[9.5px] text-slate-400">Class: {st.grade} | SR: {st.srNo}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-bold text-slate-700 text-[10px] block border px-1.5 py-0.5 rounded inline-block bg-slate-50">{st.category || 'GEN'}</span>
                      {st.minorityStatus === 'Yes' && <span className="text-[8px] uppercase tracking-wide font-extrabold block text-teal-600 mt-1">Minority Group</span>}
                    </td>
                    <td className="px-4 py-2">
                      {applied ? (
                        <div>
                          <p className="font-mono text-[10.5px] font-semibold text-slate-800">{st.scholarshipId}</p>
                          <span className="text-[8px] uppercase font-bold text-emerald-600">{st.scholarshipCategory || 'Pre Metric Scholarship'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Unapplied Scheme</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-[10px]">
                      {st.bankAccountNo ? (
                        <div>
                          <p className="text-slate-750 font-bold">A/C: {st.bankAccountNo}</p>
                          <p className="text-slate-400 text-[9px]">IFSC: {st.ifscCode}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No coordinates</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {applied ? (
                        <span className="text-[8px] uppercase font-bold text-emerald-700 bg-emerald-55 bg-emerald-50 border border-emerald-150 rounded px-1.5 py-0.5">Applied (Active)</span>
                      ) : (
                        <span className="text-[8px] uppercase font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">Not Applied</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button onClick={() => handleEditClick(st)} className="bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 px-2 py-1 text-[10px] font-bold flex items-center gap-1 ml-auto">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update coordinates</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Editor Modal Popup */}
      {editingScholar && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 inline-block">
          <Card className="w-full max-w-sm bg-white p-4 shadow-xl border border-slate-350">
            <h4 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Update Scholar Scheme Credentials</h4>
            <form onSubmit={handleSaveScholarship} className="space-y-4">
              <div>
                <Label>Student Ledger Name</Label>
                <span className="font-extrabold text-xs text-slate-800 block">{editingScholar.name} ({editingScholar.grade})</span>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Portal Scholarship ID</Label>
                  <Input required value={schId} onChange={e => setSchId(e.target.value)} placeholder=" NSP Portal or UP State ID" />
                </div>
                <div>
                  <Label>Scholar Scheme Category</Label>
                  <Input as="select" value={schCat} onChange={e => setSchCat(e.target.value)}>
                    <option value="Pre Metric Student Scheme">Pre Metric Student Scheme</option>
                    <option value="UP Highschool Post-Metric Scheme">UP Highschool Post-Metric Scheme</option>
                    <option value="Central Minority Concession Scholarship">Central Minority Concession Scholarship</option>
                  </Input>
                </div>
                <div>
                  <Label>Bank Account Number</Label>
                  <Input required value={acctNo} onChange={e => setAcctNo(e.target.value)} placeholder="Core Banking A/C number" />
                </div>
                <div>
                  <Label>IFS Code</Label>
                  <Input required value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} placeholder="IFSC" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditingScholar(null)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 text-white font-bold">Apply Changes</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
