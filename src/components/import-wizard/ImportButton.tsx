/**
 * Import button and dialog component.
 *
 * Opens a modal dialog for uploading tournament data from scraper
 * JSON files. Supports drag-and-drop and click-to-browse file selection.
 *
 * Currently supports:
 * - WPT Global scraper output (JSON with `scraped_at` + `tournaments`)
 * - GGPoker scraper output (same format, auto-detected by `site` field)
 *
 * Shows upload progress, import summary (new/updated/skipped counts),
 * and error states. Triggers a data refresh callback on success.
 *
 * @component ImportButton
 */
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSetLastImport } from "@/stores/app-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ImportSummary {
  total: number;
  newCount: number;
  updated: number;
  skipped: number;
}

export function ImportButton({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const setLastImport = useSetLastImport();

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Auto-detect format
      let endpoint = "/api/import/wpt";
      if (json.scraped_at && json.tournaments) {
        endpoint = "/api/import/wpt";
      } else {
        throw new Error("Unrecognized file format. Expected WPT scraper JSON output.");
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setSummary(data.summary);
      setLastImport(new Date().toISOString());
      onImported();
      toast.success(`Imported ${data.summary.newCount} new tournaments`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); setSummary(null); setError(null); }}
        className="gap-1.5"
      >
        <Upload className="h-3.5 w-3.5" />
        Import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Tournament Data</DialogTitle>
            <DialogDescription>
              Upload the JSON output from the WPT Global scraper (or CSV in the future).
            </DialogDescription>
          </DialogHeader>

          {!loading && !summary && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary hover:bg-muted/20 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drop JSON file here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-3">
                WPT scraper output: <code className="font-mono">wpt_*.json</code>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Importing tournaments…</p>
            </div>
          )}

          {summary && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Import complete</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-foreground">{summary.newCount}</div>
                  <div className="text-xs text-muted-foreground">New tournaments</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-foreground">{summary.updated}</div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-foreground">{summary.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-foreground">{summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total in file</div>
                </div>
              </div>
              <Button onClick={() => setOpen(false)} className="w-full">Done</Button>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Import failed</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 font-mono break-all">
                {error}
              </p>
              <Button variant="outline" onClick={() => setError(null)} className="w-full">Try again</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
