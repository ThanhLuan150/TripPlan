import {safeFileName, saveBlob} from '@/lib/download';
import {exportPdf} from './api';
import type {PdfTable} from './exports';

// Asks the backend for the PDF of a table and saves it (the browser's own download, nothing is opened).
export const downloadPdf = async (table: PdfTable) => {
  const blob = await exportPdf(table);
  saveBlob(blob, `${safeFileName(table.title, 'aloca')}.pdf`);
};
