import React from 'react';
import { type Student, type School } from '../../types';

export interface SubjectRowData {
  subject: string;
  isGradingOnly: boolean;
  isSubjectPractical: boolean;
  hasHy: boolean;
  hasY: boolean;
  hasAny: boolean;
  hasHyOral: boolean;
  hasHyPrac: boolean;
  hasHyPaper2?: boolean;
  hasYOral: boolean;
  hasYPrac: boolean;
  hasYPaper2?: boolean;
  hyTestVal: number;
  hyExamVal: number; // Paper I / Written obtained
  hyPaper2Val?: number; // Paper II obtained
  hyOralVal: number;
  hyPracVal: number;
  hyTestMax: number;
  hyExamMax: number; // Paper I / Written max
  hyPaper2Max?: number; // Paper II max
  hyOralMax: number;
  hyPracMax: number;
  hyMax: number;
  hyObt: number;
  yTestVal: number;
  yExamVal: number; // Paper I / Written obtained
  yPaper2Val?: number; // Paper II obtained
  yOralVal: number;
  yPracVal: number;
  yTestMax: number;
  yExamMax: number; // Paper I / Written max
  yPaper2Max?: number; // Paper II max
  yOralMax: number;
  yPracMax: number;
  yMax: number;
  yObt: number;
  finalMax: number;
  finalObt: number;
  grade: string;
  hyTestExists: boolean;
  hyExamExists: boolean;
  hyPaper2Exists?: boolean;
  hyOralExists: boolean;
  hyPracExists: boolean;
  yTestExists: boolean;
  yExamExists: boolean;
  yPaper2Exists?: boolean;
  yOralExists: boolean;
  yPracExists: boolean;
}

export interface ReportCardCommonProps {
  student: Student;
  currentSchool?: School;
  sessionToUse: string;
  subjectRows: SubjectRowData[];
  totalHyMax: number;
  totalHyObt: number;
  totalYMax: number;
  totalYObt: number;
  totalFinalMax: number;
  totalFinalObt: number;
  overallPercentage: number;
  overallGrade: string;
  remark: string;
  passed: boolean;
  rank: string;
  attendanceString: string;
  activePhoto: string | null;
  photoLoadError: boolean;
  setPhotoLoadError: (val: boolean) => void;
  allowEditPhoto?: boolean;
  onPhotoUploadClick?: () => void;
}

export const getSchoolNameStyle = (name: string, isLandscape: boolean, subjectCount: number = 7) => {
  const len = name.length;
  let sizeInPx = 26;
  
  if (!isLandscape) {
    if (subjectCount <= 6) {
      sizeInPx = len < 20 ? 32 : len < 30 ? 28 : len < 40 ? 24 : len < 50 ? 20 : 17;
    } else if (subjectCount <= 9) {
      sizeInPx = len < 20 ? 28 : len < 30 ? 25 : len < 40 ? 22 : len < 50 ? 19 : 16;
    } else {
      sizeInPx = len < 20 ? 25 : len < 30 ? 22 : len < 40 ? 19 : len < 50 ? 16 : 14;
    }
  } else {
    if (subjectCount <= 6) {
      sizeInPx = len < 20 ? 32 : len < 30 ? 26 : len < 40 ? 22 : len < 50 ? 19 : 16;
    } else if (subjectCount <= 9) {
      sizeInPx = len < 20 ? 26 : len < 30 ? 22 : len < 40 ? 19 : len < 50 ? 16 : 14;
    } else {
      sizeInPx = len < 20 ? 22 : len < 30 ? 19 : len < 40 ? 16 : len < 50 ? 14 : 12;
    }
  }
  
  return {
    fontSize: `${sizeInPx}px`,
    lineHeight: '1.15',
  };
};

