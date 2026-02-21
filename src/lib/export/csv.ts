/**
 * CSV export utility.
 *
 * Converts arrays of objects to CSV format using PapaParse.
 *
 * @module export/csv
 */
import Papa from "papaparse";

/**
 * Convert an array of objects to a CSV string.
 *
 * @param data - Array of flat objects
 * @param columns - Optional subset of keys to include (defaults to all)
 * @returns CSV string with header row
 */
export function toCSV(
  data: Record<string, unknown>[],
  columns?: string[]
): string {
  if (data.length === 0) return "";

  const fields = columns ?? Object.keys(data[0]);
  return Papa.unparse(data, { columns: fields });
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
