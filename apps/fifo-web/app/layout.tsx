import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";

import { LogoutButton } from "./logout-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "binance-fifo",
  description: "Binance FIFO tax workspace"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const signedIn = Boolean(cookieStore.get("fifo_session")?.value);

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand" style={{ color: "inherit" }}>
            <span className="brand-mark">B</span>
            <span>Binance FIFO</span>
          </Link>
          <div className="topbar-meta">
            {signedIn ? (
              <>
                <Link href="/desk" style={{ color: "var(--text-dim)" }}>Desk</Link>
                <Link href="/trades" style={{ color: "var(--text-dim)" }}>Trades</Link>
                <LogoutButton />
              </>
            ) : null}
            <span className="version">v0.1.0</span>
          </div>
        </header>
        {children}
        <footer className="footer">
          <span>© 2026 Binance FIFO · Internal tax workspace</span>
          <div className="footer-badges">
            <span className="badge">EUR · Madrid</span>
            <span className="badge">FIFO</span>
            <span className="badge">Drizzle · Neon</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
