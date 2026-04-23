import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const cookieStore = await cookies();
  if (cookieStore.get("fifo_session")?.value) {
    redirect("/");
  }

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const error = params.error === "1" ? "Invalid token. Try again." : null;

  return (
    <main className="login-shell">
      <div className="login-bg" aria-hidden />
      <div className="login-card">
        <span className="eyebrow">
          <span className="dot" />
          Markets open · FIFO engine ready
        </span>
        <h1>
          Welcome back.
          <span className="accent">Your desk is ready.</span>
        </h1>
        <p className="muted" style={{ maxWidth: "40ch" }}>
          Sign in with your internal operator token to access trades, movements,
          and realized gains.
        </p>

        <LoginForm next={next} error={error} />

        <div className="login-footnote">
          <span className="badge ok">TLS</span>
          <span className="badge">Internal only</span>
          <span className="badge">Europe/Madrid</span>
        </div>
      </div>
    </main>
  );
}
