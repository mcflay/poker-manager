/**
 * Results tracking page.
 *
 * Displays a list of logged tournament results with summary stats,
 * session grouping sidebar, result form for logging new results,
 * and bulk import functionality.
 *
 * @page /results
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { ResultWithTournament, Session } from "@/lib/types";
import { ResultsList } from "@/components/results/ResultsList";
import { ResultForm } from "@/components/results/ResultForm";
import { BulkResultImport } from "@/components/results/BulkResultImport";
import { SessionManager } from "@/components/results/SessionManager";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { Spade, Plus, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ResultsPage() {
  const [results, setResults] = useState<ResultWithTournament[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSessionId) params.set("sessionId", selectedSessionId);
      const res = await fetch(`/api/results?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/results/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Result deleted");
      fetchResults();
    } catch {
      toast.error("Failed to delete result");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sessions sidebar */}
      <div className="w-56 shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <Spade className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Schedule</span>
          </Link>
        </div>
        <div className="p-4">
          <SessionManager
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
            onCreated={fetchSessions}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <h1 className="text-lg font-bold">Results</h1>

          <div className="ml-auto flex items-center gap-2">
            <BulkResultImport onImported={fetchResults} />
            <Button
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="gap-1.5"
            >
              {showForm ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Close
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Log Result
                </>
              )}
            </Button>
            <UserMenu />
          </div>
        </header>

        {/* Form panel */}
        {showForm && (
          <div className="border-b border-border bg-card px-4 py-4 max-w-lg">
            <ResultForm
              onSaved={() => {
                setShowForm(false);
                fetchResults();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Results table */}
        <main className="flex-1 overflow-auto">
          <ResultsList
            results={results}
            onDelete={handleDelete}
            isLoading={loading}
          />
        </main>
      </div>
    </div>
  );
}
