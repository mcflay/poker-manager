/**
 * Results list component.
 *
 * Displays tournament results in a sortable table using TanStack React Table.
 * Shows tournament name, site, buy-in, finish position, payout, net result,
 * and date. Supports sorting by any column and inline delete.
 *
 * @component ResultsList
 */
"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { ResultWithTournament } from "@/lib/types";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const col = createColumnHelper<ResultWithTournament>();

function formatCurrency(amount: number, currency: string) {
  const sym = currency === "CNY" ? "¥" : "$";
  return `${sym}${Math.abs(amount).toFixed(2)}`;
}

interface ResultsListProps {
  results: ResultWithTournament[];
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function ResultsList({ results, onDelete, isLoading }: ResultsListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "playedAt", desc: true },
  ]);

  const columns = useMemo(
    () => [
      col.accessor("playedAt", {
        header: "Date",
        size: 100,
        cell: ({ getValue }) => {
          const d = getValue();
          if (!d) return "-";
          try {
            return new Date(d).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
          } catch {
            return d;
          }
        },
        sortingFn: "basic",
      }),
      col.accessor("siteName", {
        header: "Site",
        size: 90,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{getValue()}</span>
        ),
      }),
      col.accessor("tournamentName", {
        header: "Tournament",
        minSize: 180,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground leading-tight truncate max-w-[300px]">
              {row.original.tournamentName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {row.original.gameType}
            </span>
          </div>
        ),
      }),
      col.accessor("totalInvested", {
        header: "Invested",
        size: 80,
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatCurrency(row.original.totalInvested, row.original.currency)}
          </span>
        ),
        sortingFn: "basic",
      }),
      col.accessor("finishPosition", {
        header: "Finish",
        size: 70,
        cell: ({ row }) => {
          const pos = row.original.finishPosition;
          const field = row.original.totalEntriesAtFinish;
          if (!pos) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="text-xs tabular-nums">
              {pos}{field ? `/${field}` : ""}
            </span>
          );
        },
        sortingFn: "basic",
      }),
      col.accessor("payout", {
        header: "Payout",
        size: 80,
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-foreground">
            {formatCurrency(row.original.payout + row.original.bountiesWon, row.original.currency)}
          </span>
        ),
        sortingFn: "basic",
      }),
      col.accessor("netResult", {
        header: "Net",
        size: 90,
        cell: ({ getValue, row }) => {
          const net = getValue() ?? 0;
          return (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                net > 0 ? "text-green-400" : net < 0 ? "text-red-400" : "text-foreground"
              )}
            >
              {net >= 0 ? "+" : "-"}{formatCurrency(net, row.original.currency)}
            </span>
          );
        },
        sortingFn: "basic",
      }),
      col.display({
        id: "actions",
        header: "",
        size: 40,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
            onClick={() => onDelete?.(row.original.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      }),
    ],
    [onDelete]
  );

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading results…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <p className="text-sm">No results yet</p>
        <p className="text-xs">Log your first tournament result to start tracking</p>
      </div>
    );
  }

  // Compute summary stats
  const totalInvested = results.reduce((s, r) => s + r.totalInvested, 0);
  const totalPayout = results.reduce((s, r) => s + r.payout + r.bountiesWon, 0);
  const totalNet = totalPayout - totalInvested;
  const roi = totalInvested > 0 ? ((totalNet / totalInvested) * 100) : 0;
  const itm = results.filter((r) => (r.payout || 0) > 0).length;

  return (
    <div>
      {/* Summary stats */}
      <div className="flex gap-4 px-4 py-3 border-b border-border text-xs">
        <div>
          <span className="text-muted-foreground">Tournaments: </span>
          <span className="font-semibold">{results.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Invested: </span>
          <span className="font-semibold">${totalInvested.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Net: </span>
          <span className={cn("font-semibold", totalNet >= 0 ? "text-green-400" : "text-red-400")}>
            {totalNet >= 0 ? "+" : ""}${totalNet.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">ROI: </span>
          <span className={cn("font-semibold", roi >= 0 ? "text-green-400" : "text-red-400")}>
            {roi.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">ITM: </span>
          <span className="font-semibold">
            {itm}/{results.length} ({((itm / results.length) * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      "px-3 py-2 text-left text-xs font-semibold text-muted-foreground select-none",
                      header.column.getCanSort() && "cursor-pointer hover:text-foreground"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() &&
                        ({
                          asc: <ChevronUp className="h-3 w-3" />,
                          desc: <ChevronDown className="h-3 w-3" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className="px-3 py-2"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
