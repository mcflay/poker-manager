/**
 * Tournament data table component.
 *
 * Renders a sortable table of tournaments using TanStack React Table v8.
 * Columns: Favorite star, Start time (with countdown), Site, Tournament name
 * (with game type/structure badges), Buy-in (with speed badge), Guarantee,
 * Status badge, and Result trophy icon.
 *
 * Performance optimizations:
 * - StatusBadge/SpeedBadge lookup maps hoisted to module scope
 * - Column definition only depends on a stable onToggleFavorite ref
 * - Row data enrichment memoized on [data, favSet]
 *
 * @component TournamentTable
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
import { Tournament } from "@/lib/types";
import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import {
  Star,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trophy,
} from "lucide-react";

const col = createColumnHelper<Tournament>();

function formatBuyIn(buyIn: number, currency: string) {
  const sym = currency === "CNY" ? "¥" : "$";
  if (buyIn === 0) return "Freeroll";
  return `${sym}${buyIn % 1 === 0 ? buyIn.toFixed(0) : buyIn.toFixed(2)}`;
}

function formatGuarantee(g: number, currency: string) {
  if (!g) return "-";
  const sym = currency === "CNY" ? "¥" : "$";
  if (g >= 1_000_000) return `${sym}${(g / 1_000_000).toFixed(1)}M`;
  if (g >= 1_000) return `${sym}${(g / 1_000).toFixed(0)}K`;
  return `${sym}${g}`;
}

function formatStartTime(iso: string) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return formatInTimeZone(new Date(iso), tz, "dd MMM HH:mm");
  } catch {
    return iso;
  }
}

function timeUntil(iso: string): { text: string; urgent: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return { text: "Started", urgent: false };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { text: `${mins}m`, urgent: mins < 15 };
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return { text: `${hours}h ${rem}m`, urgent: false };
}

// ── Hoisted constant lookup maps (avoid recreating on every render) ──

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Soon", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  registering: { label: "Reg Open", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  late_reg: { label: "Late Reg", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  running: { label: "Running", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  completed: { label: "Done", cls: "bg-muted text-muted-foreground border-muted" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const SPEED_MAP: Record<string, string> = {
  hyper: "bg-red-500/15 text-red-400",
  turbo: "bg-orange-500/15 text-orange-400",
  deep: "bg-cyan-500/15 text-cyan-400",
};

function StatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: "" };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", cls)}>
      {label}
    </span>
  );
}

function SpeedBadge({ speed }: { speed: string }) {
  if (!speed || speed === "regular") return null;
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", SPEED_MAP[speed] || "")}>
      {speed}
    </span>
  );
}

interface TournamentTableProps {
  data: Tournament[];
  onToggleFavorite: (id: string) => void;
  favSet: Set<string>;
  isLoading?: boolean;
}

export function TournamentTable({
  data,
  onToggleFavorite,
  favSet,
  isLoading,
}: TournamentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "startTime", desc: false },
  ]);

  const enriched = useMemo(
    () => data.map((t) => ({ ...t, isFavorite: favSet.has(t.id) })),
    [data, favSet]
  );

  // Use a ref so columns never re-create due to callback identity changes
  const onToggleRef = useRef(onToggleFavorite);
  onToggleRef.current = onToggleFavorite;

  const columns = useMemo(
    () => [
      col.display({
        id: "favorite",
        header: "",
        size: 32,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRef.current(row.original.id);
            }}
            className="text-muted-foreground hover:text-yellow-400 transition-colors p-1"
          >
            {row.original.isFavorite ? (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            ) : (
              <Star className="h-3.5 w-3.5" />
            )}
          </button>
        ),
      }),
      col.accessor("startTime", {
        header: "Start",
        size: 110,
        cell: ({ getValue }) => {
          const iso = getValue();
          const { text, urgent } = timeUntil(iso);
          return (
            <div className="flex flex-col">
              <span className="text-xs text-foreground">{formatStartTime(iso)}</span>
              <span className={cn("text-[10px]", urgent ? "text-red-400 font-semibold" : "text-muted-foreground")}>
                {text}
              </span>
            </div>
          );
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
      col.accessor("name", {
        header: "Tournament",
        minSize: 200,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground leading-tight">
              {row.original.name}
            </span>
            <div className="flex items-center gap-1">
              {row.original.gameType && (
                <span className="text-[10px] text-muted-foreground">{row.original.gameType}</span>
              )}
              {row.original.structure && row.original.structure !== "freezeout" && (
                <span className="text-[10px] text-muted-foreground capitalize">
                  · {row.original.structure.replace(/_/g, " ")}
                </span>
              )}
              {row.original.isSeries && (
                <span className="text-[10px] text-primary">· Series</span>
              )}
            </div>
          </div>
        ),
      }),
      col.accessor("buyIn", {
        header: "Buy-in",
        size: 80,
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatBuyIn(row.original.buyIn, row.original.currency)}
            </span>
            {row.original.speed && row.original.speed !== "regular" && (
              <SpeedBadge speed={row.original.speed} />
            )}
          </div>
        ),
        sortingFn: "basic",
      }),
      col.accessor("guarantee", {
        header: "GTD",
        size: 80,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatGuarantee(row.original.guarantee, row.original.currency)}
          </span>
        ),
        sortingFn: "basic",
      }),
      col.accessor("status", {
        header: "Status",
        size: 90,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      col.accessor("hasResult", {
        header: "",
        size: 32,
        cell: ({ getValue }) =>
          getValue() ? (
            <Trophy className="h-3.5 w-3.5 text-yellow-500 mx-auto" />
          ) : null,
      }),
    ],
    [] // columns are now stable — onToggleFavorite accessed via ref
  );

  const table = useReactTable({
    data: enriched,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading tournaments…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
        <p className="text-sm">No tournaments match your filters</p>
        <p className="text-xs">Try adjusting filters or importing tournament data</p>
      </div>
    );
  }

  return (
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
              className={cn(
                "border-b border-border/50 hover:bg-muted/30 transition-colors",
                row.original.isFavorite && "bg-yellow-500/5"
              )}
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
      <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
        {data.length} tournament{data.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
