"use client";

import React from "react";
import { useLocale } from "next-intl";
import SectionHeading from "@/components/section-heading";
import { Link } from "@/i18n/routing";

// Legally the contract is always governed by Czech law (Czech seller,
// Czech consumer-protection law) regardless of which language the buyer
// reads it in — the English text below is a translation for the buyer's
// convenience, not a separate legal document.

const CS_SECTIONS = [
  { id: "reklamacni-rad", label: "Reklamační řád" },
  { id: "zarucni-podminky", label: "Záruční podmínky" },
  { id: "vyrizovani-reklamaci", label: "Vyřizování reklamací" },
  { id: "adresa-pro-zasilani-reklamaci", label: "Adresa pro zasílání reklamací" },
  { id: "zaverecna-ustanoveni-reklamace", label: "Závěrečná ustanovení" },
  { id: "obchodni-podminky", label: "Obchodní podmínky" },
  { id: "cenove-podminky", label: "Cenové podmínky" },
  { id: "podminky-uhrady", label: "Podmínky a možnosti úhrady" },
  { id: "podminky-dodani", label: "Podmínky dodání" },
  { id: "odstoupeni-od-smlouvy", label: "Odstoupení od smlouvy do 14 dnů" },
  { id: "zruseni-objednavky", label: "Zrušení objednávky před úhradou" },
  { id: "mimosoudni-reseni-sporu", label: "Mimosoudní řešení sporů" },
];

const EN_SECTIONS = [
  { id: "complaints-procedure", label: "Complaints procedure" },
  { id: "warranty-terms", label: "Liability for defects" },
  { id: "handling-complaints", label: "Handling complaints" },
  { id: "complaints-address", label: "Address for complaints" },
  { id: "final-provisions", label: "Final provisions" },
  { id: "terms-of-business", label: "Terms of business" },
  { id: "pricing-terms", label: "Pricing terms" },
  { id: "payment-terms", label: "Payment terms and options" },
  { id: "delivery-terms", label: "Delivery terms" },
  { id: "withdrawal", label: "14-day right of withdrawal" },
  { id: "cancelling-an-order", label: "Cancelling an order before payment" },
  { id: "dispute-resolution", label: "Out-of-court dispute resolution" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="space-y-4 scroll-mt-24">
      <SectionHeading>{title}</SectionHeading>
      <div className="text-gray-300 text-base leading-relaxed font-light space-y-4">{children}</div>
    </div>
  );
}

function K({ children }: { children: React.ReactNode }) {
  return <strong className="text-white font-bold">{children}</strong>;
}

