import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { Printer, Upload, Image as ImageIcon, Trash2, Info, CheckCircle2, Sliders, Eye, Sparkles, LayoutTemplate, Layers, AlertCircle } from 'lucide-react';
import { type Student } from '../../types';
import { normalizeGrade, isSameGrade, ALL_STANDARD_CLASSES } from '../../utils/gradeHelper';

export function AdmitCardGenerator() {
  const { students, schools, currentUser, activeAcademicSession } = useStore();
  const [selectedSession, setSelectedSession] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState('');
  const [examType, setExamType] = useState('Half Yearly');
  const [singleStudentId, setSingleStudentId] = useState('');
  const [startingExamRollNo, setStartingExamRollNo] = useState('1001');
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('landscape');
  const [template, setTemplate] = useState<'normal' | 'watermark' | 'custom'>('normal');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Custom Template State
  const [customTemplateImg, setCustomTemplateImg] = useState<string>(() => {
    return localStorage.getItem('sch_custom_admit_card_template') || '';
  });
  const [templateOpacity, setTemplateOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('sch_custom_admit_card_opacity');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [hideDefaultHeader, setHideDefaultHeader] = useState<boolean>(() => {
    return localStorage.getItem('sch_custom_admit_card_hide_header') === 'true';
  });
  const [hideDefaultBorder, setHideDefaultBorder] = useState<boolean>(() => {
    return localStorage.getItem('sch_custom_admit_card_hide_border') === 'true';
  });
  const [templateDimensions, setTemplateDimensions] = useState<{ width: number; height: number; ratio: number } | null>(null);
  const [showDimensionGuide, setShowDimensionGuide] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSchool = schools.find(school => school.id === currentUser?.schoolId);

  // Measure uploaded template dimensions
  useEffect(() => {
    if (customTemplateImg) {
      const img = new Image();
      img.onload = () => {
        const ratio = parseFloat((img.naturalWidth / img.naturalHeight).toFixed(2));
        setTemplateDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
          ratio
        });
      };
      img.src = customTemplateImg;
    } else {
      setTemplateDimensions(null);
    }
  }, [customTemplateImg]);

  // Handle template image upload
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया केवल इमेज फाइल (PNG, JPG, JPEG, WEBP) ही अपलोड करें।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('फाइल का साइज़ 5MB से कम होना चाहिए।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setCustomTemplateImg(result);
        setTemplate('custom');
        try {
          localStorage.setItem('sch_custom_admit_card_template', result);
        } catch (err) {
          console.warn('Could not store full template in localStorage', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTemplate = () => {
    setCustomTemplateImg('');
    if (template === 'custom') setTemplate('normal');
    localStorage.removeItem('sch_custom_admit_card_template');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateOpacity = (val: number) => {
    setTemplateOpacity(val);
    localStorage.setItem('sch_custom_admit_card_opacity', val.toString());
  };

  const toggleHideHeader = (val: boolean) => {
    setHideDefaultHeader(val);
    localStorage.setItem('sch_custom_admit_card_hide_header', val.toString());
  };

  const toggleHideBorder = (val: boolean) => {
    setHideDefaultBorder(val);
    localStorage.setItem('sch_custom_admit_card_hide_border', val.toString());
  };

  // Collect available academic sessions from students and system config
  const availableSessions = Array.from(new Set([
    'All',
    ...(activeAcademicSession ? [activeAcademicSession] : []),
    ...(students.map(s => s.academicSession).filter(Boolean) as string[]),
    '2025-26',
    '2026-27'
  ]));

  // Filter students by active school and academic session (defaults to All Sessions so all imported students show immediately)
  const activeStudents = students.filter(s => {
    if (s.isDeleted) return false;
    const matchesSchool = !currentUser?.schoolId || !s.schoolId || s.schoolId === currentUser?.schoolId;
    const matchesSession = selectedSession === 'All' || !selectedSession || !s.academicSession || s.academicSession === selectedSession;
    return matchesSchool && matchesSession;
  });

  // Define class order for global sorting
  const classOrder = [
    'PG', 'Nursery', 'L.K.G', 'LKG', 'U.K.G', 'UKG', 
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
    'Class 11', 'Class 12',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
  ];

  const getClassIndex = (grade: string) => {
    const norm = normalizeGrade(grade);
    const idx = ALL_STANDARD_CLASSES.indexOf(norm);
    if (idx !== -1) return idx;
    const rawIdx = classOrder.indexOf(grade);
    return rawIdx === -1 ? 999 : rawIdx;
  };
  
  // Sort all active students globally to assign continuous exam roll numbers
  const sortedStudentsGlobal = [...activeStudents].sort((a, b) => {
    const classDiff = getClassIndex(a.grade) - getClassIndex(b.grade);
    if (classDiff !== 0) return classDiff;
    const aRoll = parseInt(a.rollNo) || 0;
    const bRoll = parseInt(b.rollNo) || 0;
    if (aRoll !== bRoll) return aRoll - bRoll;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Calculate Exam Roll Number for a given student
  const getExamRollNo = (studentId: string) => {
    if (!startingExamRollNo) return '';
    const index = sortedStudentsGlobal.findIndex(s => s.id === studentId);
    if (index === -1) return '';
    return (parseInt(startingExamRollNo) + index).toString();
  };

  // Group students by class
  const existingGrades: string[] = Array.from(new Set(activeStudents.map(s => normalizeGrade(s.grade)))).filter((g): g is string => Boolean(g));
  const classGroups: string[] = Array.from(new Set([...ALL_STANDARD_CLASSES, ...existingGrades])).sort((a, b) => getClassIndex(a) - getClassIndex(b));

  const filteredStudents = sortedStudentsGlobal.filter(s => 
    selectedClass ? (isSameGrade(s.grade, selectedClass) || s.grade === selectedClass) : true
  );

  // Auto initialize selectedClass to first class with students if empty
  useEffect(() => {
    if (!selectedClass && activeStudents.length > 0) {
      const firstClassWithStudents = classGroups.find(cls => 
        activeStudents.some(s => isSameGrade(s.grade, cls) || s.grade === cls)
      );
      if (firstClassWithStudents) {
        setSelectedClass(firstClassWithStudents);
      }
    }
  }, [activeStudents.length, selectedClass]);

  // Keep selectedStudentIds synchronized when class changes
  useEffect(() => {
    if (selectedClass) {
      const matched = sortedStudentsGlobal.filter(s => isSameGrade(s.grade, selectedClass) || s.grade === selectedClass);
      setSelectedStudentIds(matched.map(s => s.id));
    }
  }, [selectedClass, sortedStudentsGlobal.length]);

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
    }, 100);
  };

  const renderAdmitCard = (student: Student) => {
    const isCustom = template === 'custom' && !!customTemplateImg;

    return (
      <div 
        key={student.id} 
        className={`${hideDefaultBorder && isCustom ? 'border border-transparent' : 'border-2 border-slate-900'} p-3.5 print:p-2.5 lg:p-4 bg-white break-inside-avoid print:shadow-none shadow-sm relative group flex flex-col justify-between overflow-hidden min-h-[385px] print:min-h-[365px]`}
      >
        {/* Custom Uploaded Background Template */}
        {isCustom && (
          <img 
            src={customTemplateImg} 
            alt="Custom Admit Card Template" 
            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 print:block"
            style={{ 
              opacity: templateOpacity / 100,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          />
        )}

        {/* Watermark Template */}
        {template === 'watermark' && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' transform='rotate(-30 110 110)' font-family='sans-serif' font-size='8pt' font-weight='bold' fill='rgba(0,0,0,0.07)'>${encodeURIComponent(currentSchool?.name || 'SCHOOL NAME')}</text></svg>")`,
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
          className="absolute -top-2.5 -right-2.5 bg-indigo-600 text-white rounded-full p-2 shadow-md hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity no-print z-30"
          title="Print only this student"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <div className="relative z-10 flex flex-col flex-1 justify-between">
          {/* Header Section */}
          {(!isCustom || !hideDefaultHeader) ? (
            <div className="text-center font-serif py-1 mb-1.5 relative">
              <div className="flex items-center justify-center gap-2">
                <div className="flex-1 flex justify-start pl-1">
                  {currentSchool?.logo && (
                    <img 
                      src={currentSchool.logo} 
                      alt="School Logo" 
                      className="w-14 h-14 object-contain" 
                      referrerPolicy="no-referrer" 
                    />
                  )}
                </div>
                <div className="flex-[4] text-center px-1">
                  <h1 
                    className="font-black text-slate-900 leading-none uppercase tracking-tight" 
                    style={{ fontSize: currentSchool?.name && currentSchool.name.length > 30 ? '0.95rem' : currentSchool?.name && currentSchool.name.length > 20 ? '1.1rem' : '1.3rem' }}
                  >
                    {currentSchool?.name || 'SCHOOL NAME'}
                  </h1>
                  <p className="text-[9px] text-slate-800 font-bold uppercase mt-1 leading-tight">{currentSchool?.address || 'Location District, State, India'}</p>
                  <p className="text-[9px] font-bold text-slate-800">MOBILE NUMBER-{currentSchool?.mobile || 'N/A'}{currentSchool?.altMobile ? `, ${currentSchool.altMobile}` : ''}</p>
                </div>
                <div className="flex-1"></div>
              </div>
              <div className="text-center font-black text-xs uppercase mt-0.5 text-slate-800 tracking-wider">
                {examType} EXAMINATION
              </div>
            </div>
          ) : (
            /* Spacer for Custom Template Header */
            <div className="h-16 flex items-end justify-center pb-1">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest bg-white/80 px-3 py-0.5 rounded shadow-2xs">
                {examType} EXAMINATION
              </span>
            </div>
          )}

          {/* Sub Header Badge: Session & Roll No */}
          <div className="flex justify-between items-center px-2 py-0.5 mb-2 font-bold text-red-600 text-xs bg-white/70 backdrop-blur-[1px] rounded">
            <div className="font-bold">SESSION-{activeAcademicSession || '2025-26'}</div>
            <div className="bg-slate-900 text-white px-3 py-0.5 rounded-full text-xs font-black tracking-wider shadow-2xs">
              ADMIT CARD / प्रवेश पत्र
            </div>
            <div className="flex gap-1 items-center">
              <span className="text-slate-800 font-bold">Roll No:</span>
              <span className="inline-block border-b-2 border-red-600 min-w-[50px] text-center font-black text-slate-900 bg-white/80 px-1">
                {getExamRollNo(student.id) || student.rollNo}
              </span>
            </div>
          </div>
          
          {/* Main Info Grid */}
          <div className="flex gap-3 px-1.5 bg-white/65 p-1.5 rounded backdrop-blur-[1px]">
            <div className="flex-1 space-y-1 text-xs font-bold uppercase">
              <div className="grid grid-cols-[82px_8px_1fr] items-center">
                <span className="text-slate-900 text-xs font-bold">STUDENT NAME</span>
                <span className="text-slate-800">:</span>
                <span className="text-slate-950 text-xs font-black">{student.name}</span>
              </div>
              <div className="grid grid-cols-[82px_8px_1fr] items-center">
                <span className="text-slate-900 text-xs font-bold">FATHER'S NAME</span>
                <span className="text-slate-800">:</span>
                <span className="text-slate-950 text-xs font-black">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[82px_8px_1fr] items-center">
                <span className="text-slate-900 text-xs font-bold">MOTHER'S NAME</span>
                <span className="text-slate-800">:</span>
                <span className="text-slate-950 text-xs font-black">{student.motherName || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[82px_8px_1fr] items-center">
                <span className="text-slate-900 text-xs font-bold">CLASS & SEC</span>
                <span className="text-slate-800">:</span>
                <span className="text-slate-950 text-xs font-black">{student.grade} {student.section ? `(Section ${student.section})` : ''}</span>
              </div>
              <div className="grid grid-cols-[82px_8px_1fr] items-start">
                <span className="text-slate-900 text-xs font-bold">ADDRESS</span>
                <span className="text-slate-800">:</span>
                <span className="text-slate-900 text-xs font-bold leading-tight line-clamp-1">
                  {student.address || [student.presentVillageMohalla, student.presentPostOffice, student.presentDistrict].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
            </div>

            {/* Photo & Signature Box */}
            <div className="w-20 print:w-20 flex flex-col items-center justify-start shrink-0">
              <div className="w-[72px] h-[88px] print:w-[64px] print:h-[78px] border-2 border-slate-900 flex items-center justify-center bg-white text-[10px] text-slate-400 overflow-hidden shrink-0 shadow-2xs">
                {student.docStudentPhoto ? (
                  <img 
                    src={student.docStudentPhoto} 
                    alt={student.name} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="text-center p-1 text-[8px] font-bold text-slate-400 uppercase">
                    Affix Photo
                  </div>
                )}
              </div>
              <div className="w-full mt-2 print:mt-1 border-t-2 border-slate-900 text-center text-[9px] print:text-[8px] font-black text-slate-900 pt-0.5 uppercase tracking-tighter">
                PRINCIPAL SIGN
              </div>
            </div>
          </div>

          {/* Instructions Footer */}
          <div className="mt-2.5 print:mt-1.5 border-t-2 border-slate-900 pt-1.5 print:pt-1 z-10 relative bg-white/80 backdrop-blur-[1px] rounded-b">
            <div className="w-full text-[10.5px] print:text-[10px] font-bold text-slate-900 leading-[1.3]">
              <div className="text-[11px] print:text-[10.5px] mb-0.5 font-black text-indigo-950 flex items-center gap-1">
                <span>निर्देश (Important Instructions):</span>
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                <div>1. परीक्षार्थी परीक्षा शुल्क परीक्षा प्रारम्भ होने से पूर्व जमा करा दें अन्यथा परीक्षा में बैठने की अनुमति नहीं होगी।</div>
                <div>2. छात्र/छात्रा परीक्षा में यथासमय आवश्यक सामग्री एवं इस मूल प्रवेश पत्र के साथ उपस्थित हों।</div>
                <div>3. परीक्षा कक्ष में मोबाइल फोन, स्मार्ट वॉच या अन्य अनुचित इलेक्ट्रॉनिक साधन लाना पूर्णतः वर्जित है।</div>
              </div>
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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

      {/* Top Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 no-print">
        {/* Card 1: Exam & Class Setup */}
        <Card className="p-4 bg-slate-50/70 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Printer className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              1. Admit Card & Class Setup
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label>Academic Session</Label>
                <Input as="select" value={selectedSession} onChange={e => {
                  setSelectedSession(e.target.value);
                  setSingleStudentId('');
                }}>
                  {availableSessions.map(ses => (
                    <option key={ses} value={ses}>
                      {ses === 'All' ? 'All Sessions (सभी सत्र)' : ses}
                    </option>
                  ))}
                </Input>
              </div>
              <div>
                <Label>Starting Roll No</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 1001" 
                  value={startingExamRollNo} 
                  onChange={e => setStartingExamRollNo(e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label>Exam Type</Label>
                <Input as="select" value={examType} onChange={e => setExamType(e.target.value as any)}>
                  <option value="Half Yearly">Half Yearly</option>
                  <option value="Annual">Annual</option>
                  <option value="Pre-Board">Pre-Board</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Unit Test">Unit Test</option>
                </Input>
              </div>
              <div>
                <Label>Print Layout</Label>
                <Input as="select" value={printLayout} onChange={e => setPrintLayout(e.target.value as any)}>
                  <option value="landscape">Landscape (2 on A4)</option>
                  <option value="portrait">Portrait</option>
                </Input>
              </div>
            </div>

            <div>
              <Label>Select Class <span className="text-rose-500">*</span></Label>
              <Input as="select" value={selectedClass} onChange={e => {
                const cls = e.target.value;
                setSelectedClass(cls);
                setSingleStudentId('');
                setSelectedStudentIds(sortedStudentsGlobal.filter(s => isSameGrade(s.grade, cls) || s.grade === cls).map(s => s.id));
              }}>
                <option value="">-- Choose Class --</option>
                {classGroups.map(cls => {
                  const stCount = activeStudents.filter(s => isSameGrade(s.grade, cls) || s.grade === cls).length;
                  const label = cls.startsWith('Class') || cls === 'Nursery' || cls === 'L.K.G' || cls === 'U.K.G' ? cls : `Class ${cls}`;
                  return (
                    <option key={cls} value={cls}>
                      {label} {stCount > 0 ? `(${stCount} Students)` : ''}
                    </option>
                  );
                })}
              </Input>
            </div>

            {selectedClass && filteredStudents.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <Label>Select Students ({selectedStudentIds.length}/{filteredStudents.length})</Label>
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
                <div className="max-h-28 overflow-y-auto border border-slate-200 rounded p-1.5 bg-white grid grid-cols-1 gap-1">
                  {filteredStudents.map(student => (
                    <label key={student.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-indigo-50/50 px-1.5 py-1 rounded">
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
                        className="rounded text-indigo-600"
                      />
                      <span className="truncate font-semibold text-slate-800">{student.name} ({getExamRollNo(student.id) || student.rollNo})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={triggerBulkPrint} 
              className="w-full flex items-center justify-center gap-2 mt-2 font-bold shadow-sm" 
              variant="primary" 
              disabled={!selectedClass || selectedStudentIds.length === 0}
            >
              <Printer className="w-4 h-4" />
              Print Admit Cards ({selectedStudentIds.length})
            </Button>
          </div>
        </Card>

        {/* Card 2: Custom Template Uploader & Style Selection */}
        <Card className="p-4 bg-slate-50/70 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                2. Template Choice & Upload
              </h3>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              Custom BG
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <Label>Active Template Style</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTemplate('normal')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    template === 'normal'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('watermark')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    template === 'watermark'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Watermark
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('custom')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    template === 'custom'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Custom Upload
                </button>
              </div>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-white hover:border-indigo-400 transition-all text-center">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleTemplateUpload}
                className="hidden" 
                id="templateUploadInput"
              />

              {customTemplateImg ? (
                <div className="space-y-2">
                  <div className="relative inline-block w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    <img 
                      src={customTemplateImg} 
                      alt="Uploaded Template" 
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                      {templateDimensions ? `${templateDimensions.width} × ${templateDimensions.height} px` : 'Uploaded'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded font-bold flex items-center gap-1 border border-indigo-200"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      बदलें (Replace)
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveTemplate}
                      className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 px-2.5 py-1 rounded font-bold flex items-center gap-1 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      हटाएं (Remove)
                    </button>
                  </div>
                </div>
              ) : (
                <label htmlFor="templateUploadInput" className="cursor-pointer block py-2 space-y-1.5">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-700 hover:underline block">
                      कस्टम टेम्पलेट इमेज अपलोड करें
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      PNG / JPG (1000 × 650 px अनुशंसित)
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* Custom Template Toggles & Opacity */}
            {customTemplateImg && (
              <div className="p-2.5 bg-slate-100/70 rounded-lg border border-slate-200 space-y-2.5">
                <div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-slate-500" />
                      पृष्ठभूमि पारदर्शिता (Opacity):
                    </span>
                    <span className="text-indigo-600 font-mono">{templateOpacity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="15" 
                    max="100" 
                    value={templateOpacity}
                    onChange={e => updateOpacity(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-200">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-800 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={hideDefaultHeader}
                      onChange={e => toggleHideHeader(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>स्कूल हेडर छिपाएं (अगर टेम्पलेट में पहले से है)</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-800 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={hideDefaultBorder}
                      onChange={e => toggleHideBorder(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>काली बॉर्डर छिपाएं (अगर टेम्पलेट में बॉर्डर है)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Card 3: Exact Dimensions & Mapping Guidelines */}
        <Card className="p-4 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border border-indigo-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-700" />
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                3. Size & Mapping Guide (माप निर्देश)
              </h3>
            </div>
            <span className="text-[10px] bg-indigo-200/70 text-indigo-900 px-2 py-0.5 rounded font-black">
              1.54 : 1
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700">
            {/* Dimensions Badge */}
            <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
              <div className="text-[11px] font-black text-indigo-900 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                सटीक टेम्पलेट साइज़ (Perfect Dimensions):
              </div>
              <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
                <div className="bg-indigo-50/70 p-1.5 rounded border border-indigo-200/60">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Landscape (2 on A4)</div>
                  <div className="text-xs font-black text-indigo-900">1000 × 650 px</div>
                  <div className="text-[9px] text-slate-500 font-sans">140mm × 92mm</div>
                </div>
                <div className="bg-purple-50/70 p-1.5 rounded border border-purple-200/60">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Portrait (1 Full)</div>
                  <div className="text-xs font-black text-purple-900">800 × 1150 px</div>
                  <div className="text-[9px] text-slate-500 font-sans">148mm × 210mm</div>
                </div>
              </div>
            </div>

            {/* Uploaded image validation status */}
            {templateDimensions && (
              <div className={`p-2 rounded-lg text-[11px] font-bold flex items-start gap-1.5 border ${
                templateDimensions.ratio >= 1.4 && templateDimensions.ratio <= 1.7
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {templateDimensions.ratio >= 1.4 && templateDimensions.ratio <= 1.7 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span>टेम्पलेट फिटिंग सही है! ({templateDimensions.width}×{templateDimensions.height}px)</span>
                      <span className="block text-[10px] font-normal text-emerald-700">यह Landscape A4 पर बिना खींचे बिल्कुल सटीक प्रिंट होगा।</span>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span>अपलोड माप: {templateDimensions.width}×{templateDimensions.height}px (Ratio: {templateDimensions.ratio})</span>
                      <span className="block text-[10px] font-normal text-amber-800">सर्वोत्तम प्रिंट हेतु 1000×650 px (1.54:1) अनुपात का उपयोग करें।</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Layout Map Summary */}
            <div className="bg-white/80 p-2 rounded-lg border border-slate-200 text-[11px] space-y-1">
              <span className="font-black text-slate-800 block text-[10px] uppercase">
                📌 टेम्पलेट डिज़ाइन करते समय ध्यान रखें:
              </span>
              <ul className="space-y-0.5 text-[10.5px] text-slate-650 leading-tight">
                <li>• <b>शीर्ष 20% (Top):</b> स्कूल नाम, लोगो व पता।</li>
                <li>• <b>मध्य बायां (Left 70%):</b> छात्र का नाम, पिता, कक्षा, रोल नं।</li>
                <li>• <b>मध्य दायां (Right 30%):</b> फोटो बॉक्स एवं प्रधानाचार्य हस्ताक्षर।</li>
                <li>• <b>निचला 20% (Bottom):</b> परीक्षा नियम व आवश्यक निर्देश।</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {singleStudentId && (
        <div className="no-print mb-4 flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-200 shadow-2xs">
          <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            Showing single student admit card preview...
          </span>
          <Button onClick={() => setSingleStudentId('')} variant="outline" className="text-xs py-1 h-auto">
            Show All Class Cards
          </Button>
        </div>
      )}

      {/* Printable Cards Grid */}
      <div id="printable-area" className="w-full">
        {selectedClass && studentsToRender.length > 0 ? (
          <div className="admit-card-grid grid grid-cols-1 md:grid-cols-2 gap-6 print:mb-0 mb-8">
            {studentsToRender.map(student => renderAdmitCard(student))}
          </div>
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm no-print border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">
              {!selectedClass ? 'कृपया एडमिट कार्ड देखने के लिए ऊपर से कक्षा (Class) चुनें।' : 'चयनित कक्षा में कोई छात्र नहीं मिला।'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              आप अपना कस्टम टेम्पलेट भी अपलोड करके लाइव प्रीव्यू देख सकते हैं।
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

