/**
 * TransactionList — displays transaction history for a bankroll account.
 *
 * Shows type, amount, balance after, description, and date.
 */
"use client";

import { cn } from "@/lib/utils";
import { ArrowUpCircle, ArrowDownCircle, Trophy, Wrench } from "lucide-react";

interface Transaction {
  id: string;
  accountId: string;
  accountName: string | null;
  type: string;
  amount: number;
  balanceAfter: number;
  relatedResultId: string | null;
  description: string | null;
  transactedAt: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

const typeIcons: Record<string, React.ReactNode> = {
  deposit: <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />,
  withdrawal: <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />,
  result: <Trophy className="h-3.5 w-3.5 text-amber-500" />,
  adjustment: <Wrench className="h-3.5 w-3.5 text-blue-500" />,
};

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No transactions yet
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((txn) => (
        <div
          key={txn.id}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-sm"
        >
          <div className="flex-shrink-0">
            {typeIcons[txn.type] ?? typeIcons.adjustment}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize text-xs">{txn.type}</span>
              {txn.description && (
                <span className="text-xs text-muted-foreground truncate">
                  — {txn.description}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {new Date(txn.transactedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="text-right flex-shrink-0">
            <p
              className={cn(
                "font-mono text-xs font-semibold",
                txn.amount > 0 ? "text-emerald-500" : "text-red-500"
              )}
            >
              {txn.amount > 0 ? "+" : ""}
              ${txn.amount.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              bal: ${txn.balanceAfter.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
