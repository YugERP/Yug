import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student, type FeeRecord } from '../../types';
import { Printer, IndianRupee, Search, PlusCircle, Trash, Sparkles, Users, X, Percent } from 'lucide-react';

export function FeeManagement() {
  const { students, feeRecords, addFeePayment, deleteFeePayment, getStudentBalance, updateStudent, setClassFee, setClassFeesBatch, classFees, schools, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Payment states
  const [amount, setAmount] = useState('');
  const [mName, setMName] = useState('April');
  const [remarks, setRemarks] = useState('');
  const [latestReceipt, setLatestReceipt] = useState<{record: FeeRecord, student: Student} | null>(null);
  const [feeCategory, setFeeCategory] = useState<'Monthly' | 'HalfYearly' | 'Yearly'>('Monthly');
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('portrait');
  const [manualReceiptNo, setManualReceiptNo] = useState('');

  const currentSchool = schools.find(s => s.id === currentUser?.schoolId);

  // Automatically sync manualReceiptNo with currentSchool's nextReceiptNo
  useEffect(() => {
    if (currentSchool) {
      setManualReceiptNo(String(currentSchool.nextReceiptNo || 1001));
    }
  }, [currentSchool?.nextReceiptNo]);

  // Class config states
  const [selClass, setSelClass] = useState('Class 9');
  const [classFeeAmount, setClassFeeAmount] = useState('');
  const [halfYearlyExamFee, setHalfYearlyExamFee] = useState('');
  const [yearlyExamFee, setYearlyExamFee] = useState('');

  // Manual dues editor state
  const [editingDuesStudent, setEditingDuesStudent] = useState<Student | null>(null);
  const [arrearsInput, setArrearsInput] = useState('');

  // Sibling / Combined states
  const [activeTab, setActiveTab] = useState<'individual' | 'combined'>('individual');
  const [familyRegMode, setFamilyRegMode] = useState(false);
  const [familyFatherName, setFamilyFatherName] = useState('');
  const [familyContact, setFamilyContact] = useState('');
  const [selectedSiblings, setSelectedSiblings] = useState<Student[]>([]);
  const [siblingSearchTerm, setSiblingSearchTerm] = useState('');
  const [combinedAmount, setCombinedAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState<'sequential' | 'equal' | 'manual'>('sequential');
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});
  const [siblingConcessions, setSiblingConcessions] = useState<Record<string, string>>({});
  const [combinedMonth, setCombinedMonth] = useState('April');
  const [combinedRemarks, setCombinedRemarks] = useState('');
  const [latestCombinedReceipt, setLatestCombinedReceipt] = useState<{
    records: {
      record: FeeRecord;
      student: Student;
      allocatedAmount: number;
      oldBalance: number;
      newBalance: number;
      concession: number;
    }[];
    totalAmount: number;
    mName: string;
    remarks: string;
  } | null>(null);

  // Individual concession state
  const [editingConcessionStudent, setEditingConcessionStudent] = useState<Student | null>(null);
  const [concessionInput, setConcessionInput] = useState('');

  const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
  const classes = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  // Load existing details when class is selected
  useEffect(() => {
    setClassFeeAmount(String(classFees[selClass] || ''));
    setHalfYearlyExamFee(String(classFees[`${selClass}_HalfYearly`] || ''));
    setYearlyExamFee(String(classFees[`${selClass}_Yearly`] || ''));
  }, [selClass, classFees]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.srNo?.includes(searchTerm)) ||
    s.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedStudentBal = selectedStudent ? getStudentBalance(selectedStudent.id) : null;

  // Auto pre-fill based on selected fee type
  useEffect(() => {
    if (selectedStudent) {
      if (feeCategory === 'HalfYearly') {
        const fee = classFees[`${selectedStudent.grade}_HalfYearly`] || 0;
        setMName('Half-Yearly Exam');
        setAmount(String(fee));
        setRemarks('Half-Yearly Examination Fee (अर्धवार्षिक परीक्षा शुल्क)');
      } else if (feeCategory === 'Yearly') {
        const fee = classFees[`${selectedStudent.grade}_Yearly`] || 0;
        setMName('Yearly Exam');
        setAmount(String(fee));
        setRemarks('Yearly Examination Fee (वार्षिक परीक्षा शुल्क)');
      } else {
        setMName('April');
        setAmount('');
        setRemarks('');
      }
    }
  }, [feeCategory, selectedStudentId]);

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !amount || Number(amount) <= 0) return;

    const finalNo = manualReceiptNo.trim() || String(currentSchool?.nextReceiptNo || 1001);
    const record = addFeePayment(selectedStudent.id, Number(amount), mName, remarks, finalNo);
    setLatestReceipt({ record, student: selectedStudent });
    setAmount('');
    setRemarks('');
    
    // Eagerly set next sequence number locally to guarantee consistency
    const nextNoNum = parseInt(finalNo, 10);
    if (!isNaN(nextNoNum)) {
      setManualReceiptNo(String(nextNoNum + 1));
    }
    
    // Reset category
    setFeeCategory('Monthly');
  };

  const handleSetClassFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selClass) return;
    setClassFeesBatch(selClass, Number(classFeeAmount || 0), Number(halfYearlyExamFee || 0), Number(yearlyExamFee || 0));
    alert(`Structural fees for ${selClass} updated successfully:\n• Yearly Tuition: ₹${Number(classFeeAmount || 0).toLocaleString()}\n• Half-Yearly Exam: ₹${Number(halfYearlyExamFee || 0).toLocaleString()}\n• Yearly Exam: ₹${Number(yearlyExamFee || 0).toLocaleString()}`);
  };

  const handleArrearsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDuesStudent || !arrearsInput) return;
    updateStudent(editingDuesStudent.id, { previousDues: Number(arrearsInput) });
    setEditingDuesStudent(null);
    setArrearsInput('');
    alert('Student outstanding arrears/dues has been updated successfully!');
  };

  // Sibling student search
  const siblingFilteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(siblingSearchTerm.toLowerCase()) ||
    (s.srNo?.includes(siblingSearchTerm)) ||
    s.grade.toLowerCase().includes(siblingSearchTerm.toLowerCase()) ||
    s.fatherName?.toLowerCase().includes(siblingSearchTerm.toLowerCase()) ||
    s.contactNo?.includes(siblingSearchTerm)
  );

  // Calculate dynamic allocations for preview
  const currentAllocations = (() => {
    const amt = Number(combinedAmount || 0);
    if (selectedSiblings.length === 0 || amt <= 0) return {};
    const allocations: Record<string, number> = {};

    if (splitMethod === 'equal') {
      const share = Math.floor(amt / selectedSiblings.length);
      let rem = amt - (share * selectedSiblings.length);
      selectedSiblings.forEach((s, idx) => {
        allocations[s.id] = share + (idx === 0 ? rem : 0);
      });
    } else if (splitMethod === 'sequential') {
      let remaining = amt;
      selectedSiblings.forEach(s => {
        const bal = getStudentBalance(s.id).balance;
        const pay = Math.min(remaining, bal);
        allocations[s.id] = pay;
        remaining -= pay;
      });
      // If there is leftover, put on first sibling
      if (remaining > 0 && selectedSiblings.length > 0) {
        allocations[selectedSiblings[0].id] = (allocations[selectedSiblings[0].id] || 0) + remaining;
      }
    } else {
      // manual - from user input
      selectedSiblings.forEach(s => {
        allocations[s.id] = Number(manualAllocations[s.id] || 0);
      });
    }
    return allocations;
  })();

  const handleConcessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConcessionStudent) return;
    updateStudent(editingConcessionStudent.id, { discountScholarship: Number(concessionInput) });
    setEditingConcessionStudent(null);
    setConcessionInput('');
    alert('Student discount scholarship concession updated successfully!');
  };

  const handleCombinedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSiblings.length === 0) {
      alert("कृपया कम से कम एक छात्र को चुनें। (Please select at least one student.)");
      return;
    }
    const totalAmt = Number(combinedAmount || 0);
    if (totalAmt <= 0) {
      alert("कृपया भुगतान राशि दर्ज करें। (Please enter payment amount.)");
      return;
    }

    const allocationValues = splitMethod === 'manual' 
      ? Object.fromEntries(selectedSiblings.map(s => [s.id, Number(manualAllocations[s.id] || 0)]))
      : currentAllocations;

    if (splitMethod === 'manual') {
      const sum = Object.values(allocationValues).reduce((acc, val) => acc + val, 0);
      if (sum !== totalAmt) {
        alert(`मैनुअल विभाजन राशि का योग (${sum}) कुल भुगतान राशि (${totalAmt}) के बराबर होना चाहिए।`);
        return;
      }
    }

    try {
      const recordsCreated: any[] = [];
      
      // 1. Update concessions
      for (const sibling of selectedSiblings) {
        const customConc = siblingConcessions[sibling.id] !== undefined 
          ? Number(siblingConcessions[sibling.id]) 
          : (sibling.discountScholarship || 0);
        
        await updateStudent(sibling.id, { discountScholarship: customConc });
      }

      // 2. Apply payments
      let currentNextNo = currentSchool?.nextReceiptNo || 1001;
      for (const sibling of selectedSiblings) {
        const payAmount = allocationValues[sibling.id] || 0;
        const oldBalObj = getStudentBalance(sibling.id);
        const oldBalance = oldBalObj.balance;
        const customConc = siblingConcessions[sibling.id] !== undefined 
          ? Number(siblingConcessions[sibling.id]) 
          : (sibling.discountScholarship || 0);
        
        if (payAmount > 0) {
          const rec = addFeePayment(
            sibling.id, 
            payAmount, 
            combinedMonth, 
            combinedRemarks ? `${combinedRemarks} (Sibling Joint Payment)` : `Family Joint Payment Split`,
            String(currentNextNo)
          );
          currentNextNo += 1;
          
          recordsCreated.push({
            record: rec,
            student: sibling,
            allocatedAmount: payAmount,
            oldBalance: oldBalance,
            newBalance: Math.max(0, oldBalance - payAmount),
            concession: customConc
          });
        }
      }

      setLatestCombinedReceipt({
        records: recordsCreated,
        totalAmount: totalAmt,
        mName: combinedMonth,
        remarks: combinedRemarks || 'Family Joint Payment Split'
      });

      setCombinedAmount('');
      setCombinedRemarks('');
      // setSelectedSiblings([]); // Siblings kept to avoid repetitive selection
      setManualAllocations({}); // Clear manual allocations for new payment
      // setSiblingConcessions({}); // Concessions are typically stable per sibling
      alert("संयुक्त भुगतान सफलतापूर्वक दर्ज किया गया! (Combined payment recorded successfully!)");
    } catch (error) {
      console.error(error);
      alert("भुगतान सहेजने में त्रुटि हुई।");
    }
  };

  const handleRegisterFamily = async () => {
    if (selectedSiblings.length < 1) {
      alert("Please select at least one student to create a family group.");
      return;
    }
    if (!familyFatherName.trim() || !familyContact.trim()) {
      alert("Please provide both Father Name and Mobile Number to register the family.");
      return;
    }

    try {
      for (const sibling of selectedSiblings) {
        await updateStudent(sibling.id, { 
          fatherName: familyFatherName, 
          contactNo: familyContact 
        });
      }
      alert("Family Group Registered Successfully! These students are now permanently linked.");
      setFamilyRegMode(false);
      setFamilyFatherName('');
      setFamilyContact('');
    } catch (err) {
      console.error(err);
      alert("Failed to register family.");
    }
  };

  const triggerWindowPrint = () => {
    window.print();
  };

  const totalCollectedFees = feeRecords.reduce((acc, f) => acc + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Receipts Printing Panel */}
      {latestCombinedReceipt && (
        <div className="p-4 bg-emerald-55 border border-emerald-200 bg-emerald-50 rounded-lg print:p-0 print:border-none print:bg-transparent">
          <div className="flex justify-between items-center mb-4 no-print">
            <h3 className="text-emerald-850 font-extrabold text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> Sibling Combined Transaction Approved</h3>
            <div className="flex items-center gap-2">
              <select
                value={printLayout}
                onChange={(e) => setPrintLayout(e.target.value as any)}
                className="text-xs border-emerald-200 rounded px-2 py-1 mr-2 bg-white text-emerald-800 hidden md:block"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
              <Button onClick={triggerWindowPrint} className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5 font-bold">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Combined Receipt</span>
              </Button>
              <Button onClick={() => setLatestCombinedReceipt(null)} className="bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold">Close Receipt</Button>
            </div>
          </div>
          
          <style>{`
            @media print {
              @page { size: A4 ${printLayout}; margin: 0; }
              body {
                visibility: hidden !important;
                background: white !important;
              }
              #printable-area-combined, #printable-area-combined * {
                visibility: visible !important;
              }
              #printable-area-combined {
                position: fixed !important;
                left: 50% !important;
                top: 0 !important;
                transform: translateX(-50%) !important;
                width: 120mm !important;
                max-width: 120mm !important;
                margin: 0 !important;
                padding: 16px !important;
                box-sizing: border-box !important;
                border: 2px dashed #000000 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: white !important;
                z-index: 9999999 !important;
              }
            }
          `}</style>

          <div id="printable-area-combined" className="print-container bg-white border border-slate-300 mx-auto rounded p-4 max-w-[120mm] text-slate-800">
            <div className="text-center border-b border-dashed border-slate-350 pb-2 mb-3">
              {(() => {
                const school = schools.find(s => s.id === (currentUser?.schoolId));
                return (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      {school?.logo && <img src={school.logo} alt="School Logo" className="w-10 h-10 object-contain" />}
                      <h1 className="text-sm font-black text-slate-900 tracking-wider uppercase">{school?.name || 'SCHOOL NAME'}</h1>
                    </div>
                    {school?.address && <p className="text-[8px] text-slate-700 font-bold leading-tight mt-0.5">{school.address}</p>}
                    <p className="text-[7px] text-slate-600 font-semibold mt-0.5">
                      {school?.mobile ? `Mob: +91-${school.mobile}` : ''}
                      {school?.altMobile ? `, +91-${school.altMobile}` : ''}
                      {school?.udiseCode && <span className="ml-1 pl-1 border-l border-slate-300">UDISE: {school.udiseCode}</span>}
                    </p>
                  </>
                );
              })()}
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold mt-1">SIBLING FEE RECEIPT (संयुक्त भाई-बहन रसीद)</p>
            </div>
            
            <div className="text-[10px] space-y-1 mb-3 flex justify-between">
              <div>
                <p><span className="font-bold text-slate-400 uppercase text-[8px]">Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-bold text-slate-400 uppercase text-[8px]">Remarks:</span> {latestCombinedReceipt.remarks}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold text-slate-400 uppercase text-[8px]">Month Block:</span> {latestCombinedReceipt.mName}</p>
              </div>
            </div>

            {/* Sibling split details table */}
            <table className="w-full text-left text-[9px] border-collapse mb-3 border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-1.5">Student Name</th>
                  <th className="p-1.5">Class/Roll</th>
                  <th className="p-1.5 text-right">Old Balance</th>
                  <th className="p-1.5 text-right">Concession</th>
                  <th className="p-1.5 text-right">Paid Amt</th>
                  <th className="p-1.5 text-right">New Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestCombinedReceipt.records.map((rec, index) => (
                  <tr key={index}>
                    <td className="p-1.5 font-bold text-slate-800">{rec.student.name}</td>
                    <td className="p-1.5">{rec.student.grade} / {rec.student.rollNo}</td>
                    <td className="p-1.5 text-right font-mono">₹{rec.oldBalance.toLocaleString()}</td>
                    <td className="p-1.5 text-right font-mono text-indigo-600">₹{rec.concession.toLocaleString()}</td>
                    <td className="p-1.5 text-right font-mono text-emerald-600 font-bold">₹{rec.allocatedAmount.toLocaleString()}</td>
                    <td className="p-1.5 text-right font-mono text-rose-600 font-bold">₹{rec.newBalance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center bg-slate-50 p-2 rounded mb-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600">Total Combined Payment Received:</span>
              <span className="font-mono text-xs font-black text-slate-900">₹{latestCombinedReceipt.totalAmount.toLocaleString()}</span>
            </div>

            <p className="text-center text-[7px] text-slate-400 mt-4 italic">* Digital combined sibling receipt copy of the school database. Thank you.</p>
          </div>
        </div>
      )}

      {/* Receipts Printing Panel */}
      {latestReceipt && (
        <div className="p-4 bg-emerald-55 border border-emerald-200 bg-emerald-50 rounded-lg print:p-0 print:border-none print:bg-transparent">
          <div className="flex justify-between items-center mb-4 no-print">
            <h3 className="text-emerald-800 font-extrabold text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> Transaction Approved Successfully</h3>
            <div className="flex items-center gap-2">
              <select
                value={printLayout}
                onChange={(e) => setPrintLayout(e.target.value as any)}
                className="text-xs border-emerald-200 rounded px-2 py-1 mr-2 bg-white text-emerald-800 hidden md:block"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
              <Button onClick={triggerWindowPrint} className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5 font-bold">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt Slip</span>
              </Button>
              <Button onClick={() => setLatestReceipt(null)} className="bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold">Close Receipt</Button>
            </div>
          </div>
          
          <style>{`
            @media print {
              @page { size: A4 ${printLayout}; margin: 0; }
              body {
                visibility: hidden !important;
                background: white !important;
              }
              #printable-area-individual, #printable-area-individual * {
                visibility: visible !important;
              }
              #printable-area-individual {
                position: fixed !important;
                left: 50% !important;
                top: 0 !important;
                transform: translateX(-50%) !important;
                width: 90mm !important;
                max-width: 90mm !important;
                margin: 0 !important;
                padding: 16px !important;
                box-sizing: border-box !important;
                border: 2px dashed #000000 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: white !important;
                z-index: 9999999 !important;
              }
            }
          `}</style>

          <div id="printable-area-individual" className="print-container bg-white border border-slate-300 mx-auto rounded p-4 max-w-[90mm] text-slate-800">
            <div className="text-center border-b border-dashed border-slate-350 pb-2 mb-3">
              {(() => {
                const school = schools.find(s => s.id === (currentUser?.schoolId));
                return (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      {school?.logo && <img src={school.logo} alt="School Logo" className="w-10 h-10 object-contain" />}
                      <h1 className="text-sm font-black text-slate-900 tracking-wider uppercase">{school?.name || 'SCHOOL NAME'}</h1>
                    </div>
                    {school?.address && <p className="text-[8px] text-slate-700 font-bold leading-tight mt-0.5">{school.address}</p>}
                    <p className="text-[7px] text-slate-600 font-semibold mt-0.5">
                      {school?.mobile ? `Mob: +91-${school.mobile}` : ''}
                      {school?.altMobile ? `, +91-${school.altMobile}` : ''}
                      {school?.udiseCode && <span className="ml-1 pl-1 border-l border-slate-300">UDISE: {school.udiseCode}</span>}
                    </p>
                  </>
                );
              })()}
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold mt-1">FEE RECEIPT VOUCHER</p>
            </div>
            <div className="text-[10px] space-y-1 mb-3 flex justify-between">
              <div>
                <p><span className="font-bold text-slate-400 uppercase text-[8px]">Receipt No:</span> {latestReceipt.record.receiptNo || latestReceipt.record.id}</p>
                <p><span className="font-bold text-slate-400 uppercase text-[8px]">Date:</span> {new Date(latestReceipt.record.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold text-slate-400 uppercase text-[8px]">Month Block:</span> {mName}</p>
              </div>
            </div>
            <div className="text-[10px] space-y-1.5 border-b border-dotted pb-3 mb-3 text-slate-700">
              <p><span className="font-bold text-slate-400 inline-block w-20">Student Name:</span> {latestReceipt.student.name}</p>
              <p><span className="font-bold text-slate-400 inline-block w-20 font-sans">पिता का नाम:</span> {latestReceipt.student.fatherName || 'N/A'}</p>
              <p><span className="font-bold text-slate-400 inline-block w-20">Class/Roll:</span> {latestReceipt.student.grade} / {latestReceipt.student.rollNo}</p>
              <p><span className="font-bold text-slate-400 inline-block w-20">SR Number:</span> {latestReceipt.student.srNo || 'N/A'}</p>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2 rounded mb-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600">Net Amount Received:</span>
              <span className="font-mono text-xs font-black text-slate-900">₹{latestReceipt.record.amount.toLocaleString()}</span>
            </div>

            {/* Calculations after posting payment */}
            <div className="bg-slate-50 p-2 rounded text-[8px] space-y-1 text-slate-500">
              <div className="flex justify-between"><span>Base Class yearly tuition charge:</span> <span>₹{getStudentBalance(latestReceipt.student.id).current.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Carry-over arrears dues:</span> <span>₹{getStudentBalance(latestReceipt.student.id).previous.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-slate-750"><span>Total Cumulative paid:</span> <span>₹{getStudentBalance(latestReceipt.student.id).paid.toLocaleString()}</span></div>
              <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-dashed border-slate-300"><span>NET REMAINING BALANCE:</span> <span>₹{getStudentBalance(latestReceipt.student.id).balance.toLocaleString()}</span></div>
            </div>

            <p className="text-center text-[7px] text-slate-400 mt-4 italic">* Digital receipt copy of the affiliated school / college database. Thank you.</p>
          </div>
        </div>
      )}

      {/* Grid layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Class Fees Config */}
        <Card className="p-4 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block border-b pb-1 flex items-center gap-1.5"><IndianRupee className="w-4 h-4 text-indigo-600"/> Class structural fees</h3>
          <form onSubmit={handleSetClassFeeSubmit} className="space-y-2.5">
            <div>
              <Label>Target Class (लक्षित कक्षा)</Label>
              <Input as="select" value={selClass} onChange={e => setSelClass(e.target.value)}>
                {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
              </Input>
            </div>
            <div>
              <Label>Yearly Tuition Fee Amount (₹)</Label>
              <Input required type="number" value={classFeeAmount} onChange={e => setClassFeeAmount(e.target.value)} placeholder="e.g. 12000" />
            </div>
            <div>
              <Label>Half-Yearly Exam Fee (₹)</Label>
              <Input required type="number" value={halfYearlyExamFee} onChange={e => setHalfYearlyExamFee(e.target.value)} placeholder="e.g. 500" />
            </div>
            <div>
              <Label>Yearly Exam Fee (₹)</Label>
              <Input required type="number" value={yearlyExamFee} onChange={e => setYearlyExamFee(e.target.value)} placeholder="e.g. 500" />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-xs py-1.5">Set Structuring Fees</Button>
          </form>

          {/* Current pricing directories sheets */}
          <div className="mt-4 border-t pt-3 space-y-1.5 max-h-[220px] overflow-y-auto">
            <Label className="text-[10px] text-slate-400 font-bold block mb-2 uppercase">Configured structural pricing sheets:</Label>
            {classes.map(cl => (
              <div key={cl} className="py-1.5 px-2 border border-slate-200/60 rounded bg-white/70 text-[11px] space-y-1 mb-1">
                <div className="flex justify-between font-black text-slate-750">
                  <span className="font-extrabold text-slate-800">{cl}</span>
                  <span className="font-mono text-indigo-650">₹{(classFees[cl] || 0).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9.5px] border-t border-dashed border-slate-100 pt-1 text-slate-550">
                  <div>Half-Yearly: <span className="font-mono font-bold text-indigo-600">₹{(classFees[`${cl}_HalfYearly`] || 0).toLocaleString()}</span></div>
                  <div className="text-right">Yearly Exam: <span className="font-mono font-bold text-emerald-600">₹{(classFees[`${cl}_Yearly`] || 0).toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Record Student Payment */}
        <Card className="p-4 bg-slate-50/50 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-1.5 mb-3 gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-indigo-600"/> Record Custom Student Payment
            </h3>
            
            {/* Tab selection menu */}
            <div className="flex border border-slate-200 rounded p-0.5 bg-slate-100 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('individual')}
                className={`px-2.5 py-1 rounded transition-all ${activeTab === 'individual' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}
              >
                एकल छात्र भुगतान (Individual)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('combined')}
                className={`px-2.5 py-1 rounded transition-all ${activeTab === 'combined' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}
              >
                संयुक्त भाई-बहन भुगतान (Combined Sibling)
              </button>
            </div>
          </div>
          
          {activeTab === 'individual' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                <div>
                  <Label>Search Student Registrar</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Search by name/grade..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div className="mt-2 max-h-[110px] overflow-y-auto border border-slate-200 rounded p-1 bg-white space-y-0.5">
                    {filteredStudents.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">No students matches found.</p>
                    ) : filteredStudents.slice(0, 10).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSearchTerm(s.name);
                        }}
                        className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors ${selectedStudentId === s.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
                      >
                        {s.name} ({s.grade} - Roll {s.rollNo})
                      </button>
                    ))}
                  </div>
                </div>

                {selectedStudent && selectedStudentBal ? (
                  <div className="p-3 border rounded bg-indigo-50/30 text-xs text-slate-700 space-y-1.5">
                    <p className="font-extrabold text-indigo-800 uppercase text-[9px] mb-1">Financial Coordinates Ledger:</p>
                    <p>Selected student: <span className="font-bold text-slate-900">{selectedStudent.name}</span></p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] border-b pb-1">
                      <p>Yearly Tuition Fee: <span className="font-semibold text-slate-800">₹{selectedStudentBal.current.toLocaleString()}</span></p>
                      <p>Arrears dues: <span className="font-semibold text-slate-800">₹{selectedStudentBal.previous.toLocaleString()}</span></p>
                      <p>Concession (छूट): <span className="font-bold text-indigo-600">₹{(selectedStudentBal.concession || 0).toLocaleString()}</span></p>
                      <p>Total Charge: <span className="font-bold text-slate-900">₹{selectedStudentBal.total.toLocaleString()}</span></p>
                      <p>Total Paid: <span className="font-bold text-emerald-600">₹{selectedStudentBal.paid.toLocaleString()}</span></p>
                    </div>
                    
                    {/* Visual indicator of configured Exam Fees for their class */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-white border border-slate-100 p-1 px-2 rounded">
                      <p className="font-semibold text-slate-500">Half-Yearly Exam: <span className="font-bold text-indigo-650">₹{(classFees[`${selectedStudent.grade}_HalfYearly`] || 0).toLocaleString()}</span></p>
                      <p className="font-semibold text-slate-500">Yearly Exam: <span className="font-bold text-emerald-650">₹{(classFees[`${selectedStudent.grade}_Yearly`] || 0).toLocaleString()}</span></p>
                    </div>

                    <div className="border-t pt-1.5 flex justify-between items-center">
                      <span className="font-black text-slate-900">CURRENT DUE OUTSTANDING:</span>
                      <span className="font-mono font-black text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-xs">₹{selectedStudentBal.balance.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        setEditingDuesStudent(selectedStudent);
                        setArrearsInput(String(selectedStudent.previousDues || 0));
                      }} className="bg-slate-200 text-slate-700 hover:bg-slate-350 p-1 text-[9px] font-bold mt-2 flex-1">Edit Arrears Manual</Button>
                      <Button onClick={() => {
                        setEditingConcessionStudent(selectedStudent);
                        setConcessionInput(String(selectedStudent.discountScholarship || 0));
                      }} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 p-1 text-[9px] font-bold mt-2 flex-1">Edit Concession (छूट)</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 border-2 border-dashed bg-white border-slate-100 rounded text-slate-400 text-xs italic">Select a student registrar above to preview financial ledgers.</div>
                )}
              </div>

              {selectedStudent && (
                <div className="border-t pt-4 space-y-3.5">
                  {/* Fee Category selection row */}
                  <div className="bg-slate-100 p-2 rounded-lg flex flex-wrap gap-2.5 items-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Fee Category (शुल्क का प्रकार):</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFeeCategory('Monthly')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          feeCategory === 'Monthly' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        Monthly Instalment (मासिक किस्त)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeeCategory('HalfYearly')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          feeCategory === 'HalfYearly' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        Half-Yearly Exam Fee
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeeCategory('Yearly')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          feeCategory === 'Yearly' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        Yearly Exam Fee
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handlePaySubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {feeCategory === 'Monthly' ? (
                      <div>
                        <Label>Posting Installment Month</Label>
                        <Input as="select" value={mName} onChange={e => setMName(e.target.value)}>
                          {months.map(m => <option key={m} value={m}>{m} Term</option>)}
                        </Input>
                      </div>
                    ) : (
                      <div>
                        <Label>Examination Term Block</Label>
                        <Input disabled type="text" value={feeCategory === 'HalfYearly' ? 'Half-Yearly Exam Fee (अर्धवार्षिक)' : 'Yearly Exam Fee (वार्षिक)'} />
                      </div>
                    )}
                    <div>
                      <Label>Amount Received Paid (₹)</Label>
                      <Input required type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500" />
                    </div>
                    <div>
                      <Label>Remarks Notes</Label>
                      <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Cash payment receipt" />
                    </div>
                    <div>
                      <Label>Receipt No (Slip Series Number - रसीद संख्या)</Label>
                      <Input 
                        type="text" 
                        value={manualReceiptNo}
                        onChange={e => setManualReceiptNo(e.target.value)} 
                        placeholder={String(currentSchool?.nextReceiptNo || '1001')}
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8 py-2 text-xs">Apply & Issue Cash Voucher Receipt</Button>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sibling Search */}
                <div>
                  <Label className="text-xs font-bold text-slate-700">Search & Add Siblings (छात्रों को ढूंढें और जोड़ें)</Label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Search sibling by name/class..." 
                      value={siblingSearchTerm} 
                      onChange={e => setSiblingSearchTerm(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  
                  {/* Search list results */}
                  <div className="mt-2 max-h-[140px] overflow-y-auto border border-slate-200 rounded p-1 bg-white space-y-0.5">
                    {siblingFilteredStudents.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">No student matches found.</p>
                    ) : siblingFilteredStudents.slice(0, 10).map(s => {
                      const isAlreadyAdded = selectedSiblings.some(item => item.id === s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (isAlreadyAdded) {
                              setSelectedSiblings(prev => prev.filter(item => item.id !== s.id));
                            } else {
                              if (selectedSiblings.length >= 5) {
                                alert("अधिकतम 5 छात्रों को एक साथ जोड़ सकते हैं। (Maximum 5 students can be added at once.)");
                                return;
                              }

                              // Family Validation
                              if (selectedSiblings.length > 0 && !familyRegMode) {
                                const firstSibling = selectedSiblings[0];
                                const isSameFamily = (firstSibling.fatherName === s.fatherName && firstSibling.contactNo === s.contactNo);
                                if (!isSameFamily) {
                                  alert("आप एक बार में केवल एक ही परिवार के सदस्यों को जोड़ सकते हैं। यदि आप इन्हें एक परिवार के रूप में जोड़ना चाहते हैं, तो पहले 'Register Family Group' मोड चालू करें।");
                                  return;
                                }
                              }

                              // Auto-add family members if they share exact same fatherName and contactNo
                              if (!familyRegMode && selectedSiblings.length === 0 && s.fatherName && s.contactNo) {
                                const familyMembers = students.filter(st => 
                                  st.fatherName === s.fatherName && 
                                  st.contactNo === s.contactNo
                                );
                                setSelectedSiblings(familyMembers);
                                const newConcessions = { ...siblingConcessions };
                                familyMembers.forEach(fm => {
                                  newConcessions[fm.id] = String(fm.discountScholarship || 0);
                                });
                                setSiblingConcessions(newConcessions);
                                if (familyMembers.length > 1) {
                                  alert(`Auto-added ${familyMembers.length} linked family members.`);
                                }
                              } else {
                                setSelectedSiblings(prev => [...prev, s]);
                                setSiblingConcessions(prev => ({
                                  ...prev,
                                  [s.id]: String(s.discountScholarship || 0)
                                }));
                              }
                            }
                          }}
                          className={`w-full text-left px-2 py-1.5 text-[11px] rounded transition-colors flex justify-between items-center ${isAlreadyAdded ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                          <span>{s.name} ({s.grade} - Roll {s.rollNo})</span>
                          {isAlreadyAdded ? (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 rounded flex items-center gap-0.5">Selected</span>
                          ) : (
                            <span className="text-[9px] text-indigo-600 font-semibold">+ Add Sibling</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Family Registration Card */}
                  <div className="mt-4 border border-indigo-200 bg-indigo-50/50 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[11px] font-bold text-indigo-900">Register Family Group (परिवार बनाएं)</Label>
                      <button 
                        type="button" 
                        onClick={() => setFamilyRegMode(!familyRegMode)}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors ${familyRegMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200'}`}
                      >
                        {familyRegMode ? 'Cancel' : 'Enable Mode'}
                      </button>
                    </div>
                    {familyRegMode ? (
                      <div className="space-y-2 mt-2">
                        <p className="text-[10px] text-indigo-700 leading-tight">Enable this mode to link multiple arbitrary students into a single family. They will be grouped for future combined payments.</p>
                        <Input 
                          placeholder="Father's Name (e.g. Ramesh Kumar)" 
                          value={familyFatherName}
                          onChange={e => setFamilyFatherName(e.target.value)}
                          className="text-xs py-1 h-7"
                        />
                        <Input 
                          placeholder="Parent Mobile Number (e.g. 9876543210)" 
                          value={familyContact}
                          onChange={e => setFamilyContact(e.target.value)}
                          className="text-xs py-1 h-7"
                        />
                        <Button 
                          type="button"
                          onClick={handleRegisterFamily}
                          className="w-full h-7 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700"
                        >
                          Register & Link Selected Students
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 leading-tight">If students don't automatically group, enable this to link their profiles together.</p>
                    )}
                  </div>
                </div>

                {/* Selected Sibling List */}
                <div className="bg-white p-3 border rounded border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-indigo-600"/> Selected Siblings List ({selectedSiblings.length})</span>
                    <button type="button" onClick={() => setSelectedSiblings([])} className="text-[10px] text-rose-500 font-bold hover:underline">Clear All</button>
                  </div>
                  
                  {selectedSiblings.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 italic">
                      Use search on the left to select siblings/family members.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {selectedSiblings.map(s => {
                        const balObj = getStudentBalance(s.id);
                        const currentAlloc = currentAllocations[s.id] || 0;
                        const currentConcRaw = siblingConcessions[s.id] ?? String(s.discountScholarship || 0);

                        return (
                          <div key={s.id} className="p-2 bg-slate-50 border rounded text-[11px] space-y-2 flex flex-col relative">
                            <button
                              type="button"
                              onClick={() => setSelectedSiblings(prev => prev.filter(item => item.id !== s.id))}
                              className="absolute top-1.5 right-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            
                            <div className="pr-4">
                              <span className="font-extrabold text-slate-900 block">{s.name}</span>
                              <span className="text-[10px] text-slate-500">{s.grade} | Roll: {s.rollNo}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] border-t pt-1.5 border-dashed border-slate-200">
                              <div>
                                <p className="text-slate-500">Yearly Class Dues: <span className="font-bold text-slate-700">₹{balObj.total.toLocaleString()}</span></p>
                                <p className="text-slate-500">Paid: <span className="font-bold text-slate-700">₹{balObj.paid.toLocaleString()}</span></p>
                                <p className="text-slate-600 font-bold">Outstanding: <span className="font-mono text-rose-600 font-bold">₹{balObj.balance.toLocaleString()}</span></p>
                              </div>
                              
                              <div className="space-y-1">
                                <div>
                                  <Label className="text-[9px] text-indigo-700 font-extrabold flex items-center gap-0.5"><Percent className="w-2.5 h-2.5"/> Concession (छूट ₹):</Label>
                                  <input
                                    type="number"
                                    value={currentConcRaw}
                                    onChange={e => {
                                      setSiblingConcessions(prev => ({
                                        ...prev,
                                        [s.id]: e.target.value
                                      }));
                                    }}
                                    placeholder="0"
                                    className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-right text-[10px] font-bold font-mono focus:outline-none focus:border-indigo-500"
                                  />
                                </div>

                                <div>
                                  <Label className="text-[9px] text-slate-500 font-bold">Allocated Payment:</Label>
                                  <input
                                    type="number"
                                    value={splitMethod === 'manual' ? (manualAllocations[s.id] || '') : currentAlloc}
                                    disabled={splitMethod !== 'manual'}
                                    onChange={e => {
                                      setManualAllocations(prev => ({
                                        ...prev,
                                        [s.id]: e.target.value
                                      }));
                                    }}
                                    placeholder="0"
                                    className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-right text-[10px] font-bold font-mono focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selectedSiblings.length > 0 && (
                <form onSubmit={handleCombinedSubmit} className="mt-2 border-t pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-black text-slate-700">Combined Payment Amount Received (कुल भुगतान ₹)</Label>
                      <Input
                        required
                        type="number"
                        placeholder="e.g. 1000"
                        value={combinedAmount}
                        onChange={e => setCombinedAmount(e.target.value)}
                        className="mt-1 font-bold text-slate-900"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs font-black text-slate-700">Split Mode (विभाजन का प्रकार)</Label>
                      <select
                        value={splitMethod}
                        onChange={e => setSplitMethod(e.target.value as any)}
                        className="w-full mt-1 text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="sequential">Sequential Dues Clearance (क्रमशः स्वतः भुगतान)</option>
                        <option value="equal">Equal Share (बराबर विभाजन)</option>
                        <option value="manual">Manual Custom Split (मैनुअल विभाजन)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-black text-slate-700 font-sans">किस्त का महीना (Month Block)</Label>
                      <Input as="select" value={combinedMonth} onChange={e => setCombinedMonth(e.target.value)} className="mt-1">
                        {months.map(m => <option key={m} value={m}>{m} Term</option>)}
                      </Input>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-black text-slate-700">Transaction Remarks / Notes (टिप्पणी)</Label>
                    <Input
                      placeholder="e.g. Consolidated sibling fee payment"
                      value={combinedRemarks}
                      onChange={e => setCombinedRemarks(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div className="bg-slate-100 p-3 rounded text-[11px] space-y-1 border">
                    <p className="font-extrabold uppercase text-[9px] text-slate-500">Split Preview Summary (विभाजन पूर्वावलोकन):</p>
                    <div className="flex justify-between font-bold">
                      <span>Total Joint outstanding balance:</span>
                      <span className="text-rose-600">₹{selectedSiblings.reduce((acc, s) => acc + getStudentBalance(s.id).balance, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Consolidated payment amount:</span>
                      <span className="text-emerald-600">₹{Number(combinedAmount || 0).toLocaleString()}</span>
                    </div>
                    {splitMethod === 'manual' && (() => {
                      const sum: number = Object.values(manualAllocations).reduce((acc: number, val) => acc + Number(val || 0), 0) as number;
                      const diff = Number(combinedAmount || 0) - sum;
                      return (
                        <div className="flex justify-between font-extrabold text-[10px] text-indigo-700">
                          <span>Manual Split Sum: ₹{sum.toLocaleString()}</span>
                          <span>{diff === 0 ? "✓ Matching" : `⚠️ Unmatched: Difference of ₹${diff.toLocaleString()}`}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-extrabold text-xs px-10 py-2.5 w-full md:w-auto">
                      Apply Combined Sibling Payment & Print Voucher
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Arrears dues modal editor */}
      {editingDuesStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 inline-block">
          <Card className="w-full max-w-sm bg-white p-4 shadow-xl border border-slate-300">
            <h4 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Adjust Carry-over Arrears Dues</h4>
            <form onSubmit={handleArrearsSubmit} className="space-y-4">
              <div>
                <Label>Student Ledger Name</Label>
                <span className="font-extrabold text-xs text-slate-700 block">{editingDuesStudent.name} ({editingDuesStudent.grade})</span>
              </div>
              <div>
                <Label>Set Carry-over Outstanding Arrears / Dues (₹)</Label>
                <Input required type="number" value={arrearsInput} onChange={e => setArrearsInput(e.target.value)} placeholder="e.g. 4500" />
                <p className="text-[10px] text-slate-400 mt-1">This amount will be combined with the yearly class structure fee total.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setEditingDuesStudent(null)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 text-white font-bold">Update Arrears</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Concession discount modal editor */}
      {editingConcessionStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 inline-block">
          <Card className="w-full max-w-sm bg-white p-4 shadow-xl border border-slate-300">
            <h4 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-1.5"><Percent className="w-4 h-4 text-indigo-600"/> Adjust Student Concession (छूट)</h4>
            <form onSubmit={handleConcessionSubmit} className="space-y-4">
              <div>
                <Label>Student Ledger Name</Label>
                <span className="font-extrabold text-xs text-slate-700 block">{editingConcessionStudent.name} ({editingConcessionStudent.grade})</span>
              </div>
              <div>
                <Label>Set Scholarship / Fee Concession (₹ छूट राशि)</Label>
                <Input required type="number" value={concessionInput} onChange={e => setConcessionInput(e.target.value)} placeholder="e.g. 500" />
                <p className="text-[10px] text-slate-400 mt-1">This concession amount will be deducted directly from the student's yearly due balance.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setEditingConcessionStudent(null)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 text-white font-bold">Apply Concession</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Fee records history logging */}
      <Card className="p-4 bg-white border border-slate-200 no-print">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block border-b pb-1 flex items-center gap-1.5">Fee records ledger ledger matching</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-500">
            <thead className="bg-slate-50 uppercase text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2">Voucher ID</th>
                <th className="px-4 py-2">Transaction Date</th>
                <th className="px-4 py-2">Student Name</th>
                <th className="px-4 py-2">remarks</th>
                <th className="px-4 py-2 text-right">Receipt Amount</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feeRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 italic text-slate-400 text-xs">No payment logs recorded.</td>
                </tr>
              ) : feeRecords.map(rec => {
                const s = students.find(item => item.id === rec.studentId);
                return (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{rec.id}</td>
                    <td className="px-4 py-2">{new Date(rec.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <span className="font-bold text-slate-800">{s?.name || 'Unknown Student'}</span>
                      <span className="block text-[9px] text-slate-400">{s?.grade} | SR: {s?.srNo}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{rec.remarks}</td>
                    <td className="px-4 py-2 text-right text-emerald-600 font-extrabold font-mono">₹{rec.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => {
                          if (s) {
                            // Try to extract month block from remarks "Month Fee - ..."
                            const match = rec.remarks?.match(/^([^ ]+) Fee - (.*)$/);
                            const monthBlock = match ? match[1] : 'N/A';
                            setMName(monthBlock);
                            setLatestReceipt({ record: rec, student: s });
                            // Scroll to top
                            window.scrollTo(0, 0);
                          }
                        }} className="text-emerald-500 hover:text-emerald-700 font-bold p-1 pr-2 border-r border-slate-200"><Printer className="w-3.5 h-3.5 mx-auto" /></button>
                        <button onClick={() => {
                          if (window.confirm('Revert payment and charge student?')) {
                            deleteFeePayment(rec.id);
                          }
                        }} className="text-rose-500 hover:text-rose-700 font-bold p-1 pl-2"><Trash className="w-3.5 h-3.5 mx-auto" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
