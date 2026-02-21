/**
 * Settings page — user profile, notifications, currency, and data management.
 *
 * @page /settings
 */
"use client";

import { useState } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { CurrencySettings } from "@/components/settings/CurrencySettings";
import { DataManagement } from "@/components/settings/DataManagement";
import { Spade, ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "notifications" | "currency" | "data";

const tabs: { id: SettingsTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "currency", label: "Currency" },
  { id: "data", label: "Data" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [displayCurrency, setDisplayCurrency] = useState("USD");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <Spade className="h-4 w-4 text-primary" />
        </Link>
        <Settings className="h-4 w-4 text-primary" />
        <h1 className="text-lg font-bold">Settings</h1>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        <div className="grid md:grid-cols-[200px_1fr] gap-4">
          {/* Sidebar tabs */}
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="p-4 rounded-lg border border-border bg-card">
            {activeTab === "profile" && <ProfileSettings />}
            {activeTab === "notifications" && <NotificationPreferences />}
            {activeTab === "currency" && (
              <CurrencySettings
                displayCurrency={displayCurrency}
                onCurrencyChange={setDisplayCurrency}
              />
            )}
            {activeTab === "data" && <DataManagement />}
          </div>
        </div>
      </main>
    </div>
  );
}
