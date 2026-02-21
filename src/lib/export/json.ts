/**
 * JSON export utility.
 *
 * Formats data as pretty-printed JSON for download.
 *
 * @module export/json
 */

/**
 * Convert data to a formatted JSON string.
 *
 * @param data - Any serializable data
 * @param columns - Optional subset of keys to include (for arrays of objects)
 * @returns Formatted JSON string
 */
export function toJSON(
  data: Record<string, unknown>[],
  columns?: string[]
): string {
  if (columns && data.length > 0) {
    const filtered = data.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const key of columns) {
        obj[key] = row[key];
      }
      return obj;
    });
    return JSON.stringify(filtered, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger a JSON file download in the browser.
 */
export function downloadJSON(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
