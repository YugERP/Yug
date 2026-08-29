import React from 'react';
import { type ReportCardCommonProps, getSchoolNameStyle, getAddressStyle, getDynamicScaling, displayVal, renderMarkCell } from './types';

export const ClassicPortraitTemplate: React.FC<ReportCardCommonProps> = ({
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
  const dyn = getDynamicScaling(subCount, false);

  return (
    <div className="w-full">
      {/* Top Header Block */}
      <div>
        {/* Header section with UDISE */}
        <div className="flex justify-end items-center font-serif text-[10px] font-black text-[#CC0000] uppercase tracking-wider mb-0.5">
          <div>UDISE CODE-{currentSchool?.udiseCode || '09040803605'}</div>
        </div>

        {/* School Logo, Name & Address */}
        <div className="flex items-center justify-center gap-3 mb-1.5">
          {currentSchool?.logo && (
            <img 
              src={currentSchool.logo} 
              alt="School Logo" 
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0" 
              referrerPolicy="no-referrer"
            />
          )}
          <div className="text-center flex-1">
            <h1 
              style={getSchoolNameStyle(currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL', false, subCount)}
              className="font-black text-[#002060] font-serif uppercase tracking-wide leading-tight"
            >
              {currentSchool?.name || 'HARDEV SINGH S.S.N.Jr.HIGH SCHOOL'}
            </h1>
            <p 
              style={getAddressStyle(currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001', false, subCount)}
              className="font-bold text-[#002060] uppercase tracking-widest mt-0.5"
            >
              {currentSchool?.address || 'MILAK BHOLA SINGH SONAKPUR MORADABAD-244001'}
            </p>
            <p className="font-bold text-[#002060] text-[8.5px] sm:text-[9.5px] uppercase tracking-wider mt-0.5">
              Contact No: {currentSchool?.mobile || '9411833501, 8057283623'}
              {currentSchool?.altMobile ? `, ${currentSchool.altMobile}` : ''}
            </p>
          </div>
          {currentSchool?.logo && <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 hidden sm:block"></div>}
        </div>

        {/* Double decorative horizontal header separator */}
        <div className="border-t-2 border-[#002060] py-0.5 my-1"></div>

        {/* REPORT CARD Pill */}
        <div className="text-center my-1">
          <div className="px-5 py-0.5 bg-[#002060] text-white rounded border-2 border-double border-white font-serif text-[13px] sm:text-[14px] font-black tracking-widest uppercase inline-block shadow-sm">
            REPORT CARD
          </div>
        </div>

        {/* Session Text */}
        <p className="text-center font-serif text-[#002060] text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase mb-1.5">
          ACADEMIC SESSION {sessionToUse}
        </p>

        {/* Decorative bottom line */}
        <div className="border-b border-[#002060] mb-2"></div>
      </div>

      {/* Student metadata + passport photo container */}
      <div className="flex flex-row gap-4 items-start justify-between mb-2">
        <div className={`flex-1 grid grid-cols-2 gap-x-6 ${dyn.studentInfoGap} ${dyn.studentInfoText} text-slate-900 font-serif w-full`}>
          <div className="flex items-baseline">
            <span className="font-bold text-[#002060] w-24 shrink-0">Admn.No</span>
            <span className="font-extrabold text-slate-800 flex-1">: {student.admissionNo || student.srNo || '-'}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold text-[#002060] w-24 shrink-0">Class/Section</span>
            <span className="font-extrabold text-slate-800 flex-1">: {student.grade || '-'}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold text-[#002060] w-24 shrink-0">Student's Name</span>
            <span className="font-black text-[#002060] uppercase flex-1">: {student.name}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold text-[#002060] w-24 shrink-0">Roll No</span>
            <span className="font-extrabold text-slate-800 flex-1">: {student.rollNo || '-'}</span>
          </div>
          <div className="flex items-baseline col-span-1">
            <span className="font-bold text-[#002060] w-24 shrink-0">Father's Name</span>
            <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.fatherName || '-'}</span>
          </div>
          <div className="flex items-baseline col-span-1">
            <span className="font-bold text-[#002060] w-24 shrink-0">Mother's Name</span>
            <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.motherName || '-'}</span>
          </div>
          <div className="flex items-baseline col-span-1">
            <span className="font-bold text-[#002060] w-24 shrink-0">D.O.B</span>
            <span className="font-extrabold text-slate-800 uppercase flex-1">: {student.dob || '-'}</span>
          </div>
          <div className="flex items-baseline col-span-1">
            <span className="font-bold text-[#002060] w-24 shrink-0">Address</span>
            <span className="font-extrabold text-slate-800 uppercase flex-1 truncate">: {student.address || student.presentVillageMohalla || '-'}</span>
          </div>
        </div>
        
        {/* Passport photo box */}
        <div className="relative w-16 h-20 border border-dashed border-[#002060] rounded flex items-center justify-center text-center bg-slate-50 overflow-hidden shrink-0 shadow-inner group">
          {activePhoto && !photoLoadError ? (
            <img 
              src={activePhoto} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={() => setPhotoLoadError(true)} 
            />
          ) : (
            <div className="text-[7px] uppercase font-bold text-slate-400 p-1 font-serif leading-tight select-none">Passport Photo</div>
          )}
          {allowEditPhoto && onPhotoUploadClick && (
            <button 
              onClick={onPhotoUploadClick} 
              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold no-print"
            >
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Subjects & Marks Grid table (No horizontal scrollbars, exact 100% table-fixed layout) */}
      <div className="w-full my-1">
        <table className={`w-full table-fixed border-2 border-[#002060] text-center ${dyn.tableText} font-serif border-collapse`}>
          <thead>
            <tr className="border-b-2 border-[#002060] bg-slate-50">
              <th rowSpan={2} className={`border-r-2 border-[#002060] ${dyn.cellPy} ${dyn.cellPx} text-center align-middle text-slate-800 font-black w-[18%]`}>SUBJECT</th>
              <th colSpan={5} className={`border-r-2 border-[#002060] ${dyn.cellPy} text-center font-extrabold text-[#002060] uppercase bg-slate-50 ${dyn.tableHeader}`}>HALF YEARLY EXAMINATION</th>
              <th colSpan={5} className={`border-r-2 border-[#002060] ${dyn.cellPy} text-center font-extrabold text-[#002060] uppercase bg-slate-50 ${dyn.tableHeader}`}>ANNUAL EXAMINATION</th>
              <th colSpan={3} className={`p-0.5 text-center font-extrabold text-[#002060] uppercase bg-slate-50 ${dyn.tableHeader}`}>FINAL EVALUATION</th>
            </tr>
            <tr className={`border-b-2 border-[#002060] ${dyn.tableSubHeader} font-bold text-slate-700 bg-slate-50/50`}>
              {/* Half Yearly columns (32%) */}
              <th className="border-r border-[#002060] p-0.5 w-[5.5%] font-extrabold">TEST</th>
              <th className="border-r border-[#002060] p-0.5 w-[7%] font-extrabold">WRIT.</th>
              <th className="border-r border-[#002060] p-0.5 w-[5.5%] text-indigo-900 bg-indigo-50/40 font-extrabold">PRAC.</th>
              <th className="border-r border-[#002060] p-0.5 w-[6.5%] text-slate-700 font-extrabold">MAX</th>
              <th className="border-r-2 border-[#002060] p-0.5 w-[7.5%] text-[#002060] font-black">OBT.</th>
              {/* Annual columns (32%) */}
              <th className="border-r border-[#002060] p-0.5 w-[5.5%] font-extrabold">TEST</th>
              <th className="border-r border-[#002060] p-0.5 w-[7%] font-extrabold">WRIT.</th>
              <th className="border-r border-[#002060] p-0.5 w-[5.5%] text-indigo-900 bg-indigo-50/40 font-extrabold">PRAC.</th>
              <th className="border-r border-[#002060] p-0.5 w-[6.5%] text-slate-700 font-extrabold">MAX</th>
              <th className="border-r-2 border-[#002060] p-0.5 w-[7.5%] text-[#002060] font-black">OBT.</th>
              {/* Final columns (18%) */}
              <th className="border-r border-[#002060] p-0.5 w-[6%] font-extrabold">MAX</th>
              <th className="border-r border-[#002060] p-0.5 w-[6.5%] text-[#002060] font-black">OBT.</th>
              <th className="p-0.5 w-[5.5%] text-indigo-700 font-extrabold">GRADE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#002060]">
            {subjectRows.map((sub, index) => {
              const hyPracMark = sub.hyPracVal > 0 ? sub.hyPracVal : (sub.hyOralVal > 0 ? sub.hyOralVal : (sub.hyPaper2Val && sub.hyPaper2Val > 0 ? sub.hyPaper2Val : 0));
              const hyPracMax = sub.hyPracMax > 0 ? sub.hyPracMax : (sub.hyOralMax > 0 ? sub.hyOralMax : (sub.hyPaper2Max && sub.hyPaper2Max > 0 ? sub.hyPaper2Max : 30));
              const hasHyPracOrOral = sub.hyPracExists || sub.hyOralExists || sub.isSubjectPractical || (sub.hyPaper2Exists && !sub.isSubjectPractical) || hyPracMark > 0;

              const yPracMark = sub.yPracVal > 0 ? sub.yPracVal : (sub.yOralVal > 0 ? sub.yOralVal : (sub.yPaper2Val && sub.yPaper2Val > 0 ? sub.yPaper2Val : 0));
              const yPracMax = sub.yPracMax > 0 ? sub.yPracMax : (sub.yOralMax > 0 ? sub.yOralMax : (sub.yPaper2Max && sub.yPaper2Max > 0 ? sub.yPaper2Max : 30));
              const hasYPracOrOral = sub.yPracExists || sub.yOralExists || sub.isSubjectPractical || (sub.yPaper2Exists && !sub.isSubjectPractical) || yPracMark > 0;

              return (
                <tr key={`${sub.subject}-${index}`} className="hover:bg-slate-50/20">
                  <td className={`border-r-2 border-[#002060] text-left ${dyn.cellPx} ${dyn.cellPy} font-extrabold uppercase text-[#002060] bg-slate-50/20 ${dyn.subjectCell} truncate`} title={sub.subject}>
                    {sub.subject}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                    {renderMarkCell(sub.hyTestExists, sub.hyTestVal, sub.hyTestMax)}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                    {renderMarkCell(sub.hyExamExists, sub.hyExamVal, sub.hyExamMax)}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center text-indigo-900 bg-indigo-50/20`}>
                    {renderMarkCell(hasHyPracOrOral, hyPracMark, hyPracMax)}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center font-mono text-slate-600`}>
                    {sub.hasHy ? sub.hyMax : ''}
                  </td>
                  <td className={`border-r-2 border-[#002060] ${dyn.cellPy} p-0.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10`}>
                    {sub.hasHy ? sub.hyObt : ''}
                  </td>
                  
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                    {renderMarkCell(sub.yTestExists, sub.yTestVal, sub.yTestMax)}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center`}>
                    {renderMarkCell(sub.yExamExists, sub.yExamVal, sub.yExamMax)}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center text-indigo-900 bg-indigo-50/20`}>
                    {renderMarkCell(hasYPracOrOral, yPracMark, yPracMax)}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center font-mono text-slate-600`}>
                    {sub.hasY ? sub.yMax : ''}
                  </td>
                  <td className={`border-r-2 border-[#002060] ${dyn.cellPy} p-0.5 font-black text-center font-mono text-slate-900 bg-indigo-50/10`}>
                    {sub.hasY ? sub.yObt : ''}
                  </td>
                  
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-bold text-center font-mono`}>
                    {sub.hasAny ? sub.finalMax : ''}
                  </td>
                  <td className={`border-r border-[#002060] ${dyn.cellPy} p-0.5 font-black text-center font-mono text-[#002060] bg-indigo-50/25`}>
                    {sub.hasAny ? sub.finalObt : ''}
                  </td>
                  <td className={`p-0.5 ${dyn.cellPy} font-black text-center text-indigo-800 bg-indigo-50/40`}>
                    {sub.hasAny ? sub.grade : ''}
                  </td>
                </tr>
              );
            })}
            
            {/* Row Total */}
            <tr className={`font-black text-slate-900 bg-slate-100 border-t-2 border-[#002060] ${dyn.tableText}`}>
              <td className={`border-r-2 border-[#002060] text-left ${dyn.cellPx} ${dyn.totalCellPy} font-black uppercase text-[#002060]`}>TOTAL</td>
              <td className="border-r border-[#002060] p-0.5"></td>
              <td className="border-r border-[#002060] p-0.5"></td>
              <td className="border-r border-[#002060] p-0.5"></td>
              <td className="border-r border-[#002060] p-0.5 font-mono text-slate-600">{totalHyMax > 0 ? totalHyMax : ''}</td>
              <td className="border-r-2 border-[#002060] p-0.5 font-mono text-slate-900">{totalHyObt > 0 ? totalHyObt : ''}</td>
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

      {/* Bottom Summary, Signatures & Instructions Block */}
      <div>
        {/* Results summary 2-column grid */}
        <div className={`grid grid-cols-2 gap-x-8 ${dyn.summarySpace} ${dyn.summaryText} text-slate-900 my-1 pt-0.5 font-serif`}>
          <div className={dyn.summarySpace}>
            <div className="flex">
              <span className="font-bold text-[#002060] w-24 shrink-0">RESULT</span>
              <span className={`font-extrabold ${passed ? 'text-emerald-800' : 'text-red-800'}`}>: {passed ? 'PASSED' : 'FAILED'}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-[#002060] w-24 shrink-0">PERCENTAGE</span>
              <span className="font-extrabold">: {overallPercentage.toFixed(2)}%</span>
            </div>
            <div className="flex">
              <span className="font-bold text-[#002060] w-24 shrink-0">GRADE</span>
              <span className="font-extrabold">: {overallGrade}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-[#002060] w-24 shrink-0">RANK</span>
              <span className="font-extrabold">: {rank}</span>
            </div>
          </div>
          <div className={dyn.summarySpace}>
            <div className="flex">
              <span className="font-bold text-[#002060] w-24 shrink-0">REMARK</span>
              <span className="font-extrabold uppercase truncate" title={remark}>: {remark}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-[#002060] w-24 shrink-0">ATTENDANCE</span>
              <span className="font-extrabold">: {attendanceString}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-[#002060] w-24 shrink-0">DATE</span>
              <span className="font-extrabold">: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>

        {/* Signatures Row */}
        <div className={`flex justify-between items-center ${dyn.signatureMargin} px-8 text-center text-[10px] font-black text-[#002060]`}>
          <div className="flex flex-col items-center">
            <div className={dyn.signatureGap}></div>
            <span className="border-t border-[#002060] pt-0.5 px-4 uppercase tracking-wider text-[8.5px]">CLASS TEACHER</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={dyn.signatureGap}></div>
            <span className="border-t border-[#002060] pt-0.5 px-4 uppercase tracking-wider text-[8.5px]">PRINCIPAL</span>
          </div>
        </div>

        {/* Grading Scale instruction footers */}
        <div className="border-t border-dashed border-[#002060] pt-1 mt-1">
          <p className="text-center font-bold text-[8.5px] text-[#002060] uppercase tracking-wider mb-0.5">Instructions</p>
          <p className={`text-slate-600 font-semibold mb-0.5 text-center ${dyn.instructionsText}`}>
            GRADING SCALE FOR SCHOLASTIC AREAS : Grade are awarded on 8-point grading scale as follows
          </p>
          
          <table className={`w-full text-center border border-[#002060] ${dyn.gradingScaleText} font-serif border-collapse`}>
            <thead>
              <tr className="bg-slate-50 font-bold border-b border-[#002060] text-slate-700">
                <td className="border-r border-[#002060] p-0.5 font-semibold uppercase text-slate-500">PERCENTAGE RANGE</td>
                <td className="border-r border-[#002060] p-0.5">91%-100%</td>
                <td className="border-r border-[#002060] p-0.5">81%-90%</td>
                <td className="border-r border-[#002060] p-0.5">71%-80%</td>
                <td className="border-r border-[#002060] p-0.5">61%-70%</td>
                <td className="border-r border-[#002060] p-0.5">51%-60%</td>
                <td className="border-r border-[#002060] p-0.5">41%-50%</td>
                <td className="border-r border-[#002060] p-0.5">33%-40%</td>
                <td className="p-0.5">32% & BELOW</td>
              </tr>
            </thead>
            <tbody>
              <tr className="font-extrabold text-[#002060]">
                <td className="border-r border-[#002060] p-0.5 font-bold text-slate-500">GRADE</td>
                <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">A1</td>
                <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">A2</td>
                <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">B1</td>
                <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">B2</td>
                <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">C1</td>
                <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">C2</td>
                <td className="border-r border-[#002060] p-0.5 bg-indigo-50/10">D</td>
                <td className="p-0.5 bg-indigo-50/10">E</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
