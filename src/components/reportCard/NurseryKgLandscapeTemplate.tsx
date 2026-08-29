import React from 'react';
import { type ReportCardCommonProps, getSchoolNameStyle, getAddressStyle, getDynamicScaling, displayVal, renderMarkCell } from './types';
import { isPracticalSubject } from '../../utils/gradeHelper';

export const NurseryKgLandscapeTemplate: React.FC<ReportCardCommonProps> = ({
  student,
  currentSchool,
  sessionToUse,
  subjectRows,
  totalHyMax,
  totalHyObt,
  totalYMax,
  totalYObt,
  totalFinalMax,
  totalFinalObt,
  overallPercentage,
  overallGrade,
  remark,
  passed,
  rank,
  attendanceString,
  activePhoto,
  photoLoadError,
  setPhotoLoadError,
  allowEditPhoto,
  onPhotoUploadClick,
}) => {
  const subCount = subjectRows.length;
  const dyn = getDynamicScaling(subCount, true);

  return (
    <div className="w-full">
      {/* Top Header Block */}
      <div>
        {/* Header section with UDISE */}
        <div className="flex justify-end items-center font-serif text-[9px] font-black text-[#CC0000] uppercase tracking-wider mb-0.5">
          <div>UDISE CODE-{currentSchool?.udiseCode || '09040803605'}</div>
        </div>

        {/* School Logo, Name & Address */}
        <div className="flex items-center justify-center gap-3 mb-1">
          {currentSchool?.logo && (
            <img 
              src={currentSchool.logo} 
              alt="School Logo" 
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" 
              referrerPolicy="no-referrer"
            />
          )}
          <div className="text-center flex-1">
            <h1 
              style={getSchoolNameStyle(currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL', true, subCount)}
              className="font-black text-[#002060] font-serif uppercase tracking-wide leading-tight"
            >
              {currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL'}
            </h1>
            <p 
              style={getAddressStyle(currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001', true, subCount)}
              className="font-bold text-[#002060] uppercase tracking-widest mt-0.5"
            >
              {currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001'}
            </p>
            <p className="font-bold text-[#002060] text-[8px] sm:text-[9px] uppercase tracking-wider mt-0.5">
              Contact No: {currentSchool?.mobile || '9411833501, 8057283623'}
              {currentSchool?.altMobile ? `, ${currentSchool.altMobile}` : ''}
            </p>
          </div>
          {currentSchool?.logo && <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 hidden sm:block"></div>}
        </div>

        {/* Separator */}
        <div className="border-t border-[#002060] py-0.5 my-0.5"></div>

        {/* REPORT CARD Pill & Session */}
        <div className="flex justify-between items-center px-4 my-1">
          <span className="font-serif text-[#002060] text-[9.5px] font-extrabold tracking-widest uppercase">
            ACADEMIC SESSION {sessionToUse}
          </span>
          <div className="px-4 py-0.5 bg-[#002060] text-white rounded border border-white font-serif text-[11.5px] font-black tracking-widest uppercase shadow-sm">
            PROGRESS REPORT CARD
          </div>
          <span className="font-serif text-[#002060] text-[9.5px] font-extrabold tracking-widest uppercase">
            ANNUAL EVALUATION
          </span>
        </div>
      </div>

      {/* Student metadata + photo box */}
      <div className="border border-[#002060] rounded p-1.5 my-1 bg-slate-50/20">
        <div className="flex flex-row gap-3 items-center justify-between">
          <div className={`flex-1 grid grid-cols-3 gap-x-4 ${dyn.studentInfoGap} ${dyn.studentInfoText} text-slate-900 font-serif`}>
            <div className="flex items-baseline">
              <span className="font-bold text-[#002060] w-20 shrink-0">Admn No:</span>
              <span className="font-extrabold text-slate-800 truncate">{student.admissionNo || student.srNo || '-'}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-[#002060] w-20 shrink-0">Class/Sec:</span>
              <span className="font-extrabold text-slate-800">{student.grade || '-'}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-[#002060] w-20 shrink-0">Roll No:</span>
              <span className="font-extrabold text-slate-800">{student.rollNo || '-'}</span>
            </div>
            <div className="flex items-baseline col-span-1">
              <span className="font-bold text-[#002060] w-20 shrink-0">Student:</span>
              <span className="font-black text-[#002060] uppercase truncate">{student.name}</span>
            </div>
            <div className="flex items-baseline col-span-1">
              <span className="font-bold text-[#002060] w-20 shrink-0">Father:</span>
              <span className="font-extrabold text-slate-800 uppercase truncate">{student.fatherName || '-'}</span>
            </div>
            <div className="flex items-baseline col-span-1">
              <span className="font-bold text-[#002060] w-20 shrink-0">Mother:</span>
              <span className="font-extrabold text-slate-800 uppercase truncate">{student.motherName || '-'}</span>
            </div>
            <div className="flex items-baseline col-span-1">
              <span className="font-bold text-[#002060] w-20 shrink-0">D.O.B:</span>
              <span className="font-extrabold text-slate-800">{student.dob || '-'}</span>
            </div>
            <div className="flex items-baseline col-span-2">
              <span className="font-bold text-[#002060] w-20 shrink-0">Address:</span>
              <span className="font-extrabold text-slate-800 uppercase truncate">{student.address || student.presentVillageMohalla || '-'}</span>
            </div>
          </div>
          
          {/* Photo */}
          <div className="relative w-12 h-14 border border-dashed border-[#002060] rounded flex items-center justify-center text-center bg-slate-50 overflow-hidden shrink-0 shadow-inner group">
            {activePhoto && !photoLoadError ? (
              <img 
                src={activePhoto} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={() => setPhotoLoadError(true)} 
              />
            ) : (
              <div className="text-[6.5px] uppercase font-bold text-slate-400 p-0.5 font-serif leading-tight">Photo</div>
            )}
            {allowEditPhoto && onPhotoUploadClick && (
              <button 
                onClick={onPhotoUploadClick} 
                className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[7px] font-bold no-print"
              >
                Upload
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side: Table (Col 9) + Summary Card (Col 3) */}
      <div className="w-full my-1">
        <div className="grid grid-cols-12 gap-2 items-start">
          {/* Marks Table */}
          <div className="col-span-9">
            <table className={`w-full table-fixed border-2 border-[#002060] text-center ${dyn.tableText} font-serif border-collapse`}>
              <thead>
                <tr className="border-b-2 border-[#002060] bg-slate-50">
                  <th rowSpan={2} className={`border-r-2 border-[#002060] ${dyn.cellPy} ${dyn.cellPx} text-center align-middle text-slate-800 font-black w-[16%]`}>SUBJECT</th>
                  <th colSpan={6} className={`border-r-2 border-[#002060] ${dyn.cellPy} text-center font-extrabold text-[#002060] uppercase bg-slate-50 ${dyn.tableHeader}`}>TERM - I (HALF YEARLY)</th>
                  <th colSpan={6} className={`border-r-2 border-[#002060] ${dyn.cellPy} text-center font-extrabold text-[#002060] uppercase bg-slate-50 ${dyn.tableHeader}`}>TERM - II (ANNUAL)</th>
                  <th colSpan={3} className={`p-0.5 text-center font-extrabold text-[#002060] uppercase bg-slate-50 ${dyn.tableHeader}`}>FINAL</th>
                </tr>
                <tr className={`border-b-2 border-[#002060] ${dyn.tableSubHeader} font-bold text-slate-700 bg-slate-50/50`}>
                  <th className="border-r border-[#002060] p-0.5 w-[4.8%] font-extrabold">TEST</th>
                  <th className="border-r border-[#002060] p-0.5 w-[5.8%] font-extrabold">WRIT.</th>
                  <th className="border-r border-[#002060] p-0.5 w-[4.8%] text-amber-900 bg-amber-50/30 font-extrabold">ORAL</th>
                  <th className="border-r border-[#002060] p-0.5 w-[4.8%] text-indigo-900 bg-indigo-50/40 font-extrabold">PRAC.</th>
                  <th className="border-r border-[#002060] p-0.5 w-[5.6%] font-extrabold">MAX</th>
                  <th className="border-r-2 border-[#002060] p-0.5 w-[6.2%] text-[#002060] font-black">OBT.</th>

                  <th className="border-r border-[#002060] p-0.5 w-[4.8%] font-extrabold">TEST</th>
                  <th className="border-r border-[#002060] p-0.5 w-[5.8%] font-extrabold">WRIT.</th>
                  <th className="border-r border-[#002060] p-0.5 w-[4.8%] text-amber-900 bg-amber-50/30 font-extrabold">ORAL</th>
                  <th className="border-r border-[#002060] p-0.5 w-[4.8%] text-indigo-900 bg-indigo-50/40 font-extrabold">PRAC.</th>
                  <th className="border-r border-[#002060] p-0.5 w-[5.6%] font-extrabold">MAX</th>
                  <th className="border-r-2 border-[#002060] p-0.5 w-[6.2%] text-[#002060] font-black">OBT.</th>

                  <th className="border-r border-[#002060] p-0.5 w-[6.5%] font-extrabold">MAX</th>
                  <th className="border-r border-[#002060] p-0.5 w-[7.5%] text-[#002060] font-black">OBT.</th>
                  <th className="p-0.5 w-[6%] text-indigo-700 font-extrabold">GRD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#002060]">
                {subjectRows.map((sub, index) => {
                  return (
                    <tr key={`${sub.subject}-${index}`} className="hover:bg-slate-50/20">
                      <td className={`border-r-2 border-[#002060] text-left ${dyn.cellPx} ${dyn.cellPy} font-extrabold uppercase text-[#002060] bg-slate-50/20 ${dyn.subjectCell} truncate`} title={sub.subject}>
                        {sub.subject}
                      </td>
                      {/* HY Test */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                        {renderMarkCell(sub.hyTestExists, sub.hyTestVal, sub.hyTestMax)}
                      </td>
                      {/* HY Written */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                        {renderMarkCell(sub.hyExamExists, sub.hyExamVal, sub.hyExamMax)}
                      </td>
                      {/* HY Oral */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center text-amber-900 bg-amber-50/20`}>
                        {renderMarkCell(sub.hyOralExists || sub.hyOralVal > 0, sub.hyOralVal, sub.hyOralMax || 20)}
                      </td>
                      {/* HY Practical */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center text-indigo-900 bg-indigo-50/20`}>
                        {renderMarkCell(sub.hyPracExists || sub.hyPracVal > 0 || sub.isSubjectPractical, sub.hyPracVal, sub.hyPracMax || 30)}
                      </td>
                      {/* HY Max */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center font-mono text-slate-600`}>{sub.hasHy ? sub.hyMax : ''}</td>
                      {/* HY Obt */}
                      <td className={`border-r-2 border-[#002060] ${dyn.cellPy} p-0.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10`}>{sub.hasHy ? sub.hyObt : ''}</td>

                      {/* Y Test */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                        {renderMarkCell(sub.yTestExists, sub.yTestVal, sub.yTestMax)}
                      </td>
                      {/* Y Written */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                        {renderMarkCell(sub.yExamExists, sub.yExamVal, sub.yExamMax)}
                      </td>
                      {/* Y Oral */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center text-amber-900 bg-amber-50/20`}>
                        {renderMarkCell(sub.yOralExists || sub.yOralVal > 0, sub.yOralVal, sub.yOralMax || 20)}
                      </td>
                      {/* Y Practical */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center text-indigo-900 bg-indigo-50/20`}>
                        {renderMarkCell(sub.yPracExists || sub.yPracVal > 0 || sub.isSubjectPractical, sub.yPracVal, sub.yPracMax || 30)}
                      </td>
                      {/* Y Max */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center font-mono text-slate-600`}>{sub.hasY ? sub.yMax : ''}</td>
                      {/* Y Obt */}
                      <td className={`border-r-2 border-[#002060] ${dyn.cellPy} p-0.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10`}>{sub.hasY ? sub.yObt : ''}</td>

                      {/* Overall Max */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center font-mono text-slate-500`}>{sub.hasAny ? sub.finalMax : ''}</td>
                      {/* Overall Obt */}
                      <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-black text-center font-mono text-[#002060] bg-indigo-50/25`}>{sub.hasAny ? sub.finalObt : ''}</td>
                      {/* Grade */}
                      <td className={`p-0.5 ${dyn.cellPy} font-black text-center text-indigo-800 bg-indigo-50/40`}>{sub.hasAny ? sub.grade : ''}</td>
                    </tr>
                  );
                })}
                
                {/* Row Total */}
                <tr className={`font-black text-slate-900 bg-slate-100 border-t-2 border-[#002060] ${dyn.tableText}`}>
                  <td className={`border-r-2 border-[#002060] text-left ${dyn.cellPx} ${dyn.totalCellPy} font-black uppercase text-[#002060]`}>TOTAL</td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5 font-mono text-slate-600">{totalHyMax > 0 ? totalHyMax : ''}</td>
                  <td className="border-r-2 border-[#002060] p-0.5 font-mono text-slate-900">{totalHyObt > 0 ? totalHyObt : ''}</td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5"></td>
                  <td className="border-r border-[#002060] p-0.5 font-mono text-slate-600">{totalYMax > 0 ? totalYMax : ''}</td>
                  <td className="border-r-2 border-[#002060] p-0.5 font-mono text-slate-900">{totalYObt > 0 ? totalYObt : ''}</td>
                  <td className="border-r border-[#002060] p-0.5 font-mono text-slate-600">{totalFinalMax > 0 ? totalFinalMax : ''}</td>
                  <td className="border-r border-[#002060] p-0.5 font-mono text-[#002060] font-black">{totalFinalObt > 0 ? totalFinalObt : ''}</td>
                  <td className="p-0.5 text-indigo-900 font-black">{totalFinalMax > 0 ? overallGrade : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Card */}
          <div className="col-span-3 border-2 border-[#002060] rounded p-2 flex flex-col justify-between bg-slate-50/10 font-serif">
            <div>
              <div className="text-center font-black text-[#002060] uppercase border-b border-[#002060] pb-1 text-[10px] tracking-wider mb-2">
                Performance Summary
              </div>
              <div className={`${dyn.summarySpace} ${dyn.summaryText} text-slate-900`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002060]">Result:</span>
                  <span className={`font-extrabold ${passed ? 'text-emerald-800' : 'text-red-800'}`}>{passed ? 'PASSED (PROMOTED)' : 'PASSED'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002060]">Percentage:</span>
                  <span className="font-extrabold font-mono">{overallPercentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002060]">Grade:</span>
                  <span className="font-black text-indigo-700">{overallGrade}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002060]">Rank:</span>
                  <span className="font-extrabold font-mono">{rank}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002060]">Attendance:</span>
                  <span className="font-extrabold font-mono">{attendanceString}</span>
                </div>
                <div className="flex justify-between items-start pt-0.5">
                  <span className="font-bold text-[#002060]">Remark:</span>
                  <span className="font-extrabold text-[8.5px] uppercase truncate max-w-[100px] text-right" title={remark}>{remark}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002060]">Date:</span>
                  <span className="font-extrabold text-[8.5px]">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>

            {/* Mini Signatures in Summary Box */}
            <div className="pt-2 border-t border-[#002060] flex justify-between items-end text-center text-[8px] font-black text-[#002060]">
              <div>
                <div className={dyn.signatureGap}></div>
                <span className="border-t border-[#002060] pt-0.5 px-1 uppercase tracking-wider block">Teacher</span>
              </div>
              <div>
                <div className={dyn.signatureGap}></div>
                <span className="border-t border-[#002060] pt-0.5 px-1 uppercase tracking-wider block">Principal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions footer */}
      <div className="border-t border-dashed border-[#002060] pt-1 mt-1">
        <table className={`w-full text-center border border-[#002060] ${dyn.gradingScaleText} font-serif border-collapse`}>
          <thead>
            <tr className="bg-slate-50 font-bold border-b border-[#002060] text-slate-700">
              <td className="border-r border-[#002060] p-0.5 font-semibold uppercase text-slate-500">GRADING SCALE</td>
              <td className="border-r border-[#002060] p-0.5">91-100% (A1)</td>
              <td className="border-r border-[#002060] p-0.5">81-90% (A2)</td>
              <td className="border-r border-[#002060] p-0.5">71-80% (B1)</td>
              <td className="border-r border-[#002060] p-0.5">61-70% (B2)</td>
              <td className="border-r border-[#002060] p-0.5">51-60% (C1)</td>
              <td className="border-r border-[#002060] p-0.5">41-50% (C2)</td>
              <td className="border-r border-[#002060] p-0.5">33-40% (D)</td>
              <td className="p-0.5">≤32% (E)</td>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  );
};
