import React from 'react';

interface ReportCardStylesProps {
  isLandscape: boolean;
  brandColor: string;
}

export const ReportCardStyles: React.FC<ReportCardStylesProps> = ({ isLandscape, brandColor }) => {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'}; 
            margin: 3mm; 
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-container {
            position: relative !important;
            background: white !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: ${isLandscape ? '200mm' : '288mm'} !important;
            box-sizing: border-box !important;
            border: 5px double var(--rc-color, #002060) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: ${isLandscape ? '3mm 4mm' : '4mm 5mm'} !important;
            margin: 0 auto !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .traditional-border {
            border: 5px double var(--rc-color, #002060) !important;
            padding: ${isLandscape ? '3mm 4mm' : '4mm 5mm'} !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .no-print, .no-print *, button.no-print, .print\\:hidden {
            display: none !important;
          }

          table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: visible !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }
        }

        .report-card-container .text-\\[\\#002060\\] {
          color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-\\[\\#002060\\] {
          border-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .bg-\\[\\#002060\\] {
          background-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .divide-\\[\\#002060\\] > * + * {
          border-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-t-\\[\\#002060\\] {
          border-top-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-b-\\[\\#002060\\] {
          border-bottom-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-r-\\[\\#002060\\] {
          border-right-color: var(--rc-color, #002060) !important;
        }
        .report-card-container .border-l-\\[\\#002060\\] {
          border-left-color: var(--rc-color, #002060) !important;
        }
        .report-card-container.traditional-border, 
        .report-card-container .traditional-border {
          border: 5px double var(--rc-color, #002060) !important;
        }
        .report-card-container.print-container,
        .report-card-container .print-container {
          border-color: var(--rc-color, #002060) !important;
        }
      `}} />
    </>
  );
};
