"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ next, error }: { next: string; error: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(error);
  const [pending, startTransition] = useTransition();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, remember })
    });

    if (!res.ok) {
      setLocalError("Invalid token. Try again.");
      return;
    }

    startTransition(() => {
      router.replace(next || "/");
      router.refresh();
    });
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="field">
        <span className="field-label">Operator token</span>
        <div className="field-input">
          <input
            type={show ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="••••••••••••••••"
            autoComplete="current-password"
            required
            autoFocus
          />
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShow((v) => !v)}
            tabIndex={-1}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <div className="login-row">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Keep me signed in for 7 days</span>
        </label>
        <span className="muted" style={{ fontSize: "0.82rem" }}>
          Token from <code>INTERNAL_API_TOKEN</code>
        </span>
      </div>

      {localError ? <div className="login-error">{localError}</div> : null}

      <button type="submit" className="button login-submit" disabled={pending || !token}>
        {pending ? "Signing in…" : "Sign in securely"}
        <span className="login-submit-meta">TLS · BEARER</span>
      </button>
    </form>
  );
}
