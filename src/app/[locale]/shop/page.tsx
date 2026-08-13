import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import SectionHeading from "@/components/section-heading";
import { formatPrice } from "@/lib/formatPrice";
import { getShopProductList } from "@/lib/shopProduct";
import { toLocale } from "@/i18n/locale";

// Stock/active-product state changes at any time — must not be frozen into
// a build-time static page (the rest of the [locale] tree became statically
// eligible once setRequestLocale was added, and this page would otherwise
// get swept into that).
export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "ShopPage" });
  const products = await getShopProductList();

  return (
    <section className="flex-1 bg-black text-white px-4 pt-4 md:pt-6 pb-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-4 md:mb-6 gap-2 text-center">
          <SectionHeading as="h1" size="lg">
            {t("title")}
          </SectionHeading>
          <p className="text-gray-300 font-light max-w-xl text-sm sm:text-base">{t("subtitle")}</p>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 border border-dashed border-gray-800 rounded-sm">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="M3.3 7 12 12l8.7-5" />
              <path d="M12 22V12" />
            </svg>
            <p className="text-gray-400 font-light text-base max-w-sm text-center">
              {t("noProducts")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, index) => {
              const prices = product.variants.map((v) => v.price);
              const minPrice = Math.min(...prices);
              const hasVaryingPrice = new Set(prices).size > 1;
              const thumbnail =
                product.photoMode === "per_variant"
                  ? product.variants.find((v) => v.images.length > 0)?.images[0]
                  : product.photos[0];
              const inStock = product.variants.some((v) => v.quantity > 0);

              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  data-testid="product-card"
                  data-slug={product.slug}
                  className="group flex flex-col rounded-sm border border-gray-800 bg-white/[0.02] overflow-hidden hover:border-gray-500 hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-2xl"
                >
                  {/* Full-bleed cover crop, no white plate — these are
                      lifestyle photos of people wearing the product, not
                      isolated flat-lay renders, so a portrait-ish crop shows
                      more of the actual garment than a padded square would. */}
                  <div className="relative aspect-[4/5] bg-black overflow-hidden">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={product.name}
                        fill
                        priority={index < 4}
                        fetchPriority={index < 4 ? "high" : undefined}
                        // Default quality (75) is overkill for a grid
                        // thumbnail — 65 is already an allowed value in
                        // next.config.ts and shaves bytes with no visible
                        // difference at this size.
                        quality={65}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 italic text-sm">
                        {product.name}
                      </div>
                    )}

                    {!inStock && (
                      <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 border border-white/20 text-[10px] uppercase tracking-widest text-white font-bold rounded-sm">
                        {t("outOfStock")}
                      </span>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col gap-0.5">
                    <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">{product.name}</h2>
                    <span className="text-base sm:text-lg text-white font-bold">
                      {hasVaryingPrice ? t("priceFrom", { price: formatPrice(minPrice) }) : formatPrice(minPrice)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
