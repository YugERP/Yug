import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student } from '../../types';
import { Printer, Search, FileText } from 'lucide-react';

export function TcCcGenerator() {
  const { students, schools, currentUser } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const currentSchool = schools.find(school => school.id === currentUser?.schoolId);
  const brandColor = currentSchool?.reportCardColor || '#002060';
  const [searchTerm, setSearchTerm] = useState('');

  // Certificate customization configurations
  const [certType, setCertType] = useState<'TC' | 'CC' | 'SR_TC'>('TC');
  const [serialNo, setSerialNo] = useState(() => `CERT/SCH/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [leavingCause, setLeavingCause] = useState('Completed Class 10 Higher Secondary and going elsewhere for Intermediate Studies');
  const [conduct, setConduct] = useState('Excellent & disciplined human behaviour');
  const [duesStatus, setDuesStatus] = useState('Cleared (All dues paid up to termination)');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leavingClass, setLeavingClass] = useState('');
  const [admissionClass, setAdmissionClass] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('portrait');

  // Signature Template states
  const [sigStyle, setSigStyle] = useState<'classic' | 'upboard'>('upboard');
  const [sigLeft, setSigLeft] = useState('लिपिक / Clerk');
  const [sigMiddle, setSigMiddle] = useState('जाँचकर्ता / Checker');
  const [sigRight, setSigRight] = useState('');

  // Font auto-scaling helpers for long table text & metadata fields
  const getDynamicFontSizeClass = (text: string, defaultSize = 'text-[9px]') => {
    if (!text) return defaultSize;
    if (text.length > 25) return 'text-[6px] leading-[1.1]';
    if (text.length > 15) return 'text-[7px] leading-tight';
    if (text.length > 8) return 'text-[8px] leading-tight';
    return defaultSize;
  };

  const getDynamicFieldFontSizeClass = (text: string) => {
    if (!text) return 'text-xs';
    if (text.length > 140) return 'text-[10px] leading-snug';
    if (text.length > 90) return 'text-[11px] leading-snug';
    return 'text-xs';
  };

  const renderSignatureSection = () => {
    if (sigStyle === 'upboard') {
      return (
        <div className="mt-8 flex justify-between items-end border-t border-slate-200 pt-6 text-[10px] font-bold text-slate-700 tracking-wide font-sans">
          <div className="text-center w-36 flex flex-col items-center">
            <div className="w-full border-b border-slate-300 mb-1"></div>
            <span className="whitespace-pre-line text-center leading-tight">{sigLeft}</span>
          </div>
          
          <div className="text-center w-36 flex flex-col items-center">
            <div className="w-full border-b border-slate-300 mb-1"></div>
            <span className="whitespace-pre-line text-center leading-tight">{sigMiddle}</span>
          </div>

          <div className="relative flex flex-col items-center no-print-input text-[8px] text-slate-400">
            <div className="w-14 h-14 rounded-full border border-slate-300 border-dashed flex items-center justify-center text-[6px] text-slate-400 leading-none text-center p-1">
              संस्था प्रधान सील / SEAL
            </div>
            <span className="mt-1 uppercase tracking-wider text-[7px] font-bold text-slate-400">Office Seal</span>
          </div>
          
          <div className="text-center w-48 flex flex-col items-center">
            <div className="w-full border-b border-slate-300 mb-1"></div>
            <span className="whitespace-pre-line text-center leading-tight font-black text-slate-900">{sigRight}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-8 flex justify-between items-end border-t border-slate-100 pt-6 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        <div className="text-center w-28">
          <div className="w-full border-b border-slate-300 mb-1"></div>
          <span>Prepared by Registrar</span>
        </div>
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-2 border-slate-400 border-dashed flex items-center justify-center text-[7px] text-slate-300 leading-none text-center">PRINCIPAL CENTRAL SEAL OFFICE</div>
          <span className="mt-1">OFFICE EMBOSS SEAL</span>
        </div>
        <div className="text-center w-28">
          <div className="w-full border-b border-slate-300 mb-1"></div>
          <span>Countersigned Principal</span>
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    if (currentSchool?.name) {
      setSigRight(`प्रधानाचार्य / Principal\n${currentSchool.name}`);
    } else {
      setSigRight('प्रधानाचार्य / Principal\nSchool Name');
    }
  }, [currentSchool]);

  // Core student state variables (allows completely manual custom inputs)
  const [studentName, setStudentName] = useState('');
  const [studentNameHindi, setStudentNameHindi] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [srNo, setSrNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('भारतीय / Indian');
  const [caste, setCaste] = useState('');
  const [category, setCategory] = useState('');
  const [religion, setReligion] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('कृषि / Labor');
  const [studentAddress, setStudentAddress] = useState('');
  const [penNo, setPenNo] = useState('');

  // Scholar's Register & Transfer Certificate (SR_TC) states
  const [pageNo, setPageNo] = useState('51');
  const [registerNo, setRegisterNo] = useState('251');
  const [admissionFileNo, setAdmissionFileNo] = useState('104');
  const [withdrawalFileNo, setWithdrawalFileNo] = useState('89');
  const [tcNoVal, setTcNoVal] = useState('125');
  const [scholarDetailsVal, setScholarDetailsVal] = useState('');
  const [parentDetailsVal, setParentDetailsVal] = useState('');
  const [dobVal, setDobVal] = useState('');
  const [dobWordsVal, setDobWordsVal] = useState('');
  const [lastInstitutionVal, setLastInstitutionVal] = useState('');
  const [datedValue, setDatedValue] = useState(() => new Date().toLocaleDateString('en-GB'));
  const [gridRows, setGridRows] = useState<{
    id: string;
    classLabel: string;
    admDate: string;
    promDate: string;
    remDate: string;
    cause: string;
    year: string;
    conduct: string;
    work: string;
    sign: string;
  }[]>([]);

  // Timeline Generator states
  const [timelineStartClass, setTimelineStartClass] = useState('Class I');
  const [timelineEndClass, setTimelineEndClass] = useState('Class V');
  const [timelineStartDate, setTimelineStartDate] = useState('02-07-2020');
  const [timelineEndDate, setTimelineEndDate] = useState('20-05-2025');
  const [timelineStartYear, setTimelineStartYear] = useState('2020');
  const [timelineRemovalCause, setTimelineRemovalCause] = useState('Completed Class 5 Higher Secondary and going elsewhere');

  // Automatically adjust orientation when layout category changes
  React.useEffect(() => {
    if (certType === 'SR_TC') {
      setPrintLayout('landscape');
    } else {
      setPrintLayout('portrait');
    }
  }, [certType]);

  React.useEffect(() => {
    if (selectedStudent) {
      setStudentName(selectedStudent.name || '');
      setStudentNameHindi(selectedStudent.studentNameHindi || '');
      setFatherName(selectedStudent.fatherName || '');
      setMotherName(selectedStudent.motherName || '');
      setSrNo(selectedStudent.srNo || '');
      setRollNo(selectedStudent.rollNo || '');
      setDob(selectedStudent.dob || '');
      setNationality(selectedStudent.nationality || 'भारतीय / Indian');
      setCaste(selectedStudent.caste || '');
      setCategory(selectedStudent.category || '');
      setReligion(selectedStudent.religion || '');
      setFatherOccupation(selectedStudent.fatherOccupation || 'कृषि / Labor');
      setStudentAddress(selectedStudent.address || '');
      setPenNo(selectedStudent.penNo || '');

      setLeavingClass(selectedStudent.grade || '');
      setAdmissionClass(selectedStudent.previousClass || ''); 
      setAdmissionDate(selectedStudent.admissionDate || '');

      // Initialize SR_TC fields
      setRegisterNo(selectedStudent.rollNo || '251');
      setAdmissionFileNo(selectedStudent.srNo || '104');
      setWithdrawalFileNo(selectedStudent.tcNo || '89');
      setTcNoVal(selectedStudent.tcNo || '125');
      
      const relCaste = [
        selectedStudent.nationality || 'भारतीय / Indian',
        selectedStudent.caste ? `${selectedStudent.category || ''} (${selectedStudent.caste})` : '',
        selectedStudent.religion
      ].filter(Boolean).join(' / ');
      setScholarDetailsVal(`${selectedStudent.name} (${selectedStudent.studentNameHindi || ''}) - ${relCaste}`);

      const fatherOcc = selectedStudent.fatherOccupation || 'कृषि / Labor';
      const address = selectedStudent.address || '';
      setParentDetailsVal(`पिता: ${selectedStudent.fatherName || 'N/A'}, माता: ${selectedStudent.motherName || 'N/A'} (व्यवसाय: ${fatherOcc}) - पता: ${address}`);

      setDobVal(selectedStudent.dob || '');
      
      // Translate DOB to words
      if (selectedStudent.dob) {
        try {
          const d = new Date(selectedStudent.dob);
          if (!isNaN(d.getTime())) {
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const dayNames = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth', 'Thirty-First'];
            const day = d.getDate();
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            setDobWordsVal(`${dayNames[day - 1]} ${month} Two Thousand ${year - 2000}`);
          } else {
            setDobWordsVal('');
          }
        } catch (e) {
          setDobWordsVal('');
        }
      } else {
        setDobWordsVal('');
      }

      setLastInstitutionVal(selectedStudent.previousSchoolName || 'N/A');

      // Initialize dynamic grid rows for classes
      const classesList = ['Nursery', 'L.K.G', 'U.K.G', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X', 'Class XI', 'Class XII'];
      const rows = classesList.map((cls, idx) => {
        const isCurrentClass = selectedStudent.grade?.toLowerCase().replace(/\s/g, '') === cls.toLowerCase().replace(/\s/g, '') ||
                              (cls === 'Class I' && selectedStudent.grade === 'Class 1') ||
                              (cls === 'Class II' && selectedStudent.grade === 'Class 2') ||
                              (cls === 'Class III' && selectedStudent.grade === 'Class 3') ||
                              (cls === 'Class IV' && selectedStudent.grade === 'Class 4') ||
                              (cls === 'Class V' && selectedStudent.grade === 'Class 5') ||
                              (cls === 'Class VI' && selectedStudent.grade === 'Class 6') ||
                              (cls === 'Class VII' && selectedStudent.grade === 'Class 7') ||
                              (cls === 'Class VIII' && selectedStudent.grade === 'Class 8') ||
                              (cls === 'Class IX' && selectedStudent.grade === 'Class 9') ||
                              (cls === 'Class X' && selectedStudent.grade === 'Class 10') ||
                              (cls === 'Class XI' && selectedStudent.grade === 'Class 11') ||
                              (cls === 'Class XII' && selectedStudent.grade === 'Class 12');

        return {
          id: String(idx),
          classLabel: cls,
          admDate: isCurrentClass ? (selectedStudent.admissionDate || '05-07-2025') : '',
          promDate: isCurrentClass ? '20-05-2026' : '',
          remDate: '',
          cause: '',
          year: isCurrentClass ? '2025-26' : '',
          conduct: isCurrentClass ? 'Uttam / उत्तम' : '',
          work: isCurrentClass ? 'Sreshtha / श्रेष्ठ' : '',
          sign: ''
        };
      });
      setGridRows(rows);
    }
  }, [selectedStudent]);

  // Synchronize composite fields in SR_TC whenever individual details change
  React.useEffect(() => {
    const relCaste = [
      nationality || 'भारतीय / Indian',
      caste ? `${category || ''} (${caste})` : '',
      religion
    ].filter(Boolean).join(' / ');
    setScholarDetailsVal(`${studentName} ${studentNameHindi ? `(${studentNameHindi})` : ''} - ${relCaste}`);
  }, [studentName, studentNameHindi, nationality, caste, category, religion]);

  React.useEffect(() => {
    setParentDetailsVal(`पिता: ${fatherName || 'N/A'}, माता: ${motherName || 'N/A'} (व्यवसाय: ${fatherOccupation}) - पता: ${studentAddress}`);
  }, [fatherName, motherName, fatherOccupation, studentAddress]);

  React.useEffect(() => {
    setDobVal(dob);
    if (dob) {
      try {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const dayNames = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth', 'Thirty-First'];
          const day = d.getDate();
          const month = months[d.getMonth()];
          const year = d.getFullYear();
          setDobWordsVal(`${dayNames[day - 1]} ${month} Two Thousand ${year - 2000}`);
        }
      } catch (e) {}
    }
  }, [dob]);

  const generateTimelineData = () => {
    const classesList = ['Nursery', 'L.K.G', 'U.K.G', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X', 'Class XI', 'Class XII'];
    const startIdx = classesList.indexOf(timelineStartClass);
    const endIdx = classesList.indexOf(timelineEndClass);
    
    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
      alert('Please ensure start class is less than or equal to end class!');
      return;
    }
    
    const startYearNum = parseInt(timelineStartYear, 10) || 2020;
    
    const newRows = classesList.map((cls, idx) => {
      if (idx >= startIdx && idx <= endIdx) {
        const diff = idx - startIdx;
        const classStartYear = startYearNum + diff;
        const classEndYear = classStartYear + 1;
        const yearStr = `${classStartYear}-${String(classEndYear).slice(2)}`;
        
        let admDate = `01-07-${classStartYear}`;
        let promDate = `20-05-${classEndYear}`;
        let remDate = '';
        let cause = '';
        
        if (idx === startIdx) {
          admDate = timelineStartDate;
        }
        
        if (idx === endIdx) {
          promDate = '';
          remDate = timelineEndDate;
          cause = timelineRemovalCause;
        }
        
        return {
          id: String(idx),
          classLabel: cls,
          admDate,
          promDate,
          remDate,
          cause,
          year: yearStr,
          conduct: 'Uttam / उत्तम',
          work: 'Sreshtha / श्रेष्ठ',
          sign: ''
        };
      } else {
        return {
          id: String(idx),
          classLabel: cls,
          admDate: '',
          promDate: '',
          remDate: '',
          cause: '',
          year: '',
          conduct: '',
          work: '',
          sign: ''
        };
      }
    });
    
    setGridRows(newRows);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.srNo?.includes(searchTerm))
  );

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <style>{`
        @media print {
          @page { size: A4 ${printLayout}; margin: 10mm; }
          .print\\:max-w-full { max-width: 100% !important; width: 100% !important; }
        }
      `}</style>
      {/* Student & Config sidebar */}
      <Card className="p-4 bg-slate-50/50 no-print space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block border-b pb-1">1. Certificate configuration</h3>
          <div className="space-y-3">
            <div>
              <Label>Certificate Category</Label>
              <Input as="select" value={certType} onChange={e => setCertType(e.target.value as any)}>
                <option value="TC">Transfer Certificate (TC)</option>
                <option value="CC">Character Certificate (CC)</option>
                <option value="SR_TC">Scholar's Register & TC (UP Board / पत्रावली)</option>
              </Input>
            </div>

            {certType === 'SR_TC' ? (
              <div className="space-y-2 p-2 border rounded bg-amber-50/50">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">UP Board Scholar Form Options</span>
                <div>
                  <Label>Page No. (पृष्ठ संख्या)</Label>
                  <Input value={pageNo} onChange={e => setPageNo(e.target.value)} />
                </div>
                <div>
                  <Label>Register No. (पंजिका संख्या)</Label>
                  <Input value={registerNo} onChange={e => setRegisterNo(e.target.value)} />
                </div>
                <div>
                  <Label>Admission File No. (प्रवेश संख्या)</Label>
                  <Input value={admissionFileNo} onChange={e => setAdmissionFileNo(e.target.value)} />
                </div>
                <div>
                  <Label>Withdrawal File No. (निष्कासन संख्या)</Label>
                  <Input value={withdrawalFileNo} onChange={e => setWithdrawalFileNo(e.target.value)} />
                </div>
                <div>
                  <Label>TC No. (स्थानान्तरण प्रमाण-पत्र संख्या)</Label>
                  <Input value={tcNoVal} onChange={e => setTcNoVal(e.target.value)} />
                </div>
                <div>
                  <Label>Dated (दिनांक)</Label>
                  <Input value={datedValue} onChange={e => setDatedValue(e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label>Serial Registry Number</Label>
                  <Input value={serialNo} onChange={e => setSerialNo(e.target.value)} />
                </div>
                {selectedStudentId && (
                  <div className="p-2 border rounded bg-indigo-50/50 space-y-2">
                    <div>
                      <Label>Admission Class</Label>
                      <Input placeholder="e.g. Nursery" value={admissionClass} onChange={e => setAdmissionClass(e.target.value)} />
                    </div>
                    <div>
                      <Label>Admission Date</Label>
                      <Input type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Leaving / Current Class</Label>
                      <Input value={leavingClass} onChange={e => setLeavingClass(e.target.value)} />
                    </div>
                  </div>
                )}
                <div>
                  <Label>Date of Issue</Label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                {certType === 'TC' ? (
                  <div>
                    <Label>Reason of School Termination</Label>
                    <Input value={leavingCause} onChange={e => setLeavingCause(e.target.value)} />
                  </div>
                ) : null}
                <div>
                  <Label>Conduct / Morality Assessment</Label>
                  <Input value={conduct} onChange={e => setConduct(e.target.value)} />
                </div>
                <div>
                  <Label>Dues Clearance Status</Label>
                  <Input value={duesStatus} onChange={e => setDuesStatus(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <Label>Print Layout</Label>
              <Input as="select" value={printLayout} onChange={e => setPrintLayout(e.target.value as any)}>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </Input>
            </div>

            <div className="border-t pt-2 mt-2 space-y-2">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Signature Block Settings (हस्ताक्षर)</span>
              <div>
                <Label>Signature Style</Label>
                <Input as="select" value={sigStyle} onChange={e => setSigStyle(e.target.value as any)}>
                  <option value="upboard">UP Board Tri-Signature (लिपिक, जाँचकर्ता, प्रधानाचार्य)</option>
                  <option value="classic">Standard Classic (Two Signatures)</option>
                </Input>
              </div>
              {sigStyle === 'upboard' && (
                <div className="space-y-2 p-1.5 border border-slate-200 rounded bg-indigo-50/20">
                  <div>
                    <Label className="text-[9px] font-bold">Left Signature Label (लिपिक)</Label>
                    <input 
                      type="text" 
                      value={sigLeft} 
                      onChange={e => setSigLeft(e.target.value)} 
                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] font-bold">Middle Signature Label (जाँचकर्ता)</Label>
                    <input 
                      type="text" 
                      value={sigMiddle} 
                      onChange={e => setSigMiddle(e.target.value)} 
                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] font-bold">Right Signature & School Name (प्रधानाचार्य)</Label>
                    <textarea 
                      rows={2}
                      value={sigRight} 
                      onChange={e => setSigRight(e.target.value)} 
                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 font-sans"
                      placeholder="e.g. प्रधानाचार्य, स्कूल का नाम"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block border-b pb-1">2. Search & Select Student</h3>
          <div className="space-y-2">
            <div>
              <Label>Find Student Registrar</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded pl-7 pr-2 py-1 focus:outline-none" 
                />
              </div>
            </div>

            <Button 
              type="button" 
              onClick={() => {
                setSelectedStudentId('manual');
                setStudentName('MANUAL STUDENT');
                setStudentNameHindi('मैन्युअल छात्र');
                setFatherName('FATHER NAME');
                setMotherName('MOTHER NAME');
                setSrNo('1245');
                setRollNo('14');
                setDob('2015-08-15');
                setNationality('भारतीय / Indian');
                setCaste('OBC');
                setCategory('OBC');
                setReligion('Hindu / हिन्दू');
                setLeavingClass('Class V');
                setAdmissionClass('Class I');
                setAdmissionDate('2020-07-02');
                setFatherOccupation('कृषि / Labor');
                setStudentAddress('MORADABAD, UP');
                
                // For SR_TC
                setPageNo('51');
                setRegisterNo('251');
                setAdmissionFileNo('104');
                setWithdrawalFileNo('89');
                setTcNoVal('125');
                setLastInstitutionVal('Previous School');
                
                const classesList = ['Nursery', 'L.K.G', 'U.K.G', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X', 'Class XI', 'Class XII'];
                const rows = classesList.map((cls, idx) => ({
                  id: String(idx),
                  classLabel: cls,
                  admDate: '',
                  promDate: '',
                  remDate: '',
                  cause: '',
                  year: '',
                  conduct: '',
                  work: '',
                  sign: ''
                }));
                setGridRows(rows);
              }}
              className={`w-full text-[11px] font-bold flex items-center justify-center gap-1.5 py-1.5 border rounded transition-colors ${selectedStudentId === 'manual' ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700' : 'bg-amber-50 text-amber-850 border-amber-200 hover:bg-amber-100'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manual Entry Mode (बिना छात्र चुने सीधे भरें)</span>
            </Button>
          </div>
        </div>

        <div className="max-h-[140px] overflow-y-auto space-y-1">
          {filteredStudents.length === 0 ? (
            <p className="text-[10px] text-slate-400 text-center py-4">No student matched.</p>
          ) : filteredStudents.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`w-full text-left p-1.5 rounded text-[11px] block transition-colors ${selectedStudentId === s.id ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200 bg-white border'}`}
            >
              {s.name} ({s.grade})
            </button>
          ))}
        </div>

        {(selectedStudent || selectedStudentId === 'manual') && (
          <div className="p-2 border rounded bg-indigo-50/50 space-y-2 text-xs">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block border-b pb-1">Student Personal Details (विवरण)</span>
            <div>
              <Label>Student Name (Eng)</Label>
              <Input value={studentName} onChange={e => setStudentName(e.target.value)} />
            </div>
            <div>
              <Label>Student Name (Hindi)</Label>
              <Input value={studentNameHindi} onChange={e => setStudentNameHindi(e.target.value)} />
            </div>
            <div>
              <Label>Father's Name</Label>
              <Input value={fatherName} onChange={e => setFatherName(e.target.value)} />
            </div>
            <div>
              <Label>Mother's Name</Label>
              <Input value={motherName} onChange={e => setMotherName(e.target.value)} />
            </div>
            <div>
              <Label>Father Occupation (व्यवसाय)</Label>
              <Input value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} />
            </div>
            <div>
              <Label>Address (पता)</Label>
              <Input value={studentAddress} onChange={e => setStudentAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>SR No (प्रवेश सं.)</Label>
                <Input value={srNo} onChange={e => setSrNo(e.target.value)} />
              </div>
              <div>
                <Label>Roll No (अनुक्रमांक)</Label>
                <Input value={rollNo} onChange={e => setRollNo(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Caste (जाति)</Label>
                <Input value={caste} onChange={e => setCaste(e.target.value)} />
              </div>
              <div>
                <Label>Category (वर्ग)</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Religion (धर्म)</Label>
                <Input value={religion} onChange={e => setReligion(e.target.value)} />
              </div>
              <div>
                <Label>Nationality (राष्ट्रीयता)</Label>
                <Input value={nationality} onChange={e => setNationality(e.target.value)} />
              </div>
            </div>
            {certType !== 'SR_TC' && (
              <>
                <div>
                  <Label>Admission Class</Label>
                  <Input placeholder="e.g. Nursery" value={admissionClass} onChange={e => setAdmissionClass(e.target.value)} />
                </div>
                <div>
                  <Label>Admission Date</Label>
                  <Input type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} />
                </div>
                <div>
                  <Label>Leaving / Current Class</Label>
                  <Input value={leavingClass} onChange={e => setLeavingClass(e.target.value)} />
                </div>
              </>
            )}
          </div>
        )}

        {certType === 'SR_TC' && (selectedStudent || selectedStudentId === 'manual') && (
          <div className="space-y-2 p-2 border rounded bg-amber-50/50 text-xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block border-b pb-1">Study Timeline Generator (सत्र फीडर)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Class (से)</Label>
                <Input as="select" value={timelineStartClass} onChange={e => setTimelineStartClass(e.target.value)}>
                  <option value="Nursery">Nursery</option>
                  <option value="L.K.G">L.K.G</option>
                  <option value="U.K.G">U.K.G</option>
                  <option value="Class I">Class I</option>
                  <option value="Class II">Class II</option>
                  <option value="Class III">Class III</option>
                  <option value="Class IV">Class IV</option>
                  <option value="Class V">Class V</option>
                  <option value="Class VI">Class VI</option>
                  <option value="Class VII">Class VII</option>
                  <option value="Class VIII">Class VIII</option>
                  <option value="Class IX">Class IX</option>
                  <option value="Class X">Class X</option>
                  <option value="Class XI">Class XI</option>
                  <option value="Class XII">Class XII</option>
                </Input>
              </div>
              <div>
                <Label>End Class (तक)</Label>
                <Input as="select" value={timelineEndClass} onChange={e => setTimelineEndClass(e.target.value)}>
                  <option value="Nursery">Nursery</option>
                  <option value="L.K.G">L.K.G</option>
                  <option value="U.K.G">U.K.G</option>
                  <option value="Class I">Class I</option>
                  <option value="Class II">Class II</option>
                  <option value="Class III">Class III</option>
                  <option value="Class IV">Class IV</option>
                  <option value="Class V">Class V</option>
                  <option value="Class VI">Class VI</option>
                  <option value="Class VII">Class VII</option>
                  <option value="Class VIII">Class VIII</option>
                  <option value="Class IX">Class IX</option>
                  <option value="Class X">Class X</option>
                  <option value="Class XI">Class XI</option>
                  <option value="Class XII">Class XII</option>
                </Input>
              </div>
            </div>
            <div>
              <Label>Admission Date (प्रवेश तिथि)</Label>
              <Input value={timelineStartDate} onChange={e => setTimelineStartDate(e.target.value)} placeholder="DD-MM-YYYY" />
            </div>
            <div>
              <Label>Removal Date (निष्कासन तिथि)</Label>
              <Input value={timelineEndDate} onChange={e => setTimelineEndDate(e.target.value)} placeholder="DD-MM-YYYY" />
            </div>
            <div>
              <Label>Start Year (प्रारंभिक वर्ष)</Label>
              <Input type="number" value={timelineStartYear} onChange={e => setTimelineStartYear(e.target.value)} />
            </div>
            <div>
              <Label>Removal Cause (निष्कासन कारण)</Label>
              <Input value={timelineRemovalCause} onChange={e => setTimelineRemovalCause(e.target.value)} />
            </div>
            <Button 
              type="button" 
              onClick={generateTimelineData} 
              className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2 text-xs rounded shadow flex items-center justify-center gap-1.5"
            >
              <span>⚡ Auto-fill Class Grid (सत्र स्वतः भरें)</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Printable Sheet panel */}
      <div className="md:col-span-2">
        {(selectedStudent || selectedStudentId === 'manual') ? (
          <div className="space-y-4">
            <div className="flex justify-end no-print">
              <Button onClick={triggerPrint} className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 px-6 font-bold text-xs shadow-md">
                <Printer className="w-4 h-4" />
                <span>Print Certificate Document</span>
              </Button>
            </div>

            {certType === 'SR_TC' ? (
              /* ========================================================
                 NEW UP BOARD SCHOLAR'S REGISTER & TC TEMPLATE
                 ======================================================== */
              <div 
                id="printable-area" 
                className="print-container bg-white border-[6px] border-double p-4 w-full print:max-w-full mx-auto text-slate-800 shadow-sm relative min-h-[90vh] flex flex-col justify-between"
                style={{ borderColor: brandColor }}
              >
                {/* Background decorative internal border */}
                <div className="absolute top-1 left-1 right-1 bottom-1 border border-slate-350 pointer-events-none"></div>

                {/* Page Number (पृष्ठ संख्या) */}
                <div className="absolute top-2 right-4 font-serif text-[10px] font-bold flex items-center gap-1 no-print-input text-slate-800">
                  <span>पृष्ठ संख्या / Page No:</span>
                  <input 
                    type="text" 
                    value={pageNo} 
                    onChange={e => setPageNo(e.target.value)} 
                    className="w-10 bg-transparent text-center font-bold text-blue-800 border-b border-dashed border-slate-400 focus:outline-none print:hidden" 
                  />
                  <span className="hidden print:inline-block font-bold text-slate-950 border-b border-dashed border-slate-400 min-w-[20px] text-center">
                    {pageNo || '___'}
                  </span>
                </div>

                {/* Header with School Name */}
                <div className="pb-1 border-b-2 border-double relative flex flex-row items-center gap-2" style={{ borderColor: brandColor }}>
                  {currentSchool?.logo && (
                    <img src={currentSchool.logo} alt="Logo" className="w-12 h-12 object-contain" />
                  )}
                  <div className="text-center flex-1">
                    <h1 className="text-xl font-black font-serif leading-tight mt-0.5" style={{ color: brandColor }}>{currentSchool?.name || 'SCHOOL NAME'}</h1>
                    <p className="text-[8px] italic text-slate-600 font-medium">{currentSchool?.address || 'Location District, State, India'}</p>
                    <p className="text-[8px] font-bold text-slate-700 mt-0.5 font-mono">Mobile: {currentSchool?.mobile || 'N/A'} {currentSchool?.udiseCode && `| UDISE: ${currentSchool.udiseCode}`}</p>
                  </div>
                </div>
                <div className="text-center mt-1">
                    <div className="bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200 inline-block">
                      <h2 className="text-[11px] font-bold text-slate-800 tracking-wide uppercase font-serif">
                        छात्र/छात्रा पत्रावली तथा स्थानान्तरण प्रमाण-पत्र
                      </h2>
                      <p className="text-[8px] text-slate-500 font-sans font-semibold tracking-wider">
                        Scholar's Register & Transfer Certificate Form
                      </p>
                    </div>
                </div>

                {/* Sub-header Metadata Grid (The 4 columns) */}
                <div className="grid grid-cols-4 gap-1 py-0.5 border-b text-[10px] font-serif font-bold text-slate-700">
                  <div className="flex flex-col border-r border-slate-200 pr-1">
                    <span className="text-[8px] text-slate-500">प्रवेश फाईल संख्या</span>
                    <span className="text-[7px] text-slate-400 italic">Admission File No.</span>
                    <input 
                      type="text" 
                      value={admissionFileNo} 
                      onChange={e => setAdmissionFileNo(e.target.value)} 
                      className="w-full bg-transparent font-bold text-blue-800 text-center mt-0.5 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                    />
                    <span className="hidden print:block text-slate-950 text-center font-bold text-[10px] mt-0.5 border-b border-dashed border-slate-300">
                      {admissionFileNo || '______'}
                    </span>
                  </div>
                  <div className="flex flex-col border-r border-slate-200 px-1">
                    <span className="text-[8px] text-slate-500">निष्कासन फाईल संख्या</span>
                    <span className="text-[7px] text-slate-400 italic">Withdrawl File No.</span>
                    <input 
                      type="text" 
                      value={withdrawalFileNo} 
                      onChange={e => setWithdrawalFileNo(e.target.value)} 
                      className="w-full bg-transparent font-bold text-blue-800 text-center mt-0.5 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                    />
                    <span className="hidden print:block text-slate-950 text-center font-bold text-[10px] mt-0.5 border-b border-dashed border-slate-300">
                      {withdrawalFileNo || '______'}
                    </span>
                  </div>
                  <div className="flex flex-col border-r border-slate-200 px-1">
                    <span className="text-[8px] text-slate-500">स्थानान्तरण प्रमाण-पत्र संख्या</span>
                    <span className="text-[7px] text-slate-400 italic">Transfer Certificate No.</span>
                    <input 
                      type="text" 
                      value={tcNoVal} 
                      onChange={e => setTcNoVal(e.target.value)} 
                      className="w-full bg-transparent font-bold text-blue-800 text-center mt-0.5 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                    />
                    <span className="hidden print:block text-slate-950 text-center font-bold text-[10px] mt-0.5 border-b border-dashed border-slate-300">
                      {tcNoVal || '______'}
                    </span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-slate-500 text-right">पंजिका संख्या</span>
                    <span className="text-[7px] text-slate-400 italic text-right">Register No.</span>
                    <input 
                      type="text" 
                      value={registerNo} 
                      onChange={e => setRegisterNo(e.target.value)} 
                      className="w-full bg-transparent font-bold text-blue-800 text-center mt-0.5 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                    />
                    <span className="hidden print:block text-slate-950 text-center font-bold text-[10px] mt-0.5 border-b border-dashed border-slate-300">
                      {registerNo || '______'}
                    </span>
                  </div>
                </div>

                {/* Detailed Scholar Information Form */}
                <div className="space-y-0.5 my-1">
                  <div className="border-b border-slate-100 flex flex-col gap-0.5 text-[10px]">
                    <div className="flex justify-between font-serif font-bold text-slate-700">
                      <span>छात्र/छात्रा का नाम तथा राष्ट्रीयता एवं जाति यदि हिन्दू हो, अन्यथा धर्म :</span>
                    </div>
                    <div className="text-[8px] text-slate-450 italic">Name of the Scholar with nationality & caste if Hindu otherwise religion</div>
                    <input 
                      type="text" 
                      value={scholarDetailsVal} 
                      onChange={e => setScholarDetailsVal(e.target.value)} 
                      className="w-full bg-transparent font-serif italic font-bold text-blue-800 py-0.5 px-1 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                    />
                    <div className={`hidden print:block w-full font-serif italic font-bold text-slate-900 py-0.5 px-1 border-b border-dashed border-slate-300 min-h-[18px] whitespace-normal break-words leading-tight text-left ${getDynamicFieldFontSizeClass(scholarDetailsVal)}`}>
                      {scholarDetailsVal}
                    </div>
                  </div>

                  <div className="border-b border-slate-100 flex flex-col gap-0.5 text-[10px]">
                    <div className="flex justify-between font-serif font-bold text-slate-700">
                      <span>पिता/संरक्षक अथवा पति का नाम, व्यवसाय तथा पता :</span>
                    </div>
                    <div className="text-[8px] text-slate-450 italic">Name Occupation and Address of parents, guardian or husband</div>
                    <input 
                      type="text" 
                      value={parentDetailsVal} 
                      onChange={e => setParentDetailsVal(e.target.value)} 
                      className="w-full bg-transparent font-serif italic font-bold text-blue-800 py-0.5 px-1 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                    />
                    <div className={`hidden print:block w-full font-serif italic font-bold text-slate-900 py-0.5 px-1 border-b border-dashed border-slate-300 min-h-[18px] whitespace-normal break-words leading-tight text-left ${getDynamicFieldFontSizeClass(parentDetailsVal)}`}>
                      {parentDetailsVal}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-b border-slate-100 text-[10px]">
                    <div className="flex flex-col gap-0.5 border-r border-slate-100 pr-2">
                      <span className="font-serif font-bold text-slate-700">छात्र/छात्रा की जन्म तिथि :</span>
                      <span className="text-[8px] text-slate-450 italic">Date of birth of the scholar</span>
                      <input 
                        type="text" 
                        value={dobVal} 
                        onChange={e => setDobVal(e.target.value)} 
                        className="w-full bg-transparent font-serif italic font-bold text-blue-800 py-0.5 px-1 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                      />
                      <div className="hidden print:block w-full font-serif italic font-bold text-slate-900 text-[10px] py-0.5 px-1 border-b border-dashed border-slate-300 min-h-[18px] whitespace-normal break-words leading-tight text-left font-mono">
                        {dobVal}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 pl-2">
                      <span className="font-serif font-bold text-slate-700">अन्तिम संस्था जिसमें पढ़ा/पढ़ी हो :</span>
                      <span className="text-[8px] text-slate-450 italic">Last Institution attended by the scholar</span>
                      <input 
                        type="text" 
                        value={lastInstitutionVal} 
                        onChange={e => setLastInstitutionVal(e.target.value)} 
                        className="w-full bg-transparent font-serif italic font-bold text-blue-800 py-0.5 px-1 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                      />
                      <div className="hidden print:block w-full font-serif italic font-bold text-slate-900 text-[10px] py-0.5 px-1 border-b border-dashed border-slate-300 min-h-[18px] whitespace-normal break-words leading-tight text-left">
                        {lastInstitutionVal}
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-slate-100 flex flex-col gap-0.5 text-[10px]">
                    <div className="flex justify-between font-serif font-bold text-slate-700">
                      <span>जन्म तिथि शब्दों में :</span>
                      <div className="flex items-center gap-1 text-[9px] print:hidden">
                        <span>PEN No:</span>
                        <input
                          type="text"
                          value={penNo}
                          onChange={e => setPenNo(e.target.value)}
                          className="bg-transparent border-b border-dashed border-slate-400 focus:outline-none w-20 text-blue-800"
                        />
                      </div>
                      <div className="hidden print:flex items-center gap-1 text-[9px]">
                        <span>PEN No:</span>
                        <span className="border-b border-dashed border-slate-400 min-w-[60px] text-center font-bold text-slate-950">
                          {penNo || '__________'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[8px] text-slate-450 italic">Birth date in words</div>
                    <input 
                      type="text" 
                      value={dobWordsVal} 
                      onChange={e => setDobWordsVal(e.target.value)} 
                      className="w-full bg-transparent font-serif italic font-bold text-blue-800 py-0.5 px-1 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 print:hidden text-[10px]" 
                    />
                    <div className={`hidden print:block w-full font-serif italic font-bold text-slate-900 py-0.5 px-1 border-b border-dashed border-slate-300 min-h-[18px] whitespace-normal break-words leading-tight text-left font-serif ${getDynamicFieldFontSizeClass(dobWordsVal)}`}>
                      {dobWordsVal}
                    </div>
                  </div>
                </div>

                {/* The Classes Grid */}
                    <div className="my-2 overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 font-serif text-[8px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-800">
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '10%' }}>कक्षा<br/>Class</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '12%' }}>प्रवेश तिथि<br/>Date of Admission</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '12%' }}>कक्षोन्नति तिथि<br/>Date of Promotion</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '12%' }}>निष्कासन तिथि<br/>Date of removal</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '22%' }}>निष्कासन का कारण<br/>Cause of removal</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '8%' }}>वर्ष<br/>Year</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '9%' }}>आचरण<br/>Conduct</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '9%' }}>कार्य<br/>Work</th>
                        <th className="border border-slate-400 p-0.5 text-center font-bold" style={{ width: '6%' }}>हस्ताक्षर<br/>Sign.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridRows.map((row, index) => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="border border-slate-350 p-0.5 text-center font-bold bg-slate-50 text-slate-800">{row.classLabel}</td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.admDate} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].admDate = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.admDate, 'text-[8px]')}`}>
                              {row.admDate}
                            </div>
                          </td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.promDate} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].promDate = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.promDate, 'text-[8px]')}`}>
                              {row.promDate}
                            </div>
                          </td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.remDate} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].remDate = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.remDate, 'text-[8px]')}`}>
                              {row.remDate}
                            </div>
                          </td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.cause} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].cause = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none px-0.5 print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.cause, 'text-[8px]')}`}>
                              {row.cause}
                            </div>
                          </td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.year} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].year = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.year, 'text-[8px]')}`}>
                              {row.year}
                            </div>
                          </td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.conduct} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].conduct = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.conduct, 'text-[8px]')}`}>
                              {row.conduct}
                            </div>
                          </td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.work} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].work = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.work, 'text-[8px]')}`}>
                              {row.work}
                            </div>
                          </td>
                          <td className="border border-slate-350 p-0 relative">
                            <input 
                              type="text" 
                              value={row.sign} 
                              onChange={e => {
                                const updated = [...gridRows];
                                updated[index].sign = e.target.value;
                                setGridRows(updated);
                              }} 
                              className="w-full bg-transparent text-center font-bold text-blue-800 py-0.5 border-none focus:outline-none print:hidden text-[9px]" 
                            />
                            <div className={`hidden print:block text-center font-serif font-bold text-slate-900 py-0.5 break-words whitespace-normal px-0.5 ${getDynamicFontSizeClass(row.sign, 'text-[8px]')}`}>
                              {row.sign}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footnotes */}
                <div className="space-y-2.5 font-serif text-[10px] text-slate-800 leading-relaxed border-t border-slate-200 pt-3">
                  <p>
                    <strong>1. प्रमाणित किया जाता है छात्र/छात्रा के ब्यौरे से सम्बन्धित प्रविष्टियों का मिलान प्रवेश प्रार्थना-पत्र से कर लिया गया है और वे पूर्णतया शुद्ध है।</strong><br />
                    <span className="text-slate-500 italic">Certified that the entries as regards details of the student have been duly checked from the Admission form and that they are complete.</span>
                  </p>
                  <p>
                    <strong>2. प्रमाणित किया जाता है कि उपरोक्त छात्र/छात्रा पंजिका तथा स्थानान्तरण प्रमाण-पत्र की छात्र/छात्रा के पृथक होने के दिनांक तक शिक्षा विभाग के नियमानुसार पूर्ति कर दी गई है।</strong><br />
                    <span className="text-slate-500 italic">Certified that the above student Register has been posted up-to-date of the student's leaving as required by the department Rules.</span>
                  </p>
                </div>

                {/* Signatures Footer */}
                <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-700 font-serif border-t border-slate-200/50 pt-2">
                  <div className="flex items-center gap-1">
                    <span>दिनांक / Dated:</span>
                    <input 
                      type="text" 
                      value={datedValue} 
                      onChange={e => setDatedValue(e.target.value)} 
                      className="w-24 bg-transparent text-center font-bold text-blue-800 border-b border-dashed border-slate-400 focus:outline-none print:hidden text-xs" 
                    />
                    <span className="hidden print:inline-block font-bold text-slate-950 border-b border-dashed border-slate-400 min-w-[60px] text-center">
                      {datedValue || '__________'}
                    </span>
                  </div>
                </div>

                {renderSignatureSection()}

                {/* Bottom Note */}
                <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] italic text-slate-600 font-serif leading-tight">
                  <p>
                    <strong>टिप्पणी-</strong> यदि कक्षा में छात्र/छात्रा का स्तर प्रथम पांच में हो तो इसका उल्लेख 'कार्य' के स्तम्भ में करना चाहिए।<br />
                    <strong>Note -</strong> If student has been among first five, this fact should be mentioned in the column of "Work".
                  </p>
                </div>
              </div>
            ) : (
              /* ========================================================
                 CLASSIC TRANSFER & CHARACTER CERTIFICATE TEMPLATE
                 ======================================================== */
              <div 
                id="printable-area" 
                className="print-container bg-white border-[10px] border-double p-8 max-w-2xl mx-auto text-slate-800 shadow-lg relative min-h-[500px] flex flex-col justify-between"
                style={{ borderColor: brandColor }}
              >
                {/* Border ornaments */}
                <div className="absolute top-2 left-2 right-2 bottom-2 border border-slate-300 pointer-events-none"></div>

                {/* Header */}
                <div className="text-center font-serif py-2 border-b border-slate-200 relative flex flex-col items-center gap-1">
                  {currentSchool?.logo && (
                    <img src={currentSchool.logo} alt="Logo" className="w-16 h-16 object-contain" />
                  )}
                  <h1 className="text-2xl font-black font-serif leading-tight mt-1" style={{ color: brandColor }}>{currentSchool?.name || 'SCHOOL NAME'}</h1>
                  <p className="text-[10px] italic text-slate-500 font-medium">{currentSchool?.address || 'Location District, State, India'}</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-0.5 font-mono">Mobile: {currentSchool?.mobile || 'N/A'} {currentSchool?.udiseCode && `| UDISE: ${currentSchool.udiseCode}`}</p>
                </div>

                {/* Title & Metadata */}
                <div className="my-4 flex justify-between items-center text-[10px] font-serif font-bold text-slate-500">
                  <span>SERIAL NO: <span className="font-mono text-slate-800 font-extrabold">{serialNo}</span></span>
                  <span className="text-sm border-2 border-slate-800 px-4 py-1 uppercase tracking-wider text-slate-900 font-sans font-black">
                    {certType === 'TC' ? 'Transfer Certificate' : 'Character Certificate'}
                  </span>
                  <span>DATE: <span className="font-mono text-slate-800 font-extrabold">{new Date(issueDate).toLocaleDateString()}</span></span>
                </div>

                {/* Formal content body statement */}
                <div className="my-6 space-y-4 font-serif text-slate-800 text-xs leading-relaxed text-justify px-2 flex-1">
                  {certType === 'TC' ? (
                    <p>
                      This is to formally certify that <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900 text-sm">{studentName}</span>
                      {studentNameHindi && <span> (हिंदी मे : <span className="font-bold border-b border-dotted border-slate-500 px-1">{studentNameHindi}</span>)</span>}, 
                      child of Father <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{fatherName || 'N/A'}</span> and 
                      Mother <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{motherName || 'N/A'}</span>, 
                      residing at <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{studentAddress || 'N/A'}</span>,
                      was an authentic admitted student of this college with Scholar Register SR Number <span className="font-bold border-b border-dotted border-slate-500 px-2 font-mono text-indigo-900">{srNo || 'N/A'}</span>.
                      He/She was admitted to class <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{admissionClass || '______'}</span> 
                      {admissionDate ? <span> on <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{new Date(admissionDate).toLocaleDateString()}</span></span> : <span> on <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">______</span></span>}. 
                      Currently leaving from class <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{leavingClass || '______'}</span> with class roll number <span className="font-bold border-b border-dotted border-slate-500 px-2 font-mono">{rollNo || '______'}</span>.
                      The date of birth recorded in the institution registry, compliant with Aadhaar documentation is <span className="font-bold border-b border-dotted border-slate-500 px-2 font-mono text-indigo-900">{dob || 'N/A'}</span>.
                    </p>
                  ) : (
                    <p>
                      Certified that <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900 text-sm">{studentName}</span>, 
                      child of Father <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{fatherName || 'N/A'}</span> and 
                      Mother <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{motherName || 'N/A'}</span>, 
                      residing at <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{studentAddress || 'N/A'}</span>,
                      was an authentic student of this institution with SR Number <span className="font-bold border-b border-dotted border-slate-500 px-2 font-mono">{srNo || 'N/A'}</span> under roll number <span className="font-bold border-b border-dotted border-slate-500 px-2 font-mono">{rollNo || '______'}</span>.
                      He/She successfully studied in adjoined class of <span className="font-bold border-b border-dotted border-slate-500 px-2 text-slate-900">{leavingClass || '______'}</span> during current academic tenure and session years.
                    </p>
                  )}

                  {certType === 'TC' ? (
                    <div className="space-y-4 pt-2">
                      <p>
                        He/She was terminated from the rolls on account of: <br />
                        <span className="font-bold text-slate-900 block mt-1 italic border-b border-slate-100 pb-1 font-sans">" {leavingCause} "</span>
                      </p>
                      <p>
                        We further declare that all institution fees, dues, and library balances were recorded as: <br />
                        <span className="font-bold text-emerald-700 block mt-1 italic font-sans">" {duesStatus} "</span>
                      </p>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <p>
                      During the full tenure of their academic stay, his/her moral conduct, character, and school discipline were evaluated and recorded as: <br />
                      <span className="font-bold text-indigo-850 block mt-1 italic border-b border-slate-100 pb-1 font-sans">" {conduct} "</span>
                    </p>
                    <p className="mt-4">
                      The institution wishes them extreme success and prosperity in all future career undertakings.
                    </p>
                  </div>
                </div>

                {/* Seals, signatures, stamps */}
                {renderSignatureSection()}

              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-10 border border-dashed rounded bg-slate-50 text-slate-400">
            <FileText className="w-12 h-12 mb-2 text-slate-350" />
            <p className="text-sm font-semibold">No Student Selected for Certification</p>
            <p className="text-xs">Identify and select a student from the sidebar roster database or switch to Manual Entry Mode to type everything yourself.</p>
          </div>
        )}
      </div>
    </div>
  );
}
