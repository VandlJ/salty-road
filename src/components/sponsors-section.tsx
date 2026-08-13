"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import SectionHeading from "@/components/section-heading";
import type { Sponsor } from "@/content/editions";

export default function SponsorsSection({
  sponsors,
  pressArticleUrl,
}: {
  sponsors: Sponsor[];
  pressArticleUrl?: string;
}) {
  const t = useTranslations("InfoPage");

  if (sponsors.length === 0) return null;

  return (
    <section id="sponsors" className="reveal-on-scroll bg-transparent text-white px-4 pt-12 pb-20 max-w-5xl mx-auto scroll-mt-24 text-center overflow-hidden">
      <div className="space-y-8">
        <SectionHeading as="h2" size="lg">{t("sponsorsTitle")}</SectionHeading>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-16 gap-y-16 items-center justify-items-center max-w-5xl mx-auto px-6 sm:px-14 py-12 overflow-hidden bg-white border border-gray-800 shadow-lg rounded-sm">
          {sponsors.map((s) => (
            <div key={s.alt} className="relative w-full h-14 sm:h-20">
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes="(max-width: 640px) 33vw, 260px"
                className={`object-contain ${s.scaleClass ?? ""}`}
              />
            </div>
          ))}
        </div>

        {/* Media/press credit, not a paying sponsor — kept as its own
            full-width row instead of the sm:col-span hack it used inside
            the 3-col grid before this pass. Own white card (logo assets are
            designed for light backgrounds, same as the grid above). Links
            out to their coverage of the event — the logo alone doesn't
            explain the connection to a first-time visitor. */}
        {/* The "read the article" affordance only appears once that edition
            actually has coverage to link to; until then it's just the logo. */}
        <MediaPartner
          pressArticleUrl={pressArticleUrl}
          ctaLabel={t("mediaArticleCta")}
        />
      </div>
    </section>
  );
}

function MediaPartner({
  pressArticleUrl,
  ctaLabel,
}: {
  pressArticleUrl?: string;
  ctaLabel: string;
}) {
  const logo = (
    <div className="bg-white border border-gray-800 shadow-lg rounded-sm px-8 py-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl">
      <div className="relative w-40 h-10 sm:w-52 sm:h-14">
        <Image src="/sponsors/denik.webp" alt="Deník" fill sizes="208px" className="object-contain" />
      </div>
    </div>
  );

  if (!pressArticleUrl) return <div className="inline-flex">{logo}</div>;

  return (
    <a
      href={pressArticleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex flex-col items-center gap-2"
    >
      {logo}
      <span className="inline-flex items-center gap-1 text-gray-400 text-xs uppercase tracking-widest group-hover:text-white transition-colors">
        {ctaLabel}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
          <path d="M7 17L17 7" />
          <path d="M7 7h10v10" />
        </svg>
      </span>
    </a>
  );
}
