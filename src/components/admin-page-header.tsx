"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

// The title + "back to admin" row that opened all eight admin subpages.
// Copy-pasted, it had already produced three variants that differ only by
// accident: `items-center` vs `items-start sm:items-center`, `gap-4` vs
// `gap-3 sm:gap-4`, and one page's link stretching full-width on mobile.
export default function AdminPageHeader({
  title,
  count,
  eyebrow,
  subtitle,
}: {
  title: string;
  /** Optional tally shown next to the title, e.g. the number of orders. */
  count?: number;
  /** Small brand-coloured line under the title, e.g. which edition is being edited. */
  eyebrow?: string;
  subtitle?: string;
}) {
  const t = useTranslations("AdminHubPage");

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-md">
            {title}
            {count !== undefined && <span className="text-gray-400 text-2xl ml-2">({count})</span>}
          </h1>
          {eyebrow && (
            <p className="text-brand text-xs font-bold uppercase tracking-widest mt-1">{eyebrow}</p>
          )}
        </div>
        <Link
          href="/admin"
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-transparent border border-gray-600 text-gray-300 font-bold uppercase tracking-wider text-sm hover:bg-gray-800 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          {t("backToAdmin")}
        </Link>
      </div>
      {subtitle && <p className="text-gray-400 text-sm mt-3">{subtitle}</p>}
    </div>
  );
}
