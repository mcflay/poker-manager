/**
 * CurrencySettings — display currency picker and exchange rate editor.
 *
 * Allows users to set their preferred display currency and
 * view/update exchange rates.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSupportedCurrencies } from "@/lib/currency";

interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  fetchedAt: string;
}

interface CurrencySettingsProps {
  displayCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export function CurrencySettings({
  displayCurrency,
  onCurrencyChange,
}: CurrencySettingsProps) {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [editingRate, setEditingRate] = useState<{
    base: string;
    target: string;
    value: string;
  } | null>(null);

  const currencies = getSupportedCurrencies();

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/currency/rates");
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleUpdateRate = async () => {
    if (!editingRate) return;
    const numRate = parseFloat(editingRate.value);
    if (isNaN(numRate) || numRate <= 0) {
      toast.error("Enter a valid positive rate");
      return;
    }

    try {
      const res = await fetch("/api/currency/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCurrency: editingRate.base,
          targetCurrency: editingRate.target,
          rate: numRate,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Rate updated");
      setEditingRate(null);
      fetchRates();
    } catch {
      toast.error("Failed to update rate");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Currency Settings</h3>

      {/* Display currency */}
      <div className="space-y-1">
        <Label className="text-xs">Display Currency</Label>
        <select
          value={displayCurrency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Exchange rates */}
      <div className="space-y-2">
        <Label className="text-xs">Exchange Rates</Label>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-2 py-1.5 text-left font-medium">Pair</th>
                <th className="px-2 py-1.5 text-right font-medium">Rate</th>
                <th className="px-2 py-1.5 text-right font-medium">Source</th>
                <th className="px-2 py-1.5 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    {r.baseCurrency} → {r.targetCurrency}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {editingRate &&
                    editingRate.base === r.baseCurrency &&
                    editingRate.target === r.targetCurrency ? (
                      <Input
                        type="number"
                        step="0.0001"
                        value={editingRate.value}
                        onChange={(e) =>
                          setEditingRate({ ...editingRate, value: e.target.value })
                        }
                        className="h-6 text-xs w-20 inline-block"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateRate();
                          if (e.key === "Escape") setEditingRate(null);
                        }}
                      />
                    ) : (
                      r.rate.toFixed(4)
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">
                    {r.source}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {editingRate &&
                    editingRate.base === r.baseCurrency &&
                    editingRate.target === r.targetCurrency ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-1"
                        onClick={handleUpdateRate}
                      >
                        Save
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-1"
                        onClick={() =>
                          setEditingRate({
                            base: r.baseCurrency,
                            target: r.targetCurrency,
                            value: r.rate.toString(),
                          })
                        }
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