function Nav({ sections, label }: { sections: { id: string; label: string }[]; label: string }) {
  return (
    <nav className="mb-12 border border-gray-800 rounded-sm p-4 bg-white/[0.02]">
      <span className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">{label}</span>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-gray-300 hover:text-white underline underline-offset-2 text-sm transition-colors">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function CsTerms() {
  return (
    <>
      <SectionHeading as="h1" size="lg" className="mb-8">
        Obchodní a reklamační podmínky
      </SectionHeading>

      <Nav sections={CS_SECTIONS} label="Obsah" />

      <div className="space-y-12">
        <Section id="reklamacni-rad" title="Reklamační řád">
          <p>
            Tento reklamační řád byl zpracován v souladu s ustanoveními zákona č. 89/2012 Sb., občanského
            zákoníku, a zákona č. 634/1992 Sb., o ochraně spotřebitele, v aktuálním znění (dále jen „zákon“) a
            vztahuje se na zboží, u něhož jsou v záruční době uplatňována práva kupujícího z odpovědnosti za
            vady (dále jen <K>„reklamace“</K>) a které kupující (spotřebitel ve smyslu § 419 zákona č. 89/2012
            Sb. v aktuálním znění) zakoupil u prodávajícího (<K>David Šmídmajer, Mírová 1013, Prachatice,
            38301</K>).
          </p>
        </Section>

        <Section id="zarucni-podminky" title="Záruční podmínky">
          <p>
            Prodávající odpovídá kupujícímu-spotřebiteli za to, že zboží při převzetí nemá vady, a odpovídá i
            za vadu, která se na zboží projeví v době <K>dvou let od převzetí</K> (práva z vadného plnění dle §
            2161 a násl. zákona č. 89/2012 Sb., občanského zákoníku). Nejedná se o smluvně poskytovanou záruku
            za jakost nad rámec zákona, pokud prodávající na daňovém dokladu výslovně neuvede jinak.
          </p>
          <p>
            Vykazuje-li objednané zboží zjevné nedostatky (například porušený transportní obal) již při
            přebírání zboží, <K>má kupující právo zboží nepřevzít</K>. V takovém případě bude zboží zasláno zpět
            prodávajícímu. Ten má povinnost vše uvést do pořádku a zboží kupujícímu odeslat znovu v co
            nejkratším možném termínu.
          </p>
          <p>
            V případě, že se při užívání zboží vyskytnou v záruční době vady zboží, může kupující v souladu se
            zákonem a tímto reklamačním řádem uplatňovat reklamaci. <K>Kupující je oprávněn odstoupit od kupní
            smlouvy</K> ve všech případech stanovených zákonem. Odstoupení nabývá účinnosti dnem přijetí zboží k
            reklamaci prodávajícím. V případě odstoupení od smlouvy se smlouva od počátku ruší a smluvní strany
            jsou povinny navrátit si všechna plnění z rušené smlouvy. Kupující musí prodávajícímu vydat vše, co
            na základě kupní smlouvy získal. Pokud to již není dobře možné (např. v mezidobí bylo zboží
            zničeno nebo spotřebováno), musí kupující poskytnout peněžitou náhradu jako protihodnotu toho, co
            již nemůže být vydáno. Pokud je vrácené zboží poškozeno jen částečně, může prodávající uplatnit na
            spotřebiteli právo na náhradu škody a započíst svůj nárok na vracenou kupní cenu. Prodávající
            kupujícímu v takovém případě vrací jen takto sníženou kupní cenu.
          </p>
        </Section>

        <Section id="vyrizovani-reklamaci" title="Vyřizování reklamací">
          <p>
            Místem vyřizování reklamace se rozumí kancelář prodávajícího. V případě zasílání reklamovaného
            zboží prodávajícímu se za den přijetí reklamace považuje den obdržení poslední součásti zboží
            prodávajícím. A za den vyřízení reklamace se považuje den předání vyřízené reklamace přepravní
            službě. V tomto případě je kupující také povinen zaslat reklamované zboží spolu s veškerým
            příslušenstvím. Kupující je povinen zboží připravit k přepravě tak, aby při ní nedošlo k poškození
            zboží, je také povinen zboží označit dle jeho povahy (křehké atd.). Při této přepravě je za řádné
            doručení k prodávajícímu zodpovědný kupující, který uplatňuje reklamaci. Reklamace včetně
            odstranění vady musí být vyřízena bez zbytečného odkladu, <K>nejpozději do 30 dnů</K> ode dne uplatnění
            reklamace, pokud se prodávající s kupujícím nedohodnou na delší lhůtě. Po uplynutí této lhůty se
            kupujícímu přiznávají stejná práva, jako by se jednalo o neodstranitelnou vadu.
          </p>
          <p>
            Kupující je povinen převzít si vyřízenou reklamaci co nejdříve na výzvu prodávajícího, případně
            dohodnout podmínky přepravy s kupujícím. Prodávající označí reklamaci za neoprávněnou v případě,
            že vada vznikla špatnou či neodbornou obsluhou, nepřiměřeným zacházením či použitím. Práva z
            odpovědnosti za vady věci, pro které platí záruční doba, zaniknou, nebyla-li uplatněna v záruční
            době.
          </p>
        </Section>

        <Section id="adresa-pro-zasilani-reklamaci" title="Adresa pro zasílání reklamací">
          <p><K>David Šmídmajer, Mírová 1013, Prachatice, 38301</K></p>
          <p>nebo formou Zásilkovny – <K>Z-BOX – Husinecká 1190, Prachatice, 383 01 (id 31381)</K></p>
        </Section>

        <Section id="zaverecna-ustanoveni-reklamace" title="Závěrečná ustanovení">
          <p>Tento reklamační řád vstupuje v platnost dnem <K>1. 8. 2026</K>.</p>
        </Section>

        <Section id="obchodni-podminky" title="Obchodní podmínky">
          <p>
            Provozovatel: <K>David Šmídmajer</K>
            <br />
            se sídlem Mírová 1013, Prachatice, 38301
            <br />
            IČO: <K>22171347</K>
            <br />
            Fyzická osoba podnikající dle živnostenského zákona nezapsaná v obchodním rejstříku.
            <br />
            E-mail:{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>
            <br />
            Telefon:{" "}
            <a href="tel:+420724386935" className="underline hover:text-white transition-colors">
              +420 724 386 935
            </a>
            <br />
            Pro prodej zboží prostřednictvím on-line obchodu umístěného na internetové adrese{" "}
            <a href="https://www.saltyroad.cz/cs/shop" className="underline hover:text-white transition-colors">
              https://www.saltyroad.cz/cs/shop
            </a>
          </p>
          <p>
            Toto jsou závazné obchodní podmínky serveru SaltyRoad.cz (dále jen <K>„Salty Road“</K>). Tyto podmínky
            popisují a upravují vzájemný obchodní vztah mezi provozovatelem Davidem Šmídmajerem na straně
            dodavatele a zákazníkem, návštěvníkem (dále jen „objednatelem“) na straně kupujícího. Tyto
            obchodní podmínky jsou návrhem kupní smlouvy, navazují na cenovou nabídku a obchodní případy s
            využitím komunikačních prostředků na dálku jsou uzavírány v českém jazyce.
          </p>
        </Section>

        <Section id="cenove-podminky" title="Cenové podmínky">
          <p>
            Seznam zboží zobrazovaný na Salty Road je chápán jako návrh kupní smlouvy (dále jen „e-shop“).
            E-shop obsahuje <K>prodejní cenu včetně DPH</K>. V ceně zboží není započítáno dopravné a balné, pokud to
            není výslovně stanoveno u konkrétního zboží jinak. Salty Road si vyhrazuje právo změny cen v
            katalogu. Změna cen bez předchozího upozornění a odsouhlasení objednatelem není možná na již
            potvrzených objednávkách. Poštovné a balné – doporučené psaní. Poštovné je zákazníkům na Salty
            Road účtováno standardně. Ke každé objednávce zboží uskutečněné na Salty Road, kde je účtováno
            poštovné a balné, bude připočtena částka dle aktuálního ceníku v objednávce. Tato částka se skládá
            z poplatku za expedici a poplatku za manipulaci a zabalení zboží.
          </p>
        </Section>

        <Section id="podminky-uhrady" title="Podmínky a možnosti úhrady">
          <p>
            Platba je možná <K>QR kódem</K> obsaženém v e-mailu potvrzujícím objednávku. Zákazník platí zboží z Salty
            Road převodem. Platba běžným bankovním převodem. Úhradu provede zákazník na účet dodavatele
            <K> nejpozději do 5 pracovních dnů</K>. Nedojde-li ke včasnému uhrazení objednávky, je objednávka
            automaticky stornována a objednané zboží vystaveno zpět na e-shop.
          </p>
        </Section>

        <Section id="podminky-dodani" title="Podmínky dodání">
          <p>
            Salty Road vynakládá veškerou snahu na rychlý a hladký průběh expedice. Veškeré zásilky Salty Road
            shopu včetně korespondence jsou zasílány jako doporučené. <K>Standardní termín expedice je do 3
            pracovních dnů</K> od ověření objednávky. <K>Maximální termín expedice je do 7 pracovních dnů</K>. U
            objednávek, které není možné odeslat ve výše uvedeném termínu, lze termín dodání posunout o delší
            dobu, ale pouze se souhlasem zákazníka. Nedodržení termínu expedice dává zákazníkovi právo
            odstoupit od kupní smlouvy a požadovat bezplatné storno jeho objednávky. Toto oznámení musí mít
            písemnou formu a bude zasláno elektronickou poštou na adresu{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>
            .
          </p>
        </Section>

        <Section id="odstoupeni-od-smlouvy" title="Odstoupení od smlouvy do 14 dnů">
          <p>
            V souladu s § 1829 zákona č. 89/2012 Sb., občanského zákoníku, má kupující, který je spotřebitelem
            a smlouvu uzavřel prostřednictvím on-line obchodu (tedy prostředky komunikace na dálku), právo
            <K> odstoupit od kupní smlouvy do 14 dnů</K> od převzetí zboží, a to bez udání důvodu. Toto právo se
            netýká právnických osob ani fyzických osob nakupujících v rámci své podnikatelské činnosti.
          </p>
          <p>
            Pro dodržení lhůty postačí odeslat oznámení o odstoupení od smlouvy poslední den lhůty. Oznámení
            lze zaslat e-mailem na adresu{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>{" "}
            nebo písemně na adresu uvedenou v sekci{" "}
            <a href="#adresa-pro-zasilani-reklamaci" className="underline hover:text-white transition-colors">
              Adresa pro zasílání reklamací
            </a>
            . Kupující v oznámení uvede číslo objednávky, variabilní symbol a případně číslo bankovního účtu
            pro vrácení platby. Kupující může, ale nemusí, použít{" "}
            <Link href="/shop/withdrawal-form" className="underline hover:text-white transition-colors">
              vzorový formulář pro odstoupení od smlouvy
            </Link>
            .
          </p>
          <p>
            Zboží je kupující povinen zaslat zpět prodávajícímu <K>bez zbytečného odkladu, nejpozději do 14
            dnů</K> od odstoupení od smlouvy, a to na vlastní náklady. Zboží by mělo být vráceno nepoškozené,
            neopotřebené a pokud možno v původním obalu.
          </p>
          <p>
            Prodávající vrátí kupujícímu <K>bez zbytečného odkladu, nejpozději do 14 dnů</K> od odstoupení od
            smlouvy všechny peněžní prostředky, které od něj na základě smlouvy přijal (včetně nákladů na
            dodání ve výši odpovídající nejlevnějšímu nabízenému způsobu dodání), stejným způsobem, jakým je
            přijal, případně způsobem, na kterém se strany dohodnou. Prodávající není povinen vrátit přijaté
            peněžní prostředky dříve, než mu kupující zboží předá nebo prokáže, že zboží prodávajícímu odeslal.
          </p>
          <p>
            Právo na odstoupení od smlouvy se v souladu s § 1837 nevztahuje mimo jiné na zboží, které bylo
            upraveno podle přání kupujícího nebo pro jeho osobu (např. zboží s individuálním potiskem na
            zakázku), a na zboží v uzavřeném obalu, které z důvodu ochrany zdraví nebo z hygienických důvodů
            není vhodné vrátit poté, co jej kupující porušil.
          </p>
        </Section>

        <Section id="zruseni-objednavky" title="Zrušení objednávky před úhradou">
          <p>
            Dokud objednávku neuhradíte, můžete ji <K>kdykoli sami zrušit</K> — odkaz na zrušení najdete přímo
            v e-mailu s potvrzením objednávky, případně jej{" "}
            <Link href="/shop/cancel-order" className="underline hover:text-white transition-colors">
              vyplňte zde
            </Link>{" "}
            (budete potřebovat číslo objednávky a variabilní symbol). Zrušením objednávky se rezervované zboží
            ihned vrátí zpět do e-shopu.
          </p>
          <p>
            Objednávky nezaplacené do 5 pracovních dnů jsou navíc automaticky stornovány, viz sekce{" "}
            <a href="#podminky-uhrady" className="underline hover:text-white transition-colors">
              Podmínky a možnosti úhrady
            </a>
            . Jakmile je objednávka uhrazena, je zrušení objednávky možné pouze uplatněním práva na odstoupení
            od smlouvy dle sekce{" "}
            <a href="#odstoupeni-od-smlouvy" className="underline hover:text-white transition-colors">
              Odstoupení od smlouvy do 14 dnů
            </a>
            , případně dohodou s prodávajícím na e-mailu{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>
            .
          </p>
        </Section>

        <Section id="mimosoudni-reseni-sporu" title="Mimosoudní řešení sporů">
          <p>
            V případě, že mezi prodávajícím a kupujícím-spotřebitelem dojde ke vzniku spotřebitelského sporu z
            kupní smlouvy, který se nepodaří vyřešit vzájemnou dohodou, může kupující podat návrh na
            mimosoudní řešení sporu k <K>České obchodní inspekci</K> (Ústřední inspektorát – oddělení ADR, Štěpánská
            567/15, 120 00 Praha 2, IČO: 000 20 869), a to prostřednictvím on-line formuláře dostupného na
            internetových stránkách{" "}
            <a
              href="https://adr.coi.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              adr.coi.cz
            </a>
            .
          </p>
        </Section>
      </div>
    </>
  );
}

function EnTerms() {
  return (
    <>
      <SectionHeading as="h1" size="lg" className="mb-2">
        Terms of Business and Complaints Procedure
      </SectionHeading>
      <p className="text-gray-500 text-sm mb-8">
        This is an English translation provided for convenience. The contract and its terms are governed by
        Czech law; in case of any discrepancy, the{" "}
        {/* Deliberately a fixed cross-locale link to the Czech version specifically, not next-intl's Link
            (which would keep the current "en" locale prefix). */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/cs/shop/terms" className="underline hover:text-white transition-colors">
          Czech version
        </a>{" "}
        prevails.
      </p>

      <Nav sections={EN_SECTIONS} label="Contents" />

      <div className="space-y-12">
        <Section id="complaints-procedure" title="Complaints procedure">
          <p>
            This complaints procedure has been prepared in accordance with Act No. 89/2012 Coll., the Civil
            Code, and Act No. 634/1992 Coll., on Consumer Protection, as amended (together, the{" "}
            <K>&quot;Act&quot;</K>), and applies to goods for which the buyer asserts rights arising from
            defects during the liability period (a <K>&quot;complaint&quot;</K>) and which the buyer (a
            consumer within the meaning of § 419 of Act No. 89/2012 Coll., as amended) purchased from the
            seller (<K>David Šmídmajer, Mírová 1013, Prachatice, 38301, Czech Republic</K>).
          </p>
        </Section>

        <Section id="warranty-terms" title="Liability for defects">
          <p>
            The seller is liable to a consumer buyer for the goods being free of defects on receipt, and
            remains liable for any defect that appears within <K>two years of receipt</K> (statutory liability
            for defects under § 2161 et seq. of Act No. 89/2012 Coll., the Civil Code). This is not a
            contractual quality guarantee beyond what the law requires, unless the seller expressly states
            otherwise on the tax document.
          </p>
          <p>
            If the ordered goods show obvious defects (e.g. damaged transport packaging) already at the time
            of receipt, <K>the buyer has the right to refuse to accept the goods</K>. In such a case the goods
            will be sent back to the seller, who is obliged to put things right and re-send the goods to the
            buyer as soon as reasonably possible.
          </p>
          <p>
            If a defect appears in the goods within the liability period during use, the buyer may make a
            complaint in accordance with the Act and this complaints procedure. <K>The buyer is entitled to
            withdraw from the purchase contract</K> in all cases provided for by law. Withdrawal takes effect
            on the day the seller accepts the goods for the complaint. Where the contract is withdrawn from,
            the contract is cancelled from the outset and both parties must return everything they received
            under it. The buyer must return to the seller everything received under the purchase contract; if
            this is no longer reasonably possible (e.g. the goods were destroyed or consumed in the
            meantime), the buyer must provide monetary compensation as the equivalent of what can no longer be
            returned. If the returned goods are only partially damaged, the seller may claim damages from the
            consumer and set them off against the purchase price to be refunded, in which case the seller
            only refunds the reduced amount.
          </p>
        </Section>

        <Section id="handling-complaints" title="Handling complaints">
          <p>
            Complaints are handled at the seller&apos;s office. Where the goods being complained about are
            sent to the seller, the complaint is considered received on the day the last part of the goods is
            received by the seller, and considered resolved on the day the resolved complaint is handed over
            to the carrier. In this case the buyer must also send all accessories together with the goods,
            prepare the goods for transport so they are not damaged in transit, and mark them appropriately
            (e.g. fragile). The buyer making the complaint is responsible for the goods reaching the seller
            safely during this transport. A complaint, including any repair, must be resolved without undue
            delay, <K>no later than 30 days</K> from the date the complaint was made, unless the seller and
            buyer agree on a longer period. After this period expires, the buyer is granted the same rights as
            if the defect were irreparable.
          </p>
          <p>
            The buyer must collect the resolved complaint as soon as possible after being asked to by the
            seller, or agree on delivery terms with the seller. The seller will mark a complaint as
            unjustified if the defect was caused by improper or unprofessional handling, or by disproportionate
            use. Rights arising from liability for defects, for which the liability period applies, lapse if
            not asserted within that period.
          </p>
        </Section>

        <Section id="complaints-address" title="Address for complaints">
          <p><K>David Šmídmajer, Mírová 1013, Prachatice, 38301, Czech Republic</K></p>
          <p>or via Zásilkovna – <K>Z-BOX – Husinecká 1190, Prachatice, 383 01, Czech Republic (id 31381)</K></p>
        </Section>

        <Section id="final-provisions" title="Final provisions">
          <p>This complaints procedure takes effect on <K>1 August 2026</K>.</p>
        </Section>

        <Section id="terms-of-business" title="Terms of business">
          <p>
            Operator: <K>David Šmídmajer</K>
            <br />
            registered address: Mírová 1013, Prachatice, 38301, Czech Republic
            <br />
            Company ID (IČO): <K>22171347</K>
            <br />
            A sole trader operating under the Trade Licensing Act, not registered in the Commercial Register.
            <br />
            Email:{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>
            <br />
            Phone:{" "}
            <a href="tel:+420724386935" className="underline hover:text-white transition-colors">
              +420 724 386 935
            </a>
            <br />
            For the sale of goods via the online shop located at{" "}
            <a href="https://www.saltyroad.cz/en/shop" className="underline hover:text-white transition-colors">
              https://www.saltyroad.cz/en/shop
            </a>
          </p>
          <p>
            These are the binding terms of business of SaltyRoad.cz (<K>&quot;Salty Road&quot;</K>). These
            terms describe and govern the business relationship between the operator, David Šmídmajer, as
            supplier, and the customer/visitor (the <K>&quot;orderer&quot;</K>) as buyer. These terms of
            business constitute a draft purchase contract, follow on from the price offer, and business
            transacted using means of distance communication is concluded in the Czech language, with this
            English text provided as a translation for convenience.
          </p>
        </Section>

        <Section id="pricing-terms" title="Pricing terms">
          <p>
            The list of goods shown on Salty Road is treated as a draft purchase contract (the{" "}
            <K>&quot;shop&quot;</K>). The shop shows the <K>selling price including VAT</K>. Shipping and
            packaging are not included in the price of the goods unless expressly stated otherwise for a
            specific item. Salty Road reserves the right to change catalogue prices; a price change without
            prior notice and the orderer&apos;s agreement is not possible on already-confirmed orders.
            Shipping and packaging — sent as a registered parcel. Shipping is charged to customers as
            standard. Every order placed on Salty Road that is charged shipping and packaging will have an
            amount added according to the current price list shown in the order, made up of a dispatch fee
            and a handling/packaging fee.
          </p>
        </Section>

        <Section id="payment-terms" title="Payment terms and options">
          <p>
            Payment is possible via <K>QR code</K> included in the order confirmation email. Customers pay
            for Salty Road goods by bank transfer. Payment must reach the supplier&apos;s account
            <K> within 5 business days</K>. If the order is not paid in time, it is automatically cancelled
            and the ordered goods are returned to the shop.
          </p>
        </Section>

        <Section id="delivery-terms" title="Delivery terms">
          <p>
            Salty Road makes every effort for a fast, smooth dispatch process. All Salty Road shop shipments,
            including correspondence, are sent as registered mail. <K>The standard dispatch time is within 3
            business days</K> of order verification. <K>The maximum dispatch time is within 7 business
            days</K>. For orders that cannot be dispatched within the above period, the delivery date may be
            postponed, but only with the customer&apos;s consent. Failure to meet the dispatch deadline gives
            the customer the right to withdraw from the purchase contract and request a free cancellation of
            their order. This notice must be in writing and sent by email to{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>
            .
          </p>
        </Section>

        <Section id="withdrawal" title="14-day right of withdrawal">
          <p>
            In accordance with § 1829 of Act No. 89/2012 Coll., the Civil Code, a buyer who is a consumer and
            concluded the contract via the online shop (i.e. using means of distance communication) has the
            right to <K>withdraw from the purchase contract within 14 days</K> of receiving the goods, without
            giving any reason. This right does not apply to legal entities or to individuals purchasing as
            part of their business activity.
          </p>
          <p>
            It is sufficient to send the withdrawal notice on the last day of the period to meet the deadline.
            The notice can be sent by email to{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>{" "}
            or in writing to the address given in the{" "}
            <a href="#complaints-address" className="underline hover:text-white transition-colors">
              Address for complaints
            </a>{" "}
            section. The buyer should state the order number, variable symbol, and optionally a bank account
            number for the refund in the notice. The buyer may, but does not have to, use the{" "}
            <Link href="/shop/withdrawal-form" className="underline hover:text-white transition-colors">
              model withdrawal form
            </Link>
            .
          </p>
          <p>
            The buyer must send the goods back to the seller <K>without undue delay, no later than 14
            days</K> after withdrawing from the contract, at their own expense. The goods should be returned
            undamaged, unused, and if possible in their original packaging.
          </p>
          <p>
            The seller will refund the buyer <K>without undue delay, no later than 14 days</K> after
            withdrawal, all payments received under the contract (including the cost of the cheapest delivery
            method offered), using the same method the buyer used to pay, unless the parties agree otherwise.
            The seller is not obliged to refund the payment before the buyer has handed over the goods or
            proven that the goods have been sent back to the seller.
          </p>
          <p>
            In accordance with § 1837, the right of withdrawal does not apply, among other things, to goods
            that were customized to the buyer&apos;s wishes or for their person (e.g. goods with an individual
            print made to order), or to sealed goods which are not suitable for return for health protection
            or hygiene reasons once the buyer has broken the seal.
          </p>
        </Section>

        <Section id="cancelling-an-order" title="Cancelling an order before payment">
          <p>
            As long as your order is unpaid, you can <K>cancel it yourself at any time</K> — the cancellation
            link is in your order confirmation email, or you can{" "}
            <Link href="/shop/cancel-order" className="underline hover:text-white transition-colors">
              fill it in here
            </Link>{" "}
            (you&apos;ll need your order number and variable symbol). Cancelling the order releases the
            reserved stock back to the shop immediately.
          </p>
          <p>
            Orders unpaid after 5 business days are also cancelled automatically, see the{" "}
            <a href="#payment-terms" className="underline hover:text-white transition-colors">
              Payment terms and options
            </a>{" "}
            section. Once an order has been paid, it can only be cancelled by exercising the right of
            withdrawal under the{" "}
            <a href="#withdrawal" className="underline hover:text-white transition-colors">
              14-day right of withdrawal
            </a>{" "}
            section, or by agreement with the seller at{" "}
            <a href="mailto:shop@saltyroad.cz" className="underline hover:text-white transition-colors">
              shop@saltyroad.cz
            </a>
            .
          </p>
        </Section>

        <Section id="dispute-resolution" title="Out-of-court dispute resolution">
          <p>
            If a consumer dispute arises between the seller and a consumer buyer from the purchase contract
            that cannot be resolved by mutual agreement, the buyer may submit a proposal for out-of-court
            dispute resolution to the <K>Czech Trade Inspection Authority</K> (Česká obchodní inspekce, Central
            Inspectorate – ADR Department, Štěpánská 567/15, 120 00 Praha 2, Czech Republic, Company ID:
            000 20 869), via the online form available at{" "}
            <a
              href="https://adr.coi.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              adr.coi.cz
            </a>
            .
          </p>
        </Section>
      </div>
    </>
  );
}

export default function ShopTermsPage() {
  const locale = useLocale();

  return (
    <section className="flex-1 bg-transparent text-white px-4 pt-6 md:pt-10 pb-12 max-w-3xl mx-auto w-full">
      {locale === "en" ? <EnTerms /> : <CsTerms />}
    </section>
  );
}
