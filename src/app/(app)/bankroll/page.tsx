/**
 * Bankroll management page.
 *
 * Displays bankroll accounts with balances, supports deposits and withdrawals,
 * and shows transaction history per account.
 *
 * @page /bankroll
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { AccountCard } from "@/components/bankroll/AccountCard";
import { TransactionForm } from "@/components/bankroll/TransactionForm";
import { TransactionList } from "@/components/bankroll/TransactionList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spade, ArrowLeft, Wallet, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Account {
  id: string;
  siteId: string | null;
  siteName: string | null;
  name: string;
  currency: string;
  currentBalance: number;
  createdAt: string;
}

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

interface Site {
  id: string;
  name: string;
}

export default function BankrollPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [txnForm, setTxnForm] = useState<{
    accountId: string;
    type: "deposit" | "withdrawal";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);

  // New account form state
  const [newName, setNewName] = useState("");
  const [newSiteId, setNewSiteId] = useState("");
  const [newBalance, setNewBalance] = useState("");

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/bankroll/accounts");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAccounts(data.accounts);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`/api/bankroll/transactions?accountId=${accountId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTransactions(data.transactions);
    } catch {
      toast.error("Failed to load transactions");
    }
  }, []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites || []);
      }
    } catch {
      // sites are optional
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchSites();
  }, [fetchAccounts, fetchSites]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions(selectedAccountId);
    } else {
      setTransactions([]);
    }
  }, [selectedAccountId, fetchTransactions]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Account name is required");
      return;
    }

    try {
      const res = await fetch("/api/bankroll/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          siteId: newSiteId || undefined,
          initialBalance: newBalance ? parseFloat(newBalance) : 0,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Account created");
      setShowNewAccount(false);
      setNewName("");
      setNewSiteId("");
      setNewBalance("");
      fetchAccounts();
    } catch {
      toast.error("Failed to create account");
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Delete this account and all its transactions?")) return;

    try {
      const res = await fetch(`/api/bankroll/accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      toast.success("Account deleted");
      if (selectedAccountId === accountId) setSelectedAccountId(null);
      fetchAccounts();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const handleTxnSuccess = () => {
    setTxnForm(null);
    fetchAccounts();
    if (selectedAccountId) fetchTransactions(selectedAccountId);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <Spade className="h-4 w-4 text-primary" />
        </Link>
        <Wallet className="h-4 w-4 text-primary" />
        <h1 className="text-lg font-bold">Bankroll</h1>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right mr-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total Balance
            </p>
            <p className="text-sm font-bold tabular-nums">
              ${totalBalance.toFixed(2)}
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <div className="grid md:grid-cols-[300px_1fr] gap-4">
          {/* Left: Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Accounts</h2>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowNewAccount(!showNewAccount)}
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </div>

            {/* New account form */}
            {showNewAccount && (
              <form
                onSubmit={handleCreateAccount}
                className="p-3 rounded-lg border border-border bg-card space-y-2"
              >
                <div>
                  <Label htmlFor="acct-name" className="text-xs">
                    Name
                  </Label>
                  <Input
                    id="acct-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. GGPoker Main"
                    className="h-7 text-xs"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="acct-site" className="text-xs">
                    Site
                  </Label>
                  <select
                    id="acct-site"
                    value={newSiteId}
                    onChange={(e) => setNewSiteId(e.target.value)}
                    className="w-full h-7 text-xs rounded-md border border-input bg-background px-2"
                  >
                    <option value="">None</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="acct-balance" className="text-xs">
                    Initial Balance
                  </Label>
                  <Input
                    id="acct-balance"
                    type="number"
                    step="0.01"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    placeholder="0.00"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="h-7 text-xs">
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowNewAccount(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Transaction form */}
            {txnForm && (
              <div className="p-3 rounded-lg border border-border bg-card">
                <TransactionForm
                  accountId={txnForm.accountId}
                  type={txnForm.type}
                  onSuccess={handleTxnSuccess}
                  onCancel={() => setTxnForm(null)}
                />
              </div>
            )}

            {/* Account cards */}
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading accounts…
              </p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No accounts yet. Create one to get started.
              </p>
            ) : (
              accounts.map((acct) => (
                <AccountCard
                  key={acct.id}
                  account={acct}
                  isSelected={selectedAccountId === acct.id}
                  onSelect={setSelectedAccountId}
                  onDeposit={(id) => setTxnForm({ accountId: id, type: "deposit" })}
                  onWithdraw={(id) => setTxnForm({ accountId: id, type: "withdrawal" })}
                  onDelete={handleDeleteAccount}
                />
              ))
            )}
          </div>

          {/* Right: Transactions */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <h2 className="text-sm font-semibold mb-3">
              {selectedAccountId
                ? `Transactions — ${accounts.find((a) => a.id === selectedAccountId)?.name ?? ""}`
                : "Select an account"}
            </h2>

            {selectedAccountId ? (
              <TransactionList transactions={transactions} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                Select an account to view its transaction history
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
