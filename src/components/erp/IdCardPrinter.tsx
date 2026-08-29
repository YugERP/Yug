import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type School } from '../../types';
import { Printer, Search, CreditCard, LayoutTemplate, Users, User } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { isSameGrade, normalizeGrade, ALL_STANDARD_CLASSES, isValidPhotoUrl } from '../../utils/gradeHelper';

// ---------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------

// Template 1: Classic Duo (Front & Back)
const ClassicDuoCard = ({ student, school }: { student: Student; school?: School }) => (
  <div className="flex flex-col md:flex-row gap-6 justify-center items-center py-4 print:flex-row print:gap-4 print:break-inside-avoid print:page-break-inside-avoid mb-8">
    {/* CARD FACE A: FRONT */}
    <div className="w-[54.5mm] h-[86.5mm] bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 rounded-xl overflow-hidden border border-indigo-500 flex flex-col justify-between p-3 shadow-xl relative text-white print:shadow-none">
      <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-200/5 rounded-full blur-lg"></div>

      <div className="text-center border-b border-indigo-500/40 pb-1.5 shrink-0 z-10 flex flex-col items-center justify-center gap-0.5">
        {school?.logo && <img src={school.logo} alt="Logo" className="w-8 h-8 object-contain mb-0.5" />}
        <h1 className="text-[10px] font-black tracking-wider uppercase text-indigo-100">{school?.name || 'SCHOOL NAME'}</h1>
        <p className="text-[5px] text-indigo-300 uppercase tracking-[0.25em]">{school?.udiseCode ? `UDISE: ${school.udiseCode}` : 'CODE: 385'}</p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-1.5 z-10 flex-1 my-2">
        {isValidPhotoUrl(student.docStudentPhoto || student.photoUrl) ? (
          <img 
            src={(isValidPhotoUrl(student.docStudentPhoto) ? student.docStudentPhoto : student.photoUrl) || ''} 
            alt="" 
            className="w-[62px] h-[75px] object-cover border-2 border-indigo-400 rounded-lg shadow-md" 
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-[62px] h-[75px] bg-slate-800 rounded-lg border-2 border-dashed border-indigo-500/40 flex items-center justify-center text-[8px] text-indigo-300 font-medium select-none">Pic</div>
        )}

        <div className="text-center space-y-0.5">
          <h2 className="text-[11px] font-black text-white px-1 leading-tight uppercase truncate max-w-[170px]">{student.name}</h2>
          <p className="text-[7.5px] bg-gradient-to-r from-teal-500 to-indigo-500 text-white rounded px-2 py-0.5 inline-block font-black uppercase tracking-wider">{student.grade}</p>
        </div>
      </div>

      <div className="text-[8px] space-y-1 bg-white/5 border border-white/10 rounded-lg p-2 font-medium shrink-0 z-10 text-slate-200">
        <div className="flex justify-between"><span>SR No:</span> <span className="font-bold text-white font-mono">{student.srNo || 'N/A'}</span></div>
        <div className="flex justify-between"><span>Roll No:</span> <span className="font-bold text-teal-400 font-mono">{student.rollNo}</span></div>
        <div className="flex justify-between"><span>Blood Group:</span> <span className="font-bold text-rose-400">{student.bloodGroup || 'O+'}</span></div>
      </div>

      <p className="text-[6px] text-center text-indigo-300 uppercase tracking-widest font-black shrink-0 mt-1">STUDENT IDENTITY CARD</p>
    </div>

    {/* CARD FACE B: BACK */}
    <div className="w-[54.5mm] h-[86.5mm] bg-white rounded-xl overflow-hidden border border-slate-300 flex flex-col justify-between p-3 shadow-xl relative text-slate-800 print:shadow-none">
      <div className="text-center border-b pb-1.5 shrink-0">
        <span className="text-[5px] uppercase font-bold text-slate-400 block tracking-widest">institution address & rules</span>
        <p className="text-[7px] font-black text-indigo-900 uppercase">{school?.name || 'SCHOOL NAME'}</p>
      </div>

      <div className="space-y-1.5 text-[7px] py-2 flex-1 flex flex-col justify-center">
        <p><span className="font-extrabold text-slate-400 uppercase w-16 inline-block">Father Name:</span> <span className="font-bold text-slate-700">{student.fatherName || 'N/A'}</span></p>
        <p><span className="font-extrabold text-slate-400 uppercase w-16 inline-block">Mother Name:</span> <span className="font-bold text-slate-700">{student.motherName || 'N/A'}</span></p>
        <p><span className="font-extrabold text-slate-400 uppercase w-16 inline-block">Emerg Contact:</span> <span className="font-bold text-slate-900 font-mono">{student.mobile || 'N/A'}</span></p>
        
        <div className="pt-1.5 border-t border-slate-100 flex flex-col">
          <span className="font-extrabold text-slate-400 uppercase text-[6px]">Residential Address:</span>
          <p className="leading-tight text-slate-500 italic mt-0.5">
            {student.presentVillageMohalla || student.address || 'N/A'}, 
            P.O: {student.presentPostOffice || 'N/A'}, 
            Dist: {student.presentDistrict || 'Prayagraj'} ({student.presentPinCode || '211001'})
          </p>
        </div>
      </div>

      <div className="space-y-2 shrink-0 border-t border-slate-100 pt-2 text-center flex flex-col items-center">
        <div className="w-32 h-6 bg-slate-100 border border-slate-200 rounded flex flex-col justify-between p-0.5 relative overflow-hidden flex items-center justify-center">
          <div className="w-full h-full flex gap-[2px] overflow-hidden opacity-80">
            {Array.from({length: 22}).map((_, i) => (
              <div key={i} className="bg-slate-800" style={{ width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '1px' : '2px', height: '100%' }}></div>
            ))}
          </div>
          <span className="font-mono text-[5px] text-slate-600 tracking-[0.15em] uppercase font-bold absolute bottom-0">{student.attendanceId || 'ATT1004'}</span>
        </div>

        <div className="w-full flex justify-between items-center text-[5px] text-slate-400 font-extrabold uppercase mt-1">
          <span>RFID SMART ID CARD</span>
          <div className="text-center">
            <div className="w-12 border-b border-slate-300 mb-0.5"></div>
            <span>Principal Sign</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Template 2: Modern Blue Single Side
const ModernBlueCard = ({ student, school }: { student: Student; school?: School }) => (
  <div className="w-[54.5mm] h-[86.5mm] bg-white overflow-hidden relative flex flex-col shadow-xl print:shadow-none print:break-inside-avoid print:page-break-inside-avoid mb-8 mx-auto" style={{ border: '1px solid #e2e8f0' }}>
    {/* Top Header Background */}
    <div className="absolute top-0 left-0 w-full h-[34mm] bg-[#2C62A8] z-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}></div>
    <div className="absolute top-0 left-0 w-full h-[27mm] bg-[#1a4a82] z-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}></div>
    
    {/* Top Accent Triangles */}
    <div className="absolute top-8 left-[-10px] w-12 h-12 bg-[#2c5282] rotate-45 z-0"></div>
    <div className="absolute top-8 right-[-10px] w-12 h-12 bg-[#2c5282] rotate-45 z-0"></div>

    {/* Header Text */}
    <div className="z-10 text-center pt-2 shrink-0 flex flex-col items-center">
      {school?.logo && (
        <img src={school.logo} alt="Logo" className="w-6 h-6 object-contain mb-0.5" />
      )}
      <h1 className="text-white font-extrabold text-[12px] uppercase tracking-wide leading-tight drop-shadow-sm px-1">
        {school?.name || 'COMPANY'}
      </h1>
      <p className="text-white/90 font-bold text-[6.5px] uppercase tracking-wider mt-0.5">
        {school?.mobile ? `Ph: ${school.mobile}` : ''} {school?.mobile && school?.udiseCode ? '|' : ''} {school?.udiseCode ? `UDISE: ${school.udiseCode}` : (school?.mobile ? '' : 'TAGLINE GOES HERE')}
      </p>
    </div>

    {/* Stylish ID CARD Title */}
    <div className="z-10 text-center mt-1.5 shrink-0">
      <span className="text-white bg-white/20 px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm border border-white/30 backdrop-blur-sm">
        ID Card
      </span>
    </div>

    {/* Avatar / Photo */}
    <div className="z-10 mt-[2mm] flex justify-center shrink-0">
      <div className="w-[26mm] h-[26mm] rounded-full bg-white p-[2px] shadow-sm">
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
          {isValidPhotoUrl(student.docStudentPhoto || student.photoUrl) ? (
            <img 
              src={(isValidPhotoUrl(student.docStudentPhoto) ? student.docStudentPhoto : student.photoUrl) || ''} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <span className="text-[10px] text-slate-400 font-medium select-none">Pic</span>
          )}
        </div>
      </div>
    </div>

    {/* Name & Role */}
    <div className="z-10 text-center mt-1.5 shrink-0">
      <h2 className="text-[#1e293b] font-black text-[14px] uppercase tracking-wide px-2 truncate leading-tight">
        {student.name}
      </h2>
      <p className="text-[#475569] text-[9px] font-black uppercase tracking-widest mt-0.5">
        {student.grade}
      </p>
    </div>

    {/* Details List */}
    <div className="flex-1 flex flex-col justify-center px-[5mm] z-10 mt-0.5 mb-[4mm] text-[8.5px] text-[#1e293b] font-bold space-y-[1.5px] leading-tight">
      <div className="flex">
        <span className="w-14 font-extrabold shrink-0 text-[#475569]">Father</span>
        <span className="px-1 font-extrabold text-[#475569]">:</span>
        <span className="truncate font-black">{student.fatherName || 'N/A'}</span>
      </div>
      <div className="flex">
        <span className="w-14 font-extrabold shrink-0 text-[#475569]">Mother</span>
        <span className="px-1 font-extrabold text-[#475569]">:</span>
        <span className="truncate font-black">{student.motherName || 'N/A'}</span>
      </div>
      <div className="flex">
        <span className="w-14 font-extrabold shrink-0 text-[#475569]">DOB</span>
        <span className="px-1 font-extrabold text-[#475569]">:</span>
        <span className="truncate font-black">{student.dob ? new Date(student.dob).toLocaleDateString() : 'MM/DD/YYYY'}</span>
      </div>
      <div className="flex">
        <span className="w-14 font-extrabold shrink-0 text-[#475569]">Address</span>
        <span className="px-1 font-extrabold text-[#475569]">:</span>
        <span className="truncate font-black" title={student.address}>{student.presentVillageMohalla || student.address || 'Address line here'}</span>
      </div>
      <div className="flex">
        <span className="w-14 font-extrabold shrink-0 text-[#475569]">Phone</span>
        <span className="px-1 font-extrabold text-[#475569]">:</span>
        <span className="truncate font-black tracking-wide">{student.mobile || '000-000-00'}</span>
      </div>
    </div>

    {/* Bottom Footer Border */}
    <div className="h-[4.5mm] bg-[#2C62A8] w-full mt-auto z-10 flex items-center justify-center">
      <span className="text-white/60 text-[5px] font-bold tracking-widest uppercase">Valid for Current Academic Session</span>
    </div>
  </div>
);


// ---------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------

export function IdCardPrinter() {
  const { students, schools, currentUser } = useStore();
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('portrait');
  
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>('single');
  const [selectedTemplate, setSelectedTemplate] = useState<'modern_blue' | 'classic_duo'>('modern_blue');

  const existingGrades = Array.from(new Set(students.filter(s => !s.isDeleted).map(s => normalizeGrade(s.grade))));
  const classes = Array.from(new Set([...ALL_STANDARD_CLASSES, ...existingGrades]));

  const classStudents = students.filter(s => !s.isDeleted && (s.grade === selectedClass || isSameGrade(s.grade, selectedClass)));
  const filteredStudents = classStudents.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.srNo && s.srNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.rollNo && String(s.rollNo).includes(searchTerm))
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const currentSchool = schools.find(s => s.id === currentUser?.schoolId);

  // Setup react-to-print
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page {
        size: A4 ${printLayout};
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          justify-content: flex-start;
          align-items: flex-start;
        }
      }
    `
  });

  // Decide which students to render for printing
  const studentsToPrint = printMode === 'bulk' ? filteredStudents : (selectedStudent ? [selectedStudent] : []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar Controls */}
      <Card className="p-4 bg-slate-50/50 no-print md:col-span-1 space-y-6">
        
        {/* Mode & Template */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block border-b pb-1">Print Configuration</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                type="button" 
                onClick={() => setPrintMode('single')}
                className={`py-2 text-[10px] font-bold ${printMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
              >
                <User className="w-3.5 h-3.5 mb-1 mx-auto" />
                Single
              </Button>
              <Button 
                type="button" 
                onClick={() => setPrintMode('bulk')}
                className={`py-2 text-[10px] font-bold ${printMode === 'bulk' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
              >
                <Users className="w-3.5 h-3.5 mb-1 mx-auto" />
                Bulk
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Template Design</Label>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setSelectedTemplate('modern_blue')}
                  className={`flex items-center gap-2 p-2 rounded text-xs border text-left transition-all ${selectedTemplate === 'modern_blue' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="w-8 h-10 bg-[#2C62A8] rounded-sm shrink-0 border border-slate-300 relative overflow-hidden flex flex-col">
                    <div className="h-[10px] w-full bg-[#1a4a82]"></div>
                    <div className="w-3 h-3 bg-white rounded-full mx-auto mt-1"></div>
                    <div className="h-1 bg-[#2C62A8] w-full mt-auto"></div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Modern Blue</p>
                    <p className="text-[9px] text-slate-500">Single Face (54.5x86.5mm)</p>
                  </div>
                </button>
                <button 
                  onClick={() => setSelectedTemplate('classic_duo')}
                  className={`flex items-center gap-2 p-2 rounded text-xs border text-left transition-all ${selectedTemplate === 'classic_duo' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex gap-1 shrink-0">
                    <div className="w-4 h-10 bg-indigo-900 rounded-sm border border-slate-300"></div>
                    <div className="w-4 h-10 bg-white rounded-sm border border-slate-300"></div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Classic Duo</p>
                    <p className="text-[9px] text-slate-500">Front & Back Dual</p>
                  </div>
                </button>
              </div>
            </div>
            
            <div>
              <Label>Paper Orientation</Label>
              <Input as="select" value={printLayout} onChange={e => setPrintLayout(e.target.value as any)}>
                <option value="portrait">A4 Portrait</option>
                <option value="landscape">A4 Landscape</option>
              </Input>
            </div>
          </div>
        </div>

        {/* Selection */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block border-b pb-1">Select Targets</h3>
          
          <div className="space-y-3">
            <div>
              <Label>Class / Grade</Label>
              <Input as="select" value={selectedClass} onChange={e => {
                setSelectedClass(e.target.value);
                setSelectedStudentId('');
              }}>
                {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
              </Input>
            </div>
            
            {printMode === 'single' && (
              <>
                <div>
                  <Label>Search Student</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Search name or ID..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded pl-7 pr-2.5 py-1.5 focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-1 bg-white border rounded p-1">
                  {filteredStudents.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4">No matching students found.</p>
                  ) : filteredStudents.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs leading-tight block transition-colors ${selectedStudentId === s.id ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-100 bg-white'}`}
                    >
                      <p>{s.name}</p>
                      <span className="text-[9px] opacity-80 block font-mono">ID: {s.srNo || 'N/A'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {printMode === 'bulk' && (
              <div className="p-3 bg-indigo-50 text-indigo-800 rounded text-xs border border-indigo-100">
                <p className="font-bold mb-1">Bulk Print Mode</p>
                <p>This will generate ID cards for all <strong>{filteredStudents.length}</strong> students currently enrolled in <strong>{selectedClass}</strong>.</p>
              </div>
            )}
          </div>
        </div>

      </Card>

      {/* ID Card Preview / Display */}
      <div className="md:col-span-3 space-y-4">
        <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm no-print">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-indigo-600" />
              Preview & Print
            </h2>
            <p className="text-xs text-slate-500">
              {studentsToPrint.length > 0 
                ? `Showing ${studentsToPrint.length} card${studentsToPrint.length > 1 ? 's' : ''} ready for printing.`
                : 'Select a target to preview cards.'}
            </p>
          </div>
          
          <Button 
            onClick={handlePrint} 
            disabled={studentsToPrint.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 px-6 font-bold text-xs shadow-md disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print {studentsToPrint.length > 0 ? `(${studentsToPrint.length})` : ''}</span>
          </Button>
        </div>

        {/* Printable Area Wrapper */}
        <div className="bg-slate-100 rounded-lg border p-4 overflow-auto max-h-[800px]">
          {studentsToPrint.length > 0 ? (
            <div ref={printRef} className="print-container flex flex-wrap gap-4 justify-center md:justify-start">
              {studentsToPrint.map(student => (
                <div key={student.id} className="shrink-0">
                  {selectedTemplate === 'modern_blue' 
                    ? <ModernBlueCard student={student} school={currentSchool} />
                    : <ClassicDuoCard student={student} school={currentSchool} />
                  }
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg bg-slate-50 text-slate-400">
               <CreditCard className="w-12 h-12 mb-2 text-slate-300" />
               <p className="text-sm font-semibold">Ready to Print</p>
               <p className="text-xs max-w-sm text-center mt-1">Configure your settings on the left sidebar to generate beautiful ID card layouts.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

