/**
 * TransactionForm — form for depositing or withdrawing funds.
 *
 * Used in a dialog or inline to add a new bankroll transaction.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TransactionFormProps {
  accountId: string;
  type: "deposit" | "withdrawal";
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  accountId,
  type,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bankroll/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          type,
          amount: numAmount,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create transaction");
      }

      toast.success(
        type === "deposit"
          ? `Deposited $${numAmount.toFixed(2)}`
          : `Withdrew $${numAmount.toFixed(2)}`
      );
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-semibold text-sm capitalize">{type}</h3>

      <div>
        <Label htmlFor="txn-amount" className="text-xs">
          Amount
        </Label>
        <Input
          id="txn-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="h-8 text-sm"
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="txn-description" className="text-xs">
          Description
        </Label>
        <Input
          id="txn-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note…"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={submitting}>
          {submitting ? "Saving…" : `Confirm ${type}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
