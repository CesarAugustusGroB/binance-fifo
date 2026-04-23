"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      style={{
        background: "transparent",
        color: "var(--text-dim)",
        border: "1px solid var(--border)",
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: "0.82rem",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        textTransform: "uppercase"
      }}
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}
