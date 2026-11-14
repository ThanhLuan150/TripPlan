type Cell = string | number | null | undefined;

// A cell starting with = + - @ would run as a formula in Excel: prefix it.
const cell = (value: Cell) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (header: string[], rows: Cell[][]) =>
  [header, ...rows].map(line => line.map(cell).join(',')).join('\r\n');

// Downloads a CSV (UTF-8 with BOM, so Excel reads the Vietnamese text).
export const downloadCsv = (header: string[], rows: Cell[][], filename: string) => {
  const blob = new Blob(['﻿', toCsv(header, rows)], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
