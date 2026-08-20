import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { Printer } from 'lucide-react';
import { type Student } from '../../types';

export function AdmitCardGenerator() {
  const { students, schools, currentUser, activeAcademicSession } = useStore();
  const [selectedClass, setSelectedClass] = useState('');
  const [examType, setExamType] = useState('Half Yearly');
  const [singleStudentId, setSingleStudentId] = useState('');
  const [startingExamRollNo, setStartingExamRollNo] = useState('1001');
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('landscape');
  const [template, setTemplate] = useState<'normal' | 'watermark'>('normal');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const currentSchool = schools.find(school => school.id === currentUser?.schoolId);

  // Filter students by active school and academic session first
  const activeStudents = students.filter(
    s => s.schoolId === currentUser?.schoolId && s.academicSession === activeAcademicSession
  );

  // Define class order for global sorting
  const classOrder = [
    'PG', 'Nursery', 'L.K.G', 'LKG', 'U.K.G', 'UKG', 
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
    'Class 11', 'Class 12',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
  ];

  const getClassIndex = (grade: string) => {
    const idx = classOrder.indexOf(grade);
    return idx === -1 ? 999 : idx; // Put unknown classes at the end
  };
  
  // Sort all active students globally to assign continuous exam roll numbers
  const sortedStudentsGlobal = [...activeStudents].sort((a, b) => {
    const classDiff = getClassIndex(a.grade) - getClassIndex(b.grade);
    if (classDiff !== 0) return classDiff;
    const aRoll = parseInt(a.rollNo) || 0;
    const bRoll = parseInt(b.rollNo) || 0;
    if (aRoll !== bRoll) return aRoll - bRoll;
    return a.name.localeCompare(b.name);
  });

  // Calculate Exam Roll Number for a given student
  const getExamRollNo = (studentId: string) => {
    if (!startingExamRollNo) return '';
    const index = sortedStudentsGlobal.findIndex(s => s.id === studentId);
    if (index === -1) return '';
    return (parseInt(startingExamRollNo) + index).toString();
  };

  // Group students by class
  const classGroups = Array.from(new Set(activeStudents.map(s => s.grade))).sort((a, b) => getClassIndex(a as string) - getClassIndex(b as string));

  const filteredStudents = sortedStudentsGlobal.filter(s => s.grade === selectedClass);

  // If singleStudentId is set, filter to only that student, else use selectedStudentIds
  const studentsToRender = singleStudentId 
    ? filteredStudents.filter(s => s.id === singleStudentId)
    : filteredStudents.filter(s => selectedStudentIds.includes(s.id));

  const triggerBulkPrint = () => {
    setSingleStudentId('');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const triggerSinglePrint = (id: string) => {
    setSingleStudentId(id);
    setTimeout(() => {
      window.print();
      // Optional: reset after print dialog closes, but we might just leave it so they can see what they printed
    }, 100);
  };

  const isSingle = !!singleStudentId;

  const renderAdmitCard = (student: Student) => {
    return (
      <div 
        key={student.id} 
        className={`border-2 border-slate-800 p-4 print:p-2 lg:p-4 bg-white break-inside-avoid print:shadow-none shadow-sm relative group flex flex-col overflow-hidden`}
      >
        {template === 'watermark' && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' transform='rotate(-30 100 100)' font-family='sans-serif' font-size='7pt' font-weight='bold' fill='rgba(0,0,0,0.08)'>${encodeURIComponent(currentSchool?.name || 'SCHOOL NAME')}</text></svg>")`,
              backgroundRepeat: 'repeat',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              zIndex: 0
            }}
          />
        )}
        
        {/* Single Print Button (Hidden in print) */}
        <button 
          onClick={() => triggerSinglePrint(student.id)}
          className="absolute -top-3 -right-3 bg-indigo-600 text-white rounded-full p-2 shadow-md hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity no-print z-20"
          title="Print only this student"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <div className="relative z-10 flex flex-col">
          <div className="text-center font-serif py-1 mb-2 relative">
            <div className="flex items-center justify-center gap-2">
              <div className="flex-1 flex justify-start pl-2">
                {currentSchool?.logo && <img src={currentSchool.logo} alt="School Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />}
              </div>
              <div className="flex-[4] text-center px-1">
                <h1 className="font-black text-slate-900 leading-none uppercase text-base sm:text-lg md:text-xl" style={{ fontSize: currentSchool?.name && currentSchool.name.length > 30 ? '0.95rem' : currentSchool?.name && currentSchool.name.length > 20 ? '1.1rem' : '1.35rem' }}>
                  {currentSchool?.name || 'SCHOOL NAME'}
                </h1>
                <p className="text-[9px] text-slate-800 font-bold uppercase mt-1 leading-tight">{currentSchool?.address || 'Location District, State, India'}</p>
                <p className="text-[9px] font-bold text-slate-800">MOBILE NUMBER-{currentSchool?.mobile || 'N/A'}{currentSchool?.altMobile ? `,${currentSchool.altMobile}` : ''}</p>
              </div>
              <div className="flex-1"></div>
            </div>
            <div className="text-center font-bold text-xs uppercase mt-1 text-slate-700">
              {examType} EXAMINATION
            </div>
          </div>

          <div className="flex justify-between items-center px-2 mb-2 font-bold text-red-600 text-xs">
            <div>SESSION-{activeAcademicSession || '2025-26'}</div>
            <div className="bg-slate-200 text-slate-900 px-3 py-0.5 rounded-full border border-slate-400 text-xs shadow-sm">ADMIT CARD</div>
            <div className="flex gap-1 items-center">
              <span>Roll Number:</span>
              <span className="inline-block border-b-2 border-red-600 w-16 text-center text-slate-900">{getExamRollNo(student.id) || student.rollNo}</span>
            </div>
          </div>
          
          <div className="flex gap-4 px-2">
            <div className="flex-1 space-y-1 text-xs font-bold uppercase">
              <div className="grid grid-cols-[80px_10px_1fr]">
                <span className="text-slate-900 text-xs">NAME</span>
                <span>:</span>
                <span className="text-slate-900 text-xs">{student.name}</span>
              </div>
              <div className="grid grid-cols-[80px_10px_1fr]">
                <span className="text-slate-900 text-xs">F'S NAME</span>
                <span>:</span>
                <span className="text-slate-900 text-xs">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[80px_10px_1fr]">
                <span className="text-slate-900 text-xs">CLASS</span>
                <span>:</span>
                <span className="text-slate-900 text-xs">{student.grade} {student.section ? `(Sec ${student.section})` : ''}</span>
              </div>
              <div className="grid grid-cols-[80px_10px_1fr]">
                <span className="text-slate-900 text-xs">ADDRESS</span>
                <span>:</span>
                <span className="text-slate-900 text-xs leading-tight">
                  {student.address || [student.presentVillageMohalla, student.presentPostOffice, student.presentTehsil, student.presentDistrict, student.presentState, student.presentPinCode].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
            </div>

            <div className="w-20 print:w-20 flex flex-col items-center justify-start shrink-0 mr-1 print:mr-0">
              <div className="w-[75px] h-[95px] print:w-[65px] print:h-[80px] border-2 border-slate-800 flex items-center justify-center bg-white text-[10px] text-slate-400 overflow-hidden shrink-0">
                {student.docStudentPhoto ? (
                  <img src={student.docStudentPhoto} alt={student.name} className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-center px-1 text-[9px]">Photo</span>
                )}
              </div>
              <div className="w-full mt-2 print:mt-1 border-t border-slate-800 text-center text-[9px] print:text-[8px] font-bold text-slate-900 pt-0.5">
                PRINCIPAL SIGNATURE
              </div>
            </div>
          </div>

          <div className="mt-4 print:mt-2 flex gap-2 border-t-2 border-slate-800 pt-1 print:pt-0.5 z-10 relative bg-white">
            <div className="w-full text-[12px] print:text-[12px] font-bold text-slate-900 leading-tight">
              <div className="text-[13px] print:text-[13px] mb-0.5 font-black text-indigo-900">नोट:</div>
              <div>1-परीक्षार्थी अपना सम्पूर्ण {examType === 'Half Yearly' ? 'अर्धवार्षिक (Half Yearly)' : examType === 'Annual' ? 'वार्षिक (Annual)' : examType} शुल्क परीक्षा प्रारम्भ होने से पहले जमा करा दें अन्यथा परीक्षा में बैठने की अनुमति नहीं होगी।</div>
              <div>2- छात्र/छात्रा परीक्षा में यथासमय आवश्यक सामग्री के साथ विद्यालय में उपस्थित हों।</div>
              <div>3-प्रवेश पत्र के बिना परीक्षा में बैठने नहीं दिया जायेगा।</div>
              <div>4-परीक्षा के समय स्कूल में कोई भी इलेक्ट्रॉनिक उपकरण जैसे-मोबाइल फ़ोन, घड़ी इत्यादि वस्तुएं लाना सख्त मना है।</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 ${printLayout} !important;
            margin: 5mm !important;
          }
          
          body {
            background: white !important;
            color: #000000 !important;
          }

          .no-print, .no-print * {
            display: none !important;
          }

          /* Reset ancestor margins and paddings to prevent offsets */
          body, #root, main, .space-y-6, .space-y-4, .p-6, .p-4 {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #printable-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            display: block !important;
          }

          /* Ensure the grid wrapper flows continuously */
          .admit-card-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            grid-auto-rows: min-content !important;
            width: 100% !important;
            box-sizing: border-box !important;
            gap: 4mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .admit-card-grid > div {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      ` }} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <Card className="p-4 bg-slate-50/50 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 border-b pb-1">
            Admit Card Configuration
          </h3>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Starting Exam Roll No (Optional)</Label>
              <Input type="number" placeholder="e.g. 1001" value={startingExamRollNo} onChange={e => setStartingExamRollNo(e.target.value)} />
            </div>
            <div>
              <Label>Select Examination Type</Label>
              <Input as="select" value={examType} onChange={e => setExamType(e.target.value as any)}>
                <option value="Half Yearly">Half Yearly Examination</option>
                <option value="Annual">Annual Examination</option>
              </Input>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Select Class/Grade</Label>
                <Input as="select" value={selectedClass} onChange={e => {
                  const cls = e.target.value;
                  setSelectedClass(cls);
                  setSingleStudentId(''); // Reset single print view on class change
                  setSelectedStudentIds(sortedStudentsGlobal.filter(s => s.grade === cls).map(s => s.id));
                }}>
                  <option value="">-- Choose Class --</option>
                  {classGroups.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </Input>
              </div>
              <div className="flex-1">
                <Label>Print Layout</Label>
                <Input as="select" value={printLayout} onChange={e => setPrintLayout(e.target.value as any)}>
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </Input>
              </div>
              <div className="flex-1">
                <Label>Template</Label>
                <Input as="select" value={template} onChange={e => setTemplate(e.target.value as any)}>
                  <option value="normal">Normal</option>
                  <option value="watermark">With Watermark</option>
                </Input>
              </div>
            </div>
            {selectedClass && filteredStudents.length > 0 && (
              <div className="pt-1 border-t border-slate-200 mt-2">
                <div className="flex justify-between items-center mb-1">
                  <Label>Select Specific Students</Label>
                  <button 
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                    onClick={() => {
                      if (selectedStudentIds.length === filteredStudents.length) {
                        setSelectedStudentIds([]);
                      } else {
                        setSelectedStudentIds(filteredStudents.map(s => s.id));
                      }
                    }}
                  >
                    {selectedStudentIds.length === filteredStudents.length ? 'Unselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded p-2 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredStudents.map(student => (
                    <label key={student.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds([...selectedStudentIds, student.id]);
                          } else {
                            setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <span className="truncate">{student.name} ({getExamRollNo(student.id) || student.rollNo})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              <Button onClick={triggerBulkPrint} className="w-full flex items-center justify-center gap-2" variant="primary" disabled={!selectedClass || selectedStudentIds.length === 0}>
                <Printer className="w-4 h-4" />
                Print Selected ({selectedStudentIds.length})
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {singleStudentId && (
        <div className="no-print mb-4 flex justify-between items-center bg-indigo-50 p-3 rounded border border-indigo-100">
          <span className="text-sm font-bold text-indigo-900">Showing single admit card preview...</span>
          <Button onClick={() => setSingleStudentId('')} variant="outline" className="text-xs py-1 h-auto">Show All Class Cards</Button>
        </div>
      )}

      <div id="printable-area" className="w-full">
        {selectedClass && studentsToRender.length > 0 ? (
          <div className="admit-card-grid grid grid-cols-1 md:grid-cols-2 gap-8 print:mb-0 mb-8">
            {studentsToRender.map(student => renderAdmitCard(student))}
          </div>
        ) : (
          <div className="col-span-full py-10 text-center text-slate-500 text-sm no-print">
             {!selectedClass ? 'Please select a class to generate admit cards.' : 'No students found in the selected class.'}
          </div>
        )}
      </div>
    </div>
  );
}
