import { ImageResponse } from "next/og";
import { getShopProduct } from "@/lib/shopProduct";
import { formatPrice } from "@/lib/formatPrice";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getShopProduct(slug);

  if (!product || !product.active || product.giftOnly || product.variants.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#0a0a0a",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 64,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          Salty Road
        </div>
      ),
      size
    );
  }

  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const hasVaryingPrice = new Set(product.variants.map((v) => v.price)).size > 1;
  const photo =
    product.photoMode === "per_variant"
      ? product.variants.find((v) => v.images.length > 0)?.images[0]
      : product.photos[0];

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0a" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders via satori, not next/image
          <img src={photo} width={630} height={630} style={{ objectFit: "cover" }} alt="" />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 60,
            color: "#fff",
            flex: 1,
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 800, textTransform: "uppercase", lineHeight: 1.1 }}>
            {product.name}
          </div>
          <div style={{ display: "flex", width: 64, height: 4, background: "#dc2626", margin: "24px 0" }} />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            {hasVaryingPrice ? `od ${formatPrice(minPrice)}` : formatPrice(minPrice)}
          </div>
        </div>
      </div>
    ),
    size
  );
}
