"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import SectionHeading from "@/components/section-heading";
import QuantityStepper from "@/components/quantity-stepper";
import Skeleton from "@/components/skeleton";
import { formatPrice } from "@/lib/formatPrice";
import { useCartStore } from "@/lib/cartStore";
import type { MerchProduct, MerchVariant } from "@/types/merch";

export default function ProductDetailPage() {
  const t = useTranslations("ShopPage");
  const params = useParams<{ slug: string }>();
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<MerchProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");

  // "Notify me when in stock" — shown instead of Add to Cart when the
  // selected variant has 0 quantity.
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyName, setNotifyName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  // Touch-drag swipe for the gallery (mobile). Follows the finger 1:1
  // during the drag (no transition), then either commits to goToPhoto
  // (which re-triggers the normal .gallery-slide-* animation via the
  // photoIndex key change) or snaps back if the drag didn't cross the
  // threshold.
  const touchStartX = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/merch/products/${params.slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load product");
        const data: MerchProduct = await res.json();
        setProduct(data);
        setSelectedSku(data.variants.find((v) => v.quantity > 0)?.sku ?? data.variants[0]?.sku ?? null);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug]);

  // Reset to the first photo whenever the selected variant changes — an
  // index from the previous variant's gallery can be out of range for the
  // new one (per-variant photo mode).
  useEffect(() => {
    setPhotoIndex(0);
    setNotifyOpen(false);
    setNotifySent(false);
    setNotifyError(null);
  }, [selectedSku]);

  const selectedVariant: MerchVariant | undefined = product?.variants.find(
    (v) => v.sku === selectedSku
  );

  // Shared mode: same photos regardless of which size/variant is picked.
  // Per-variant mode: the selected variant's own photos (e.g. different
  // colors need different photos). Size chart, if set, is always appended
  // as the last slide.
  const variantPhotos =
    product?.photoMode === "per_variant" ? selectedVariant?.images ?? [] : product?.photos ?? [];
  const photos = product?.sizeChartImage ? [...variantPhotos, product.sizeChartImage] : variantPhotos;
  const isSizeChartSlide = product?.sizeChartImage != null && photoIndex === photos.length - 1;

  function goToPhoto(index: number, dir?: "next" | "prev") {
    const wrapped = ((index % photos.length) + photos.length) % photos.length;
    setSlideDir(dir ?? (wrapped > photoIndex ? "next" : "prev"));
    setPhotoIndex(wrapped);
  }

  const SWIPE_THRESHOLD = 50;

  function onTouchStart(e: React.TouchEvent) {
    if (photos.length <= 1) return;
    touchStartX.current = e.touches[0].clientX;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    setDragX(e.touches[0].clientX - touchStartX.current);
  }

  function onTouchEnd() {
    if (touchStartX.current === null) return;
    if (dragX <= -SWIPE_THRESHOLD) {
      goToPhoto(photoIndex + 1, "next");
    } else if (dragX >= SWIPE_THRESHOLD) {
      goToPhoto(photoIndex - 1, "prev");
    }
    touchStartX.current = null;
    setDragging(false);
    setDragX(0);
  }

  function handleAddToCart() {
    if (!product || !selectedVariant) return;
    addItem({
      sku: selectedVariant.sku,
      productSlug: product.slug,
      name: product.name,
      variantLabel: selectedVariant.label,
      unitPrice: selectedVariant.price,
      qty,
      image: variantPhotos[0] ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function handleNotifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant) return;
    setNotifySubmitting(true);
    setNotifyError(null);
    try {
      const res = await fetch("/api/merch/stock-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: selectedVariant.sku,
          customerName: notifyName.trim(),
          customerEmail: notifyEmail.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setNotifyError(
          json?.error === "invalid_email" ? t("checkoutErrorInvalidEmail") : t("notifyError")
        );
        return;
      }
      setNotifySent(true);
      setNotifyName("");
      setNotifyEmail("");
    } catch (err) {
      console.error(err);
      setNotifyError(t("notifyError"));
    } finally {
      setNotifySubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="flex-1 bg-black text-white px-4 pt-6 md:pt-10 pb-12" aria-hidden="true">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-4 w-24 mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <Skeleton className="h-9 w-2/3 md:col-start-2 md:row-start-1" />

            <Skeleton className="aspect-[4/5] md:col-start-1 md:row-start-1 md:row-span-2" />

            <div className="flex flex-col gap-6 md:col-start-2 md:row-start-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-32" />
              </div>

              <Skeleton className="h-12 w-full sm:w-48" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (notFound || !product) {
    return (
      <section className="flex-1 bg-black text-white px-4 py-24 flex flex-col items-center justify-center gap-6">
        <p className="text-gray-400 font-bold">{t("notFound")}</p>
        <Link href="/shop" className="underline text-white hover:text-gray-300">
          {t("backToShop")}
        </Link>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-black text-white px-4 pt-6 md:pt-10 pb-12">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/shop"
          className="group inline-flex items-center gap-2 mb-8 text-sm font-medium uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          {t("backToShop")}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <SectionHeading as="h1" align="left" className="md:col-start-2 md:row-start-1">
            {product.name}
          </SectionHeading>

          <div className="md:col-start-1 md:row-start-1 md:row-span-2 flex flex-col gap-3">
            <div
              className="relative aspect-[4/5] bg-black border border-gray-700 rounded-sm overflow-hidden"
              style={{ touchAction: "pan-y" }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {photos.length > 0 ? (
                <div
                  key={photoIndex}
                  className={`relative w-full h-full ${isSizeChartSlide ? "bg-white" : ""} ${dragging ? "" : slideDir === "next" ? "gallery-slide-next" : "gallery-slide-prev"}`}
                  style={dragging ? { transform: `translateX(${dragX}px)` } : undefined}
                >
                  <Image
                    src={photos[photoIndex]}
                    alt={
                      isSizeChartSlide
                        ? t("sizeChartAlt", { name: product.name })
                        : `${product.name} — ${selectedVariant?.label ?? ""}`
                    }
                    fill
                    // Lifestyle photos fill the frame edge-to-edge; the size
                    // chart (a flat table image, not a photo) needs the
                    // whole thing visible instead of cropped, so it gets the
                    // contain+white-plate treatment just for that one slide.
                    className={isSizeChartSlide ? "object-contain p-8 sm:p-12" : "object-cover"}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={photoIndex === 0}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 italic">
                  {product.name}
                </div>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goToPhoto(photoIndex - 1, "prev")}
                    aria-label={t("previousPhoto")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPhoto(photoIndex + 1, "next")}
                    aria-label={t("nextPhoto")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {photos.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => {
                  const isChart = product.sizeChartImage != null && i === photos.length - 1;
                  return (
                    <button
                      key={url + i}
                      type="button"
                      onClick={() => goToPhoto(i)}
                      aria-label={t("goToPhoto", { index: i + 1 })}
                      aria-current={i === photoIndex}
                      className={`relative w-14 h-14 shrink-0 rounded-sm overflow-hidden border-2 transition-colors cursor-pointer ${isChart ? "bg-white" : "bg-black"} ${
                        i === photoIndex ? "border-white" : "border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      <Image src={url} alt="" fill className={isChart ? "object-contain p-1" : "object-cover"} sizes="56px" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 md:col-start-2 md:row-start-2">
            <p className="text-gray-300 font-light leading-relaxed">{product.description}</p>

            {selectedVariant && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  {t("price")}
                </span>
                <span className="text-2xl font-bold text-white">
                  {formatPrice(selectedVariant.price)}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold uppercase tracking-wide text-gray-400">
                {t("selectVariant")}
              </span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const outOfStock = variant.quantity <= 0;
                  const isSelected = variant.sku === selectedSku;
                  return (
                    <button
                      key={variant.sku}
                      type="button"
                      onClick={() => setSelectedSku(variant.sku)}
                      className={`px-4 py-2 border-2 rounded-sm text-sm font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? outOfStock
                            ? "border-gray-400 bg-gray-700 text-gray-300"
                            : "border-white bg-white text-black"
                          : outOfStock
                            ? "border-gray-700 text-gray-500 hover:border-gray-500"
                            : "border-gray-500 text-white hover:border-white"
                      }`}
                    >
                      {variant.label}
                      {outOfStock && ` (${t("outOfStock")})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedVariant && selectedVariant.quantity <= 0 ? (
              <div className="flex flex-col gap-3">
                {notifySent ? (
                  <div className="flex items-center gap-2 text-green-500 font-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {t("notifySent")}
                  </div>
                ) : notifyOpen ? (
                  <form onSubmit={handleNotifySubmit} className="flex flex-col gap-3 p-4 border-2 border-gray-600 rounded-sm bg-white/5">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="notify-name" className="text-xs text-gray-400 uppercase tracking-wide">
                        {t("checkoutName")}
                      </label>
                      <input
                        id="notify-name"
                        type="text"
                        value={notifyName}
                        onChange={(e) => setNotifyName(e.target.value)}
                        required
                        maxLength={100}
                        className="w-full px-3 py-2 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="notify-email" className="text-xs text-gray-400 uppercase tracking-wide">
                        {t("checkoutEmail")}
                      </label>
                      <input
                        id="notify-email"
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        required
                        maxLength={200}
                        className="w-full px-3 py-2 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
                      />
                    </div>
                    {notifyError && (
                      <div className="text-red-400 text-sm font-bold">{notifyError}</div>
                    )}
                    <button
                      type="submit"
                      disabled={notifySubmitting}
                      className="px-6 py-2.5 bg-white text-black font-bold text-sm tracking-widest uppercase rounded-sm hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {notifySubmitting ? t("notifySubmitting") : t("notifySubmit")}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotifyOpen(true)}
                    className="px-8 py-3 rounded-sm font-bold text-base tracking-widest uppercase border-2 border-white text-white hover:bg-white hover:text-black transition-all duration-200 cursor-pointer"
                  >
                    {t("notifyWhenInStock")}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="qty" className="text-sm font-bold uppercase tracking-wide text-gray-400">
                    {t("quantity")}
                  </label>
                  <QuantityStepper
                    id="qty"
                    value={qty}
                    onChange={setQty}
                    min={1}
                    max={selectedVariant?.quantity ?? 1}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.quantity <= 0}
                  className={`flex items-center justify-center gap-2 px-8 py-3 rounded-sm font-bold text-base tracking-widest uppercase shadow-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    added
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-white border-white text-black hover:bg-gray-200"
                  }`}
                >
                  {added && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  {added ? t("addedToCart") : t("addToCart")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
