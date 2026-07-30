import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Suggestion = {
  label: string;
  street: string;
  city: string;
};

// Server-side proxy for Mapy.cz Suggest API (https://developer.mapy.cz/)
// keeps the API key out of client bundles. Requires MAPY_CZ_API_KEY (free
// tier, no billing) — without it this endpoint just returns an empty list
// and the checkout address fields silently fall back to plain manual entry,
// so a missing key never blocks checkout.
export async function GET(req: NextRequest) {
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
    const items: Suggestion[] = (json?.items ?? [])
      .map((item: { name?: string; label?: string; regionalStructure?: { name: string; type: string }[] }) => {
        const municipality = item.regionalStructure?.find((r) => r.type === "regional.municipality")?.name;
        return {
          label: item.label ?? item.name ?? "",
          street: item.name ?? "",
          city: municipality ?? "",
        };
      })
      .filter((s: Suggestion) => s.label);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/geocode/suggest error:", err);
    return NextResponse.json({ items: [] });
  }
}
