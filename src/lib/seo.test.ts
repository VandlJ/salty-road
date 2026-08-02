import { describe, it, expect } from "vitest";
import { buildAlternates, canonicalUrl, jsonLdScript, SITE_URL, LOCALES } from "@/lib/seo";

describe("buildAlternates", () => {
  it("builds a URL per locale plus x-default", () => {
    const alternates = buildAlternates("/shop");
    for (const locale of LOCALES) {
      expect(alternates[locale]).toBe(`${SITE_URL}/${locale}/shop`);
    }
    expect(alternates["x-default"]).toBe(`${SITE_URL}/cs/shop`);
  });

  it("handles the homepage's empty path", () => {
    const alternates = buildAlternates("");
    expect(alternates.cs).toBe(`${SITE_URL}/cs`);
  });
});

describe("canonicalUrl", () => {
  it("joins site, locale, and path", () => {
    expect(canonicalUrl("en", "/shop/hoodie-classic")).toBe(
      `${SITE_URL}/en/shop/hoodie-classic`
    );
  });
});

describe("jsonLdScript", () => {
  it("escapes '<' so a value can't break out of the surrounding <script> tag", () => {
    const malicious = { description: "</script><script>alert(1)</script>" };
    const output = jsonLdScript(malicious);
    // Only "<" needs escaping to break the closing tag match — ">" is left
    // alone, matching what the source actually does.
    expect(output).not.toContain("</script>");
    expect(output).toContain("\\u003c/script>");
  });

  it("still produces valid JSON content once unescaped", () => {
    const data = { name: "Test", price: 100 };
    const output = jsonLdScript(data);
    expect(JSON.parse(output.replace(/\\u003c/g, "<"))).toEqual(data);
  });
});
