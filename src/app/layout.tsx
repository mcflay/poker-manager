/**
 * Root layout for the poker tournament manager application.
 *
 * Sets up the HTML document with:
 * - Dark theme (hardcoded via `dark` class on <html>)
 * - Geist font family (sans + mono variants)
 * - Global CSS styles and Tailwind configuration
 * - Sonner toast notification container (bottom-right position)
 *
 * @layout Root
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/auth/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poker Schedule Manager",
  description: "Track and filter poker tournament schedules across multiple sites",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