export const getAddressStyle = (address: string, isLandscape: boolean, subjectCount: number = 7) => {
  const len = address.length;
  let sizeInPx = 11;
  
  if (!isLandscape) {
    if (subjectCount <= 6) {
      sizeInPx = len < 35 ? 13 : len < 55 ? 11.5 : 10;
    } else if (subjectCount <= 9) {
      sizeInPx = len < 35 ? 12 : len < 55 ? 10.5 : 9;
    } else {
      sizeInPx = len < 35 ? 10.5 : len < 55 ? 9.5 : 8.5;
    }
  } else {
    if (subjectCount <= 6) {
      sizeInPx = len < 35 ? 10.5 : len < 55 ? 9.5 : 8.5;
    } else {
      sizeInPx = len < 35 ? 9.5 : len < 55 ? 8.5 : 7.5;
    }
  }
  
  return {
    fontSize: `${sizeInPx}px`,
    lineHeight: '1.25',
  };
};

export const getDynamicScaling = (subjectCount: number, isLandscape: boolean) => {
  if (isLandscape) {
    if (subjectCount <= 5) {
      return {
        tableText: 'text-[9.5px]',
        tableHeader: 'text-[9px]',
        tableSubHeader: 'text-[8px]',
        subjectCell: 'text-[9.5px]',
        cellPy: 'py-2',
        cellPx: 'px-2',
        totalCellPy: 'py-2',
        studentInfoText: 'text-[10.5px]',
        studentInfoGap: 'gap-y-1.5',
        summaryText: 'text-[10px]',
        summarySpace: 'space-y-1',
        signatureGap: 'h-6',
        signatureMargin: 'mt-3 mb-1.5',
        instructionsText: 'text-[8px]',
        gradingScaleText: 'text-[7.5px]',
      };
    } else if (subjectCount <= 8) {
      return {
        tableText: 'text-[8.5px]',
        tableHeader: 'text-[8px]',
        tableSubHeader: 'text-[7px]',
        subjectCell: 'text-[8.5px]',
        cellPy: 'py-1.5',
        cellPx: 'px-1.5',
        totalCellPy: 'py-1.5',
        studentInfoText: 'text-[9.5px]',
        studentInfoGap: 'gap-y-1',
        summaryText: 'text-[9px]',
        summarySpace: 'space-y-0.5',
        signatureGap: 'h-5',
        signatureMargin: 'mt-2 mb-1',
        instructionsText: 'text-[7.5px]',
        gradingScaleText: 'text-[7px]',
      };
    } else if (subjectCount <= 11) {
      return {
        tableText: 'text-[8px]',
        tableHeader: 'text-[7.5px]',
        tableSubHeader: 'text-[6.5px]',
        subjectCell: 'text-[8px]',
        cellPy: 'py-1',
        cellPx: 'px-1',
        totalCellPy: 'py-1',
        studentInfoText: 'text-[9px]',
        studentInfoGap: 'gap-y-0.5',
        summaryText: 'text-[8.5px]',
        summarySpace: 'space-y-0.5',
        signatureGap: 'h-3.5',
        signatureMargin: 'mt-1.5 mb-0.5',
        instructionsText: 'text-[7px]',
        gradingScaleText: 'text-[6.5px]',
      };
    } else {
      return {
        tableText: 'text-[7px]',
        tableHeader: 'text-[6.5px]',
        tableSubHeader: 'text-[6px]',
        subjectCell: 'text-[7px]',
        cellPy: 'py-[1px]',
        cellPx: 'px-0.5',
        totalCellPy: 'py-[1px]',
        studentInfoText: 'text-[8px]',
        studentInfoGap: 'gap-y-0.5',
        summaryText: 'text-[7.5px]',
        summarySpace: 'space-y-0',
        signatureGap: 'h-2.5',
        signatureMargin: 'mt-1 mb-0.5',
        instructionsText: 'text-[6px]',
        gradingScaleText: 'text-[5.5px]',
      };
    }
  } else {
    // Portrait
    if (subjectCount <= 5) {
      return {
        tableText: 'text-[11px]',
        tableHeader: 'text-[10px]',
        tableSubHeader: 'text-[9px]',
        subjectCell: 'text-[11px]',
        cellPy: 'py-2.5',
        cellPx: 'px-2',
        totalCellPy: 'py-2.5',
        studentInfoText: 'text-[11.5px]',
        studentInfoGap: 'gap-y-2.5',
        summaryText: 'text-[11px]',
        summarySpace: 'space-y-2',
        signatureGap: 'h-8',
        signatureMargin: 'mt-4 mb-2',
        instructionsText: 'text-[8.5px]',
        gradingScaleText: 'text-[8px]',
      };
    } else if (subjectCount <= 8) {
      return {
        tableText: 'text-[10px]',
        tableHeader: 'text-[9.5px]',
        tableSubHeader: 'text-[8.5px]',
        subjectCell: 'text-[10px]',
        cellPy: 'py-2',
        cellPx: 'px-1.5',
        totalCellPy: 'py-2',
        studentInfoText: 'text-[10.5px]',
        studentInfoGap: 'gap-y-1.5',
        summaryText: 'text-[10px]',
        summarySpace: 'space-y-1.5',
        signatureGap: 'h-6',
        signatureMargin: 'mt-3 mb-1.5',
        instructionsText: 'text-[8px]',
        gradingScaleText: 'text-[7.5px]',
      };
    } else if (subjectCount <= 11) {
      return {
        tableText: 'text-[9px]',
        tableHeader: 'text-[8.5px]',
        tableSubHeader: 'text-[7.5px]',
        subjectCell: 'text-[9px]',
        cellPy: 'py-1.5',
        cellPx: 'px-1',
        totalCellPy: 'py-1.5',
        studentInfoText: 'text-[10px]',
        studentInfoGap: 'gap-y-1',
        summaryText: 'text-[9.5px]',
        summarySpace: 'space-y-1',
        signatureGap: 'h-5',
        signatureMargin: 'mt-2.5 mb-1',
        instructionsText: 'text-[7.5px]',
        gradingScaleText: 'text-[7px]',
      };
    } else if (subjectCount <= 14) {
      return {
        tableText: 'text-[8px]',
        tableHeader: 'text-[7.5px]',
        tableSubHeader: 'text-[6.5px]',
        subjectCell: 'text-[8px]',
        cellPy: 'py-1',
        cellPx: 'px-0.5',
        totalCellPy: 'py-1',
        studentInfoText: 'text-[9px]',
        studentInfoGap: 'gap-y-0.5',
        summaryText: 'text-[9px]',
        summarySpace: 'space-y-0.5',
        signatureGap: 'h-3.5',
        signatureMargin: 'mt-1.5 mb-0.5',
        instructionsText: 'text-[7px]',
        gradingScaleText: 'text-[6.5px]',
      };
    } else {
      // 15+ subjects (compact dense fit for single A4)
      return {
        tableText: 'text-[7.5px]',
        tableHeader: 'text-[7px]',
        tableSubHeader: 'text-[6px]',
        subjectCell: 'text-[7.5px]',
        cellPy: 'py-[1.5px]',
        cellPx: 'px-0.5',
        totalCellPy: 'py-[1.5px]',
        studentInfoText: 'text-[8.5px]',
        studentInfoGap: 'gap-y-0.5',
        summaryText: 'text-[8.5px]',
        summarySpace: 'space-y-0.5',
        signatureGap: 'h-3',
        signatureMargin: 'mt-1 mb-0.5',
        instructionsText: 'text-[6.5px]',
        gradingScaleText: 'text-[6px]',
      };
    }
  }
};

export const displayVal = (exists: boolean, val: number) => exists ? val : '';

export const renderMarkCell = (
  exists: boolean, 
  val: number, 
  max?: number, 
  fallbackText: string = '-'
): React.ReactNode => {
  if (!exists && (val === 0 || val === undefined)) {
    return React.createElement('span', { className: 'text-slate-300 font-sans text-[8.5px]' }, fallbackText);
  }
  
  return React.createElement(
    'span',
    { className: 'inline-flex items-baseline justify-center gap-0.5 font-mono' },
    React.createElement('span', { className: 'font-bold text-slate-900' }, val),
    max !== undefined && max > 0
      ? React.createElement('span', { className: 'text-[7.5px] font-semibold text-slate-400 font-sans tracking-tighter' }, `/${max}`)
      : null
  );
};

