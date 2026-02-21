/**
 * PDF export utility.
 *
 * Generates PDF documents with data tables using jsPDF + jspdf-autotable.
 *
 * @module export/pdf
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate a PDF with a data table.
 *
 * @param title - Document title
 * @param headers - Column header labels
 * @param rows - Array of row data (each row is an array of cell values)
 * @param filename - Output filename
 */
export function generatePDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  // Date
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

  // Table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/**
 * Convert flat objects to header + row arrays for PDF export.
 *
 * @param data - Array of objects
 * @param columns - Keys to include as columns
 * @param headerLabels - Optional display labels for headers (defaults to column keys)
 */
export function dataToPDFRows(
  data: Record<string, unknown>[],
  columns: string[],
  headerLabels?: string[]
): { headers: string[]; rows: (string | number)[][] } {
  const headers = headerLabels ?? columns;
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return "";
      if (typeof val === "number") return val;
      return String(val);
    })
  );
  return { headers, rows };
}
