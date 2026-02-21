/**
 * Bulk result import component.
 *
 * Allows users to upload CSV or JSON files containing tournament results.
 * CSV files are parsed client-side using PapaParse. Results are sent to
 * the /api/results/bulk endpoint for batch insertion.
 *
 * Expected CSV columns: tournamentId, entries, totalInvested, finishPosition,
 * totalEntriesAtFinish, payout, bountiesWon, notes, playedAt
 *
 * @component BulkResultImport
 */
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileUp } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

interface BulkResultImportProps {
  onImported?: () => void;
}

export function BulkResultImport({ onImported }: BulkResultImportProps) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);

    try {
      let results: Record<string, unknown>[];

      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        results = Array.isArray(parsed) ? parsed : parsed.results || [];
      } else if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

        results = parsed.data.map((row: any) => ({
          tournamentId: row.tournamentId || row.tournament_id,
          entries: Number(row.entries) || 1,
          totalInvested: Number(row.totalInvested || row.total_invested || 0),
          finishPosition: row.finishPosition || row.finish_position
            ? Number(row.finishPosition || row.finish_position)
            : null,
          totalEntriesAtFinish: row.totalEntriesAtFinish || row.total_entries_at_finish
            ? Number(row.totalEntriesAtFinish || row.total_entries_at_finish)
            : null,
          payout: Number(row.payout || 0),
          bountiesWon: Number(row.bountiesWon || row.bounties_won || 0),
          notes: row.notes || null,
          playedAt: row.playedAt || row.played_at || null,
        }));
      } else {
        toast.error("Unsupported file format. Use .json or .csv");
        return;
      }

      if (results.length === 0) {
        toast.error("No results found in file");
        return;
      }

      const res = await fetch("/api/results/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }

      toast.success(`Imported ${data.imported} results`);
      if (data.errors?.length > 0) {
        toast.warning(`${data.errors.length} rows had errors`);
      }

      onImported?.();
    } catch (err) {
      toast.error("Failed to process file");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileUp className="h-3.5 w-3.5" />
        )}
        Import Results
      </Button>
    </div>
  );
}
