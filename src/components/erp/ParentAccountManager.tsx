import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Input, Label } from '../UI';
import { Trash2, Link as LinkIcon, UserPlus, Check } from 'lucide-react';
import { ParentAccount } from '../../types';

export function ParentAccountManager() {
  const { parentAccounts, students, addParentAccount, updateParentAccount, deleteParentAccount } = useStore();
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [searchStudent, setSearchStudent] = useState('');

  const handleCreateParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !name || !password) return;

    if (parentAccounts.some(p => p.mobile === mobile)) {
      alert("A parent account with this mobile number already exists.");
      return;
    }

    const newParent: ParentAccount = {
      id: `parent_${Date.now()}`,
      role: 'PARENT',
      name,
      mobile,
      email: email || mobile, // use mobile as email/username if empty
      password,
      studentIds: [],
    };

    addParentAccount(newParent);
    setSelectedParentId(newParent.id);
    setName('');
    setMobile('');
    setEmail('');
    setPassword('');
  };

  const handleLinkStudent = (parentId: string, studentId: string) => {
    const parent = parentAccounts.find(p => p.id === parentId);
    if (!parent) return;

    if (parent.studentIds.includes(studentId)) {
      alert("Student is already linked to this parent.");
      return;
    }

    updateParentAccount(parentId, { studentIds: [...parent.studentIds, studentId] });
  };

  const handleUnlinkStudent = (parentId: string, studentId: string) => {
    const parent = parentAccounts.find(p => p.id === parentId);
    if (!parent) return;

    updateParentAccount(parentId, { 
      studentIds: parent.studentIds.filter(id => id !== studentId) 
    });
  };

  const filteredStudents = searchStudent.trim() 
    ? students.filter(s => 
        (s.name.toLowerCase().includes(searchStudent.toLowerCase()) || 
         (s.fatherName && s.fatherName.toLowerCase().includes(searchStudent.toLowerCase())) || 
         s.admissionNo?.includes(searchStudent))
      )
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-500" />
          Create Combined Parent Account
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Create a centralized parent login. The parent can use their mobile number to login and viw reports for all linked children simultaneously.
        </p>

        <form onSubmit={handleCreateParent} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <Label>Parent Name</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Mr. Sharma" />
          </div>
          <div>
            <Label>Mobile Number (Login ID)</Label>
            <Input required value={mobile} onChange={e => setMobile(e.target.value)} placeholder="9876543210" pattern="[0-9]{10}" title="10 digit mobile number" />
          </div>
          <div>
            <Label>Email (Optional)</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@address.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          <Button type="submit" className="w-full">Create Account</Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-bold text-slate-700">Existing Parent Accounts</h4>
          {parentAccounts.length === 0 ? (
            <div className="p-4 bg-slate-50 text-center text-sm text-slate-500 rounded-lg border border-slate-200">
              No parent accounts created yet.
            </div>
          ) : (
            parentAccounts.map(parent => (
              <div 
                key={parent.id} 
                className={`bg-white rounded p-4 border overflow-hidden cursor-pointer transition-colors ${selectedParentId === parent.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
                onClick={() => setSelectedParentId(parent.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-bold text-slate-800 text-lg">{parent.name}</h5>
                    <div className="text-sm text-slate-600 font-mono mt-1">ID/Mobile: {parent.mobile}</div>
                    {parent.email && parent.email !== parent.mobile && (
                      <div className="text-sm text-slate-600 font-mono">Email: {parent.email}</div>
                    )}
                    <div className="text-xs text-slate-500 font-mono mb-2">Password: {parent.password}</div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this parent account completely?')) {
                        deleteParentAccount(parent.id);
                        if (selectedParentId === parent.id) setSelectedParentId(null);
                      }
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded p-2 text-sm border border-slate-100">
                  <strong className="text-slate-700 block mb-1">Linked Children: ({parent.studentIds.length})</strong>
                  {parent.studentIds.length > 0 ? (
                    <div className="space-y-1.5">
                      {parent.studentIds.map(sid => {
                        const s = students.find(x => x.id === sid);
                        if (!s) return null;
                        return (
                          <div key={sid} className="flex items-center justify-between bg-white border border-slate-200 px-2 py-1 rounded text-xs">
                            <span className="font-medium text-slate-700">{s.name} <span className="text-slate-400 font-normal">| Class {s.grade}</span></span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkStudent(parent.id, sid);
                              }}
                              className="text-xs text-rose-500 hover:text-rose-700 font-bold ml-2"
                            >
                              Unlink
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">No children linked yet. Select this account to map students.</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-slate-700 text-indigo-800">
            Link Students {selectedParentId ? `to ${parentAccounts.find(p => p.id === selectedParentId)?.name}` : ''}
          </h4>
          
          {!selectedParentId ? (
            <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-lg text-center text-indigo-700 text-sm">
              <LinkIcon className="w-8 h-8 opacity-50 mx-auto mb-2" />
              Please select a parent account from the left panel to map children to it.
            </div>
          ) : (
            <Card className="bg-indigo-50/30 border-indigo-100">
              <div className="mb-4">
                <Label>Search Student to Link</Label>
                <Input 
                  placeholder="Search by student name, father name, or admission no..." 
                  value={searchStudent} 
                  onChange={e => setSearchStudent(e.target.value)} 
                />
              </div>

              {searchStudent.trim() !== '' && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4">No matching students found.</div>
                  ) : (
                    filteredStudents.map(student => {
                      const isLinked = parentAccounts.find(p => p.id === selectedParentId)?.studentIds.includes(student.id);
                      return (
                        <div key={student.id} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm">
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{student.name}</div>
                            <div className="text-xs text-slate-500">Class: {student.grade} | Father: {student.fatherName || 'N/A'}</div>
                          </div>
                          {isLinked ? (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold uppercase tracking-wider">
                              <Check className="w-3 h-3" /> Linked
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleLinkStudent(selectedParentId, student.id)}
                              className="text-white bg-indigo-600 hover:bg-indigo-700 text-xs px-3 py-1.5 rounded-md font-semibold transition-colors"
                            >
                              Link Child
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
