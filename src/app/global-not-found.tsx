// Next's dedicated file for a fully unmatched route. The next-intl
// middleware (src/proxy.ts) only rewrites paths that already look like real
// routes into a locale segment — a genuinely unknown path (or one outside
// the middleware's matcher, e.g. containing a dot) never gets that rewrite,
// and there's no root layout.tsx — only src/app/[locale]/layout.tsx — so
// this is the only 404 boundary those paths ever actually hit. It renders
// its own complete <html>/<body> instead of relying on a root layout, which
// is exactly what this file is for — using plain src/app/not-found.tsx here
// caused a hydration mismatch (it doesn't get to share a layout the way a
// normal route does). Framework-minimal (no Tailwind/next-intl/next/font
// available here), but still pulls in the real logo asset and brand red so
// it doesn't look like a bare fallback.
//
// src/app/[locale]/not-found.tsx still exists for pages that explicitly call
// notFound() from within an already-matched locale route.
export default function GlobalNotFound() {
  return (
    <html lang="cs" style={{ height: "100%", overflow: "hidden" }}>
      <head>
        <title>Stránka nenalezena | Salty Road</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          textAlign: "center",
          padding: "1.5rem",
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- no next/image available in this framework-minimal document */}
        <img
          src="/logo_saltyroad-cropped.svg"
          alt="Salty Road"
          width={96}
          height={96}
          style={{ width: "80px", height: "80px", filter: "invert(1)" }}
        />

        <span
          style={{
            fontSize: "4rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "#fff",
          }}
        >
          404
        </span>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Stránka nenalezena
          </h1>
          <span
            style={{
              display: "block",
              width: "48px",
              height: "3px",
              background: "#dc2626",
              margin: "0.75rem auto 0",
            }}
          />
        </div>

        <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.95rem", maxWidth: "24rem" }}>
          Tahle stránka neexistuje nebo byla přesunuta.
        </p>

        <a
          href="/cs"
          style={{
            marginTop: "0.75rem",
            padding: "0.65rem 1.75rem",
            background: "#fff",
            color: "#000",
            borderRadius: "2px",
            border: "2px solid #fff",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          Domů
        </a>
      </body>
    </html>
  );
}
