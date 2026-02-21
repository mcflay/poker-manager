/**
 * AccountCard — displays a bankroll account with balance and site info.
 *
 * Shows current balance with color coding (green positive, red negative),
 * site name, currency, and action buttons.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  siteId: string | null;
  siteName: string | null;
  name: string;
  currency: string;
  currentBalance: number;
  createdAt: string;
}

interface AccountCardProps {
  account: Account;
  onDeposit: (accountId: string) => void;
  onWithdraw: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onSelect: (accountId: string) => void;
  isSelected: boolean;
}

export function AccountCard({
  account,
  onDeposit,
  onWithdraw,
  onDelete,
  onSelect,
  isSelected,
}: AccountCardProps) {
  const balance = account.currentBalance;
  const currencySymbol = account.currency === "EUR" ? "\u20AC" : account.currency === "GBP" ? "\u00A3" : "$";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      )}
      onClick={() => onSelect(account.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-sm">{account.name}</h3>
          {account.siteName && (
            <p className="text-xs text-muted-foreground">{account.siteName}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(account.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          balance > 0 ? "text-emerald-500" : balance < 0 ? "text-red-500" : "text-foreground"
        )}
      >
        {currencySymbol}{balance.toFixed(2)}
      </p>

      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onDeposit(account.id);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Deposit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onWithdraw(account.id);
          }}
        >
          <Minus className="h-3 w-3 mr-1" />
          Withdraw
        </Button>
      </div>
    </div>
  );
}
