import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stock Watchlist",
  description: "Track companies you're interested in investing in, with live prices and daily AI insights.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="transition hover:opacity-90">
              <Logo />
            </Link>
            <span className="text-xs text-muted">Live prices · Daily AI insights</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border text-center text-xs text-muted py-4 px-4 space-y-0.5">
          <div>Educational information only — not financial advice.</div>
          <div>
            Market data via Yahoo Finance — may be delayed and is not guaranteed accurate. Verify against your broker
            before trading. AI insights can be wrong.
          </div>
        </footer>
      </body>
    </html>
  );
}
