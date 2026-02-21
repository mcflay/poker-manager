/**
 * Public landing page — the first page visitors see.
 *
 * Displays the app's value proposition, key features, and CTA buttons
 * for signing in or creating an account. Authenticated users are
 * redirected to the dashboard automatically.
 *
 * @page /
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Spade,
  Trophy,
  BarChart3,
  Wallet,
  CalendarDays,
  Bell,
  Handshake,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Tournament Schedule",
    description:
      "Browse and filter tournaments across WPT Global, GGPoker, and more. Save favorites and set reminders.",
  },
  {
    icon: Trophy,
    title: "Results Tracking",
    description:
      "Log every session with buy-ins, finishes, payouts, and bounties. Bulk import from CSV or JSON.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Cumulative P&L charts, ROI breakdowns by site and game type, ITM percentages, and streak tracking.",
  },
  {
    icon: Wallet,
    title: "Bankroll Management",
    description:
      "Track balances across poker sites, log deposits and withdrawals, and monitor bankroll health.",
  },
  {
    icon: Handshake,
    title: "Staking Tools",
    description:
      "Manage staking deals with markup calculators, package tracking, and settlement workflows.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Browser push reminders before tournaments start. Daily digest emails and customizable preferences.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Spade className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">PokerSchedule</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
          <Spade className="h-3.5 w-3.5" />
          Free to use — no credit card required
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
          Your Poker Tournament
          <br />
          <span className="text-primary">Command Center</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
          Track schedules across sites, log results, analyze your performance,
          and manage your bankroll — all in one place.
        </p>

        <div className="flex gap-3 mb-4">
          <Link href="/register">
            <Button size="lg" className="px-8">
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-center text-2xl font-bold mb-10">
          Everything you need to level up your game
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <feature.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-sm mb-1.5">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Spade className="h-3.5 w-3.5" />
          <span>PokerSchedule — Built for grinders, by grinders.</span>
        </div>
      </footer>
    </div>
  );
}
