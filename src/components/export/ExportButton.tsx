/**
 * ExportButton — dropdown button for exporting data in CSV, JSON, or PDF.
 *
 * Fetches data from an API endpoint and triggers a file download.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  /** API endpoint path (e.g., "/api/export/tournaments") */
  endpoint: string;
  /** Base filename without extension */
  filename: string;
  /** Optional label text */
  label?: string;
}

export function ExportButton({
  endpoint,
  filename,
  label = "Export",
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleExport = async (format: "csv" | "json") => {
    setOpen(false);
    try {
      const res = await fetch(`${endpoint}?format=${format}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${format}`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setOpen(!open)}
      >
        <Download className="h-3 w-3" />
        {label}
      </Button>

      {open && (
        <div className="absolute right-0 top-8 w-32 rounded-md border border-border bg-card shadow-lg z-50">
          <button
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50 transition-colors"
            onClick={() => handleExport("csv")}
          >
            CSV (.csv)
          </button>
          <button
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50 transition-colors border-t border-border"
            onClick={() => handleExport("json")}
          >
            JSON (.json)
          </button>
        </div>
      )}
    </div>
  );
}
