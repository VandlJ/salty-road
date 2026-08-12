"use client";

import SectionHeading from "@/components/section-heading";
import { Link } from "@/i18n/routing";

// Model withdrawal form per § 1820 odst. 1 písm. f) NOZ / Annex I(B) of
// Directive 2011/83/EU — has to be directly available to the consumer, not
// just sent on request. Kept as a fillable, printable page rather than a
// static PDF asset so it stays trivial to keep in sync with the seller's
// actual name/address if those ever change.
export default function WithdrawalFormPage() {
  return (
    <section className="flex-1 bg-transparent text-white px-4 pt-6 md:pt-10 pb-12 max-w-2xl mx-auto w-full print:pt-0">
      <div className="flex items-start justify-between gap-4 mb-8 print:hidden">
        <SectionHeading as="h1" size="lg">
          Vzorový formulář pro odstoupení od smlouvy
        </SectionHeading>
        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 px-4 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold text-sm uppercase tracking-wide cursor-pointer"
        >
          Vytisknout / uložit jako PDF
        </button>
      </div>

      <p className="text-gray-400 text-sm mb-8 print:hidden">
        Tento formulář vyplňte a zašlete zpět pouze v případě, že chcete odstoupit od smlouvy. Podrobnosti a
        lhůty najdete v{" "}
        <Link href="/shop/terms#odstoupeni-od-smlouvy" className="underline hover:text-white transition-colors">
          obchodních podmínkách
        </Link>
        .
      </p>

      <div className="text-gray-300 text-base leading-relaxed font-light space-y-6 border border-gray-800 rounded-sm p-6 bg-white/[0.02] print:border-none print:bg-transparent print:text-black print:p-0">
        <p>Adresát: David Šmídmajer, Mírová 1013, Prachatice, 38301, e-mail: shop@saltyroad.cz</p>

        <p>
          Oznamuji/oznamujeme (*), že tímto odstupuji/odstupujeme (*) od smlouvy o nákupu tohoto zboží (*) /
          o poskytnutí těchto služeb (*):
        </p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p>Datum objednání (*) / datum obdržení (*):</p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p>Číslo objednávky a variabilní symbol:</p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p>Jméno a příjmení spotřebitele/spotřebitelů:</p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p>Adresa spotřebitele/spotřebitelů:</p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p>Číslo bankovního účtu pro vrácení platby (nepovinné):</p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p>Podpis spotřebitele/spotřebitelů (pouze pokud je tento formulář zasílán v listinné podobě):</p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p>Datum:</p>
        <p className="border-b border-gray-600 print:border-black h-8" />

        <p className="text-sm text-gray-500 print:text-gray-700">(*) Nehodící se škrtněte nebo údaje doplňte.</p>
      </div>
    </section>
  );
}
