import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student } from '../../types';
import { Printer, Search, Download, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const convertImgToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("No URL provided"));
      return;
    }
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject(new Error("Could not get 2D context"));
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for base64 conversion"));
    };
    img.src = url;
  });
};

interface AdmissionSlipsProps {
  initialStudent?: Student | null;
  onEdit?: (student: Student) => void;
}

export function AdmissionSlips({ initialStudent = null, onEdit }: AdmissionSlipsProps) {
  const { students, schools, currentUser } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudent?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [sigBase64, setSigBase64] = useState<string | null>(null);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.srNo?.includes(searchTerm)) ||
    s.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  useEffect(() => {
    setPhotoBase64(null);
    setSigBase64(null);

    if (selectedStudent) {
      const pUrl = selectedStudent.docStudentPhoto || selectedStudent.photoUrl;
      if (pUrl) {
        if (pUrl.startsWith('data:')) {
          setPhotoBase64(pUrl);
        } else {
          convertImgToBase64(pUrl)
            .then(base64 => setPhotoBase64(base64))
            .catch(err => {
              console.warn("Could not pre-load student photo as base64:", err);
            });
        }
      }

      if (selectedStudent.docStudentSig) {
        if (selectedStudent.docStudentSig.startsWith('data:')) {
          setSigBase64(selectedStudent.docStudentSig);
        } else {
          convertImgToBase64(selectedStudent.docStudentSig)
            .then(base64 => setSigBase64(base64))
            .catch(err => {
              console.warn("Could not pre-load student signature as base64:", err);
            });
        }
      }
    }
  }, [selectedStudentId, selectedStudent]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const slipElement = document.getElementById('admission-slip-printable');
    if (!slipElement || !selectedStudent) return;
    
    try {
      // Small delay to ensure all assets/fonts are loaded if needed
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      const canvas = await html2canvas(slipElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate safe margins (5mm padding)
      const margin = 5;
      const printableWidth = pdfWidth - (margin * 2);
      const printableHeight = pdfHeight - (margin * 2);
      
      // Calculate scaling ratio to fit perfectly on A4 page
      const ratio = Math.min(printableWidth / canvas.width, printableHeight / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;
      
      // Center the slip on the A4 page
      const x = (pdfWidth - renderWidth) / 2;
      const y = (pdfHeight - renderHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
      pdf.save(`Admission_Slip_${selectedStudent.srNo || selectedStudent.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('Error generating PDF. Please ensure all assets are loaded and try again directly.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Student Selector Area (Hidden when printing thanks to print CSS) */}
      <Card className="p-4 bg-slate-50/50 no-print">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block border-b pb-1">Search & Select Student</h3>
        
        <div className="mb-4">
          <Label>Find Student</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Search by Name, SR No..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
          {filteredStudents.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic text-center py-4">No matching students found.</p>
          ) : filteredStudents.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`w-full text-left p-2 rounded text-xs transition duration-150 flex justify-between items-center ${selectedStudentId === s.id ? 'bg-indigo-600 text-white font-medium' : 'bg-white hover:bg-slate-200 border border-slate-100 text-slate-700'}`}
            >
              <div>
                <p className="font-semibold">{s.name}</p>
                <span className="text-[10px] opacity-80 block">Class: {s.grade} | SR No: {s.srNo || 'N/A'}</span>
              </div>
              <span className="text-[9px] bg-slate-100/20 text-slate-600 border border-slate-400/20 px-1 py-0.5 rounded font-mono">Select</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Slip Display Card */}
      <div className="md:col-span-2">
        {selectedStudent ? (
          <div className="space-y-4">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: A4 portrait !important;
                  margin: 10mm 12mm 10mm 12mm !important;
                }
                
                body {
                  background: white !important;
                  color: #0f172a !important;
                }

                .no-print, .no-print * {
                  display: none !important;
                }

                /* Neutralize global containers when printing */
                .no-print, .no-print * {
                  display: none !important;
                }

                body, #root, main, .space-y-6, .space-y-4, .p-6, .p-4, .card-container, div[role="tabpanel"], .md\:col-span-2, .grid {
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                  display: block !important;
                  max-width: none !important;
                  width: 100% !important;
                  gap: 0 !important;
                }

                #admission-slip-printable {
                  position: relative !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: 24px !important;
                  box-sizing: border-box !important;
                  border: 6px double #0f172a !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  background: white !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            ` }} />
            <div className="no-print flex justify-end gap-2">
              {onEdit && (
                <Button 
                  onClick={() => onEdit(selectedStudent)} 
                  className="bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 px-4 font-bold"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile (विवरण बदलें)</span>
                </Button>
              )}
              <Button onClick={handleExportPDF} className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 px-4 font-bold">
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </Button>
              <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-4 font-bold">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Slip</span>
              </Button>
            </div>

            {/* Printable Slip boundaries */}
            <div id="admission-slip-printable" className="bg-white border border-slate-300 rounded shadow-sm p-6 max-w-2xl mx-auto text-slate-800">
              <div className="text-center border-b-2 border-double border-slate-400 pb-3 mb-4 relative">
                {(() => {
                  const school = schools.find(s => s.id === currentUser?.schoolId);
                  return (
                    <>
                      {school?.logo && <img src={school.logo} alt="School Logo" className="absolute top-0 left-0 w-16 h-16 object-contain" />}
                      <h1 className="text-2xl font-black text-slate-900 tracking-wide uppercase">{school?.name || 'SCHOOL NAME'}</h1>
                      {school?.address && <p className="text-[11px] text-slate-700 font-bold mt-0.5">{school.address}</p>}
                      <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                        {school?.mobile ? `Helpline: +91-${school.mobile}` : ''}
                        {school?.altMobile ? `, +91-${school.altMobile}` : ''}
                        {school?.udiseCode && <span className="ml-2 pl-2 border-l border-slate-300 text-indigo-700">UDISE: {school.udiseCode}</span>}
                      </p>
                    </>
                  );
                })()}
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1.5">Affiliated to Board | Registration Certified</p>
                <p className="text-[11px] bg-slate-900 text-white rounded px-3 py-0.5 inline-block font-bold mt-1.5 tracking-wider uppercase">Admission Confirmation Receipt</p>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-4 gap-6 items-start">
                <div className="col-span-3 space-y-3.5 text-xs">
                  <div className="grid grid-cols-3 gap-y-2 gap-x-4 border-b pb-3 border-slate-100">
                    <p><span className="font-extrabold text-slate-500 uppercase">Admission No:</span> <span className="font-semibold text-slate-800">{selectedStudent.admissionNo || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500 uppercase">Class SR No:</span> <span className="font-mono font-semibold text-slate-900">{selectedStudent.srNo || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500 uppercase">Session:</span> <span className="font-semibold text-slate-800">{selectedStudent.academicSession || '2026-27'}</span></p>
                    <p><span className="font-extrabold text-slate-500 uppercase">Class Admitted:</span> <span className="font-bold text-slate-800">{selectedStudent.grade} {selectedStudent.section ? ` - ${selectedStudent.section}` : ''}</span></p>
                    <p><span className="font-extrabold text-slate-500 uppercase">Roll No:</span> <span className="font-semibold text-slate-700">{selectedStudent.rollNo}</span></p>
                    <p><span className="font-extrabold text-slate-500 uppercase">Medium:</span> <span className="font-semibold text-emerald-700">{selectedStudent.medium || 'Hindi'}</span></p>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-b pb-3 border-slate-100">
                    <p className="col-span-2"><span className="font-extrabold text-slate-500">Student Name:</span> <span className="font-bold text-slate-900 text-sm">{selectedStudent.name}</span> {selectedStudent.studentNameHindi && <span className="ml-2 font-semibold text-slate-850 font-sans">({selectedStudent.studentNameHindi})</span>}</p>
                    <p><span className="font-extrabold text-slate-500">Father's Name:</span> <span className="font-bold text-slate-800">{selectedStudent.fatherName || 'N/A'}</span> {selectedStudent.fatherNameHindi && <span className="ml-1 font-semibold text-slate-850 font-sans">({selectedStudent.fatherNameHindi})</span>}</p>
                    <p><span className="font-extrabold text-slate-500">Mother's Name:</span> <span className="font-bold text-slate-800">{selectedStudent.motherName || 'N/A'}</span> {selectedStudent.motherNameHindi && <span className="ml-1 font-semibold text-slate-850 font-sans">({selectedStudent.motherNameHindi})</span>}</p>
                    <p><span className="font-extrabold text-slate-500">Date of Birth:</span> <span className="font-semibold text-slate-800">{selectedStudent.dob || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Gender:</span> <span className="font-semibold text-slate-800">{selectedStudent.gender || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Mobile No:</span> <span className="font-semibold text-slate-800">{selectedStudent.mobile || selectedStudent.fatherMobile || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Aadhar No:</span> <span className="font-semibold text-slate-800">{selectedStudent.aadhar || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Religion/Caste:</span> <span className="font-semibold text-slate-800">{selectedStudent.religion || 'N/A'} / {selectedStudent.caste || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Category:</span> <span className="font-semibold text-slate-800">{selectedStudent.category || 'N/A'}</span></p>
                    <p className="col-span-2 mt-1 pt-1 border-t border-slate-50"><span className="font-extrabold text-slate-400 text-[9px] uppercase tracking-wider">Additional Parent Details</span></p>
                    <p><span className="font-extrabold text-slate-500">Father's Occup.:</span> <span className="font-semibold text-slate-800">{selectedStudent.fatherOccupation || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Father's Qual.:</span> <span className="font-semibold text-slate-800">{selectedStudent.fatherQualification || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Father's Aadhar:</span> <span className="font-semibold text-slate-800">{selectedStudent.fatherAadhar || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Mother's Occup.:</span> <span className="font-semibold text-slate-800">{selectedStudent.motherOccupation || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Mother's Qual.:</span> <span className="font-semibold text-slate-800">{selectedStudent.motherQualification || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Mother's Aadhar:</span> <span className="font-semibold text-slate-800">{selectedStudent.motherAadhar || 'N/A'}</span></p>
                    <p><span className="font-extrabold text-slate-500">Annual Income:</span> <span className="font-semibold text-slate-800">{selectedStudent.fatherAnnualIncome ? `₹${selectedStudent.fatherAnnualIncome}` : 'N/A'}</span></p>
                  </div>

                  <div className="space-y-1 text-slate-600 block">
                    <p><span className="font-extrabold text-slate-500 uppercase">Residence Address:</span></p>
                    <p className="italic leading-relaxed">
                      {selectedStudent.presentVillageMohalla || selectedStudent.address || 'N/A'}, 
                      P.O: {selectedStudent.presentPostOffice || 'N/A'}, 
                      P.S: {selectedStudent.presentPoliceStation || 'N/A'}, 
                      Tehsil: {selectedStudent.presentTehsil || 'N/A'}, 
                      Dist: {selectedStudent.presentDistrict || 'N/A'}, 
                      {selectedStudent.presentState || 'UP'} - {selectedStudent.presentPinCode || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex flex-col items-center justify-start space-y-4 pt-1 border-l pl-4 border-slate-100">
                  {photoBase64 ? (
                    <img src={photoBase64} alt="Student" className="w-[100px] h-[130px] object-cover border-2 border-slate-400 rounded-sm shadow-sm" referrerPolicy="no-referrer" />
                  ) : (selectedStudent.docStudentPhoto || selectedStudent.photoUrl) ? (
                    /* Render screen image but hide from html2canvas to avoid taint crash */
                    <div className="relative w-[100px] h-[130px] border-2 border-slate-400 rounded-sm shadow-sm overflow-hidden bg-slate-50">
                      <div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-500 text-center p-1 leading-snug bg-slate-100 font-bold select-none no-print">
                        PHOTO SECURELY READY
                      </div>
                      <img 
                        src={selectedStudent.docStudentPhoto || selectedStudent.photoUrl} 
                        alt="Student" 
                        className="absolute inset-0 w-full h-full object-cover"
                        data-html2canvas-ignore="true"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-[100px] h-[130px] bg-slate-100 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-[10px] text-center">Passport Photo Placeholder</div>
                  )}

                  {sigBase64 ? (
                    <div className="w-[100px] text-center border-t border-slate-300 mt-2">
                      <img src={sigBase64} alt="Sig" className="h-6 max-w-full mx-auto object-contain mt-1" referrerPolicy="no-referrer" />
                      <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-widest mt-0.5">Verified Signature</span>
                    </div>
                  ) : selectedStudent.docStudentSig ? (
                    <div className="w-[100px] text-center border-t border-slate-300 mt-2">
                      <div className="relative h-6 mt-1 flex items-center justify-center bg-slate-50 rounded">
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider select-none font-bold no-print">VERIFIED</span>
                        <img 
                          src={selectedStudent.docStudentSig} 
                          alt="Sig" 
                          className="absolute inset-0 h-full w-full object-contain mx-auto"
                          data-html2canvas-ignore="true"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-widest mt-0.5">Verified Signature</span>
                    </div>
                  ) : (
                    <div className="w-[100px] h-[24px] mt-2 flex items-end justify-center border-b border-dashed border-slate-300 text-[8px] text-slate-400 pb-0.5">
                      Student Signature
                    </div>
                  )}
                </div>
              </div>

              {/* Previous Education History */}
              {selectedStudent.previousSchoolName && (
                <div className="mt-4 p-2 bg-slate-50 border rounded text-[11px] grid grid-cols-2 gap-2">
                  <p className="col-span-2 font-black text-indigo-800 uppercase tracking-wider text-[9px] mb-1">Previous Education Details:</p>
                  <p><span className="font-bold text-slate-500">School Name:</span> {selectedStudent.previousSchoolName}</p>
                  <p><span className="font-bold text-slate-500">Board/University:</span> {selectedStudent.previousBoard}</p>
                  <p><span className="font-bold text-slate-500">Passed Class:</span> {selectedStudent.lastPassedClass}</p>
                  <p><span className="font-bold text-slate-500">Passing Year:</span> {selectedStudent.passingYear}</p>
                  {selectedStudent.tcNo && <p><span className="font-bold text-slate-500">TC Number:</span> {selectedStudent.tcNo}</p>}
                  {selectedStudent.abcId && <p><span className="font-bold text-slate-500">ABC ID:</span> {selectedStudent.abcId}</p>}
                  {selectedStudent.penNo && <p><span className="font-bold text-slate-500">PEN Number:</span> {selectedStudent.penNo}</p>}
                </div>
              )}

              {/* Chosen subjects checklist - Only for Class 9 to 12 */}
              {['Class 9', 'Class 10', 'Class 11', 'Class 12'].includes(selectedStudent.grade) && (
                <div className="mt-4 p-2 bg-slate-50 border rounded text-[11px] grid grid-cols-2 items-center">
                  <p className="font-black text-indigo-800 uppercase tracking-wider text-[9px]">Registered Stream / Subjects:</p>
                  <p className="font-bold text-slate-800 justify-self-end text-right">
                     {selectedStudent.stream && selectedStudent.stream !== 'None' ? selectedStudent.stream : 'General Stream / Subjects'} 
                     {selectedStudent.optionalSubject ? ` | Opt: ${selectedStudent.optionalSubject}` : ''}
                  </p>
                </div>
              )}

              {/* Portal access coordinates */}
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-[11px]">
                <div className="p-2 border border-blue-100 bg-blue-50/50 rounded">
                  <p className="font-bold text-blue-700 mb-1 leading-none uppercase text-[9px]">Online ERP Student Account Portal</p>
                  <p>Login URL: <span className="font-mono text-slate-500">https://shankaldeep4.github.io/yug/</span></p>
                  <p>Username: <span className="font-mono font-bold text-slate-800">{selectedStudent.username || `stud_${selectedStudent.srNo}`}</span></p>
                  <p>Password: <span className="font-mono font-bold text-slate-800">{selectedStudent.password || 'password123'}</span></p>
                </div>
                <div className="p-2 border border-slate-200 bg-slate-50/50 rounded">
                  <p className="font-bold text-slate-600 mb-1 leading-none uppercase text-[9px]">System Tracking Identifiers</p>
                  <p>RFID Attend ID: <span className="font-mono text-slate-700">{selectedStudent.attendanceId || 'N/A'}</span></p>
                  <p>Library Access ID: <span className="font-mono text-slate-700">{selectedStudent.libraryId || 'N/A'}</span></p>
                  <p>Transport Route: <span className="font-mono text-slate-700">{selectedStudent.busFacility ? `${selectedStudent.busRoute}` : 'Van not opted'}</span></p>
                </div>
              </div>

              {/* Seals & Signatures */}
              <div className="mt-8 flex justify-between pt-10 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <div className="text-center">
                  <div className="w-24 border-b border-slate-300 mx-auto mb-1"></div>
                  <span>Prepared by Clerk</span>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-slate-300 mx-auto mb-1 mt-[10px]"></div>
                  <span>Parent's Signature</span>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-slate-300 mx-auto mb-1"></div>
                  <span>Principal Approval</span>
                </div>
              </div>

              <p className="mt-6 border-t border-slate-200 pt-2 text-center text-[8px] text-slate-400">
                * This slip acts as a computer generated certificate of provisional admission to the affiliated School / College.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-10 border border-dashed rounded bg-slate-50 text-slate-400">
            <Printer className="w-12 h-12 mb-2 text-slate-350" />
            <p className="text-sm font-semibold">No Student Selected</p>
            <p className="text-xs">Search and select a student on the left panel to configure and view their Admission Confirmation Slip.</p>
          </div>
        )}
      </div>
    </div>
  );
}
