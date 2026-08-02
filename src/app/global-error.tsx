"use client";

import { useEffect } from "react";

// Only fires when something crashes above the [locale] segment itself (root
// layout, i18n providers) — src/app/[locale]/error.tsx handles everything
// else and can't be reached for those. Replaces the *entire* document, so
// no next-intl (the provider that would supply it may be exactly what
// crashed) and its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
          Něco se pokazilo / Something went wrong
        </h1>
        <p style={{ color: "#999", maxWidth: 28 + "rem", margin: 0 }}>
          Zkuste to prosím znovu. / Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.6rem 1.5rem",
            background: "#fff",
            color: "#000",
            border: "2px solid #fff",
            borderRadius: "2px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            cursor: "pointer",
          }}
        >
          Zkusit znovu / Retry
        </button>
      </body>
    </html>
  );
}
