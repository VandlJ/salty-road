import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type Suggestion = {
  label: string;
  street: string;
  city: string;
  zip: string;
};

// Server-side proxy for Mapy.cz Suggest API (https://developer.mapy.cz/)
// keeps the API key out of client bundles. Requires MAPY_CZ_API_KEY (free
// tier, no billing) — without it this endpoint just returns an empty list
// and the checkout address fields silently fall back to plain manual entry,
// so a missing key never blocks checkout.
export async function GET(req: NextRequest) {
  // Proxies a metered third-party API key — without a limit anyone can
  // exhaust the Mapy.cz quota and break checkout address autocomplete.
  if (!(await rateLimit(`geocode:${getClientIp(req)}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ items: [] });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  const apiKey = process.env.MAPY_CZ_API_KEY;

  if (!query || query.length < 3 || !apiKey) {
    return NextResponse.json({ items: [] });
  }

  try {
    const url = new URL("https://api.mapy.cz/v1/suggest");
    url.searchParams.set("query", query);
    url.searchParams.set("lang", "cs");
    url.searchParams.set("limit", "5");
    url.searchParams.set("type", "regional.address");
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return NextResponse.json({ items: [] });

    const json = await res.json();
    // Mapy.cz's own `label` field is a generic category name ("Adresa"),
    // NOT the address text — the actual street+number is in `name`, and
    // `zip`/`regionalStructure` carry the rest. Confirmed by hitting the
    // live API directly (see conversation) after the wrong assumption here
    // made every suggestion literally display as "Adresa".
    const items: Suggestion[] = (json?.items ?? [])
      .map((item: {
        name?: string;
        zip?: string;
        regionalStructure?: { name: string; type: string }[];
      }) => {
        const municipality = item.regionalStructure?.find((r) => r.type === "regional.municipality")?.name;
        const street = item.name ?? "";
        const city = municipality ?? "";
        return {
          label: [street, city].filter(Boolean).join(", "),
          street,
          city,
          zip: item.zip ?? "",
        };
      })
      .filter((s: Suggestion) => s.label);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/geocode/suggest error:", err);
    return NextResponse.json({ items: [] });
  }
}
