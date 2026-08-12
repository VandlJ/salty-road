"use client";

import { useLocale } from "next-intl";
import SectionHeading from "@/components/section-heading";
import { Link } from "@/i18n/routing";

const FIELD_ROW = "border-b border-gray-600 print:border-black h-8";

// Model withdrawal form per § 1820 odst. 1 písm. f) NOZ / Annex I(B) of
// Directive 2011/83/EU — has to be directly available to the consumer, not
// just sent on request. Kept as a fillable, printable page rather than a
// static PDF asset so it stays trivial to keep in sync with the seller's
// actual name/address if those ever change.
function CsForm() {
  return (
    <>
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
        <p className={FIELD_ROW} />

        <p>Datum objednání (*) / datum obdržení (*):</p>
        <p className={FIELD_ROW} />

        <p>Číslo objednávky a variabilní symbol:</p>
        <p className={FIELD_ROW} />

        <p>Jméno a příjmení spotřebitele/spotřebitelů:</p>
        <p className={FIELD_ROW} />

        <p>Adresa spotřebitele/spotřebitelů:</p>
        <p className={FIELD_ROW} />

        <p>Číslo bankovního účtu pro vrácení platby (nepovinné):</p>
        <p className={FIELD_ROW} />

        <p>Podpis spotřebitele/spotřebitelů (pouze pokud je tento formulář zasílán v listinné podobě):</p>
        <p className={FIELD_ROW} />

        <p>Datum:</p>
        <p className={FIELD_ROW} />

        <p className="text-sm text-gray-500 print:text-gray-700">(*) Nehodící se škrtněte nebo údaje doplňte.</p>
      </div>
    </>
  );
}

function EnForm() {
  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-8 print:hidden">
        <SectionHeading as="h1" size="lg">
          Model withdrawal form
        </SectionHeading>
        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 px-4 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold text-sm uppercase tracking-wide cursor-pointer"
        >
          Print / save as PDF
        </button>
      </div>

      <p className="text-gray-400 text-sm mb-8 print:hidden">
        Complete and return this form only if you wish to withdraw from the contract. Details and deadlines
        are in the{" "}
        <Link href="/shop/terms#withdrawal" className="underline hover:text-white transition-colors">
          terms of business
        </Link>
        .
      </p>

      <div className="text-gray-300 text-base leading-relaxed font-light space-y-6 border border-gray-800 rounded-sm p-6 bg-white/[0.02] print:border-none print:bg-transparent print:text-black print:p-0">
        <p>Addressee: David Šmídmajer, Mírová 1013, Prachatice, 38301, Czech Republic, email: shop@saltyroad.cz</p>

        <p>
          I/we (*) hereby give notice that I/we (*) withdraw from my/our (*) contract of sale of the following
          goods (*) / for the supply of the following service (*):
        </p>
        <p className={FIELD_ROW} />

        <p>Ordered on (*) / received on (*):</p>
        <p className={FIELD_ROW} />

        <p>Order number and variable symbol:</p>
        <p className={FIELD_ROW} />

        <p>Name of consumer(s):</p>
        <p className={FIELD_ROW} />

        <p>Address of consumer(s):</p>
        <p className={FIELD_ROW} />

        <p>Bank account number for the refund (optional):</p>
        <p className={FIELD_ROW} />

        <p>Signature of consumer(s) (only if this form is sent on paper):</p>
        <p className={FIELD_ROW} />

        <p>Date:</p>
        <p className={FIELD_ROW} />

        <p className="text-sm text-gray-500 print:text-gray-700">(*) Delete as appropriate or fill in.</p>
      </div>
    </>
  );
}

export default function WithdrawalFormPage() {
  const locale = useLocale();

  return (
    <section className="flex-1 bg-transparent text-white px-4 pt-6 md:pt-10 pb-12 max-w-2xl mx-auto w-full print:pt-0">
      {locale === "en" ? <EnForm /> : <CsForm />}
    </section>
  );
}
