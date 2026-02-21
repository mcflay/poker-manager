/**
 * DataManagement — data export, import, and account deletion controls.
 */
"use client";

import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/export/ExportButton";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function DataManagement() {
  const handleExportAll = async () => {
    try {
      // Export tournaments
      const tourRes = await fetch("/api/export/tournaments?format=json");
      const tourData = await tourRes.json();

      // Export results
      const resRes = await fetch("/api/export/results?format=json");
      const resData = await resRes.json();

      const allData = {
        exportedAt: new Date().toISOString(),
        tournaments: tourData,
        results: resData,
      };

      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `poker-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Full data exported");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Data Management</h3>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Export Data</p>
          <div className="flex gap-2">
            <ExportButton
              endpoint="/api/export/tournaments"
              filename="tournaments"
              label="Tournaments"
            />
            <ExportButton
              endpoint="/api/export/results"
              filename="results"
              label="Results"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleExportAll}
            >
              <Download className="h-3 w-3" />
              Export All
            </Button>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Danger Zone</p>
          <p className="text-[10px] text-muted-foreground mb-2">
            Deleting your account removes all data permanently.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={() => toast.error("Account deletion not yet implemented")}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
