"use client";

import React from "react";
import SectionHeading from "@/components/section-heading";
import { Link } from "@/i18n/routing";

// Legally binding text only exists in Czech (references Czech consumer
// law, IČO, registered address) — shown as-is regardless of site locale
// rather than auto-translated, same reasoning a paper terms-of-service
// document wouldn't get machine-translated for an English-speaking visitor.

const SECTIONS = [
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

export default function ShopTermsPage() {
  return (
    <section className="flex-1 bg-transparent text-white px-4 pt-6 md:pt-10 pb-12 max-w-3xl mx-auto w-full">
      <SectionHeading as="h1" size="lg" className="mb-8">
        Obchodní a reklamační podmínky
      </SectionHeading>

      <nav className="mb-12 border border-gray-800 rounded-sm p-4 bg-white/[0.02]">
        <span className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">
          Obsah
        </span>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-gray-300 hover:text-white underline underline-offset-2 text-sm transition-colors">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

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
            reklamaci prodávajícím. V případě
            odstoupení od smlouvy se smlouva od počátku ruší a smluvní strany jsou povinny navrátit si všechna
            plnění z rušené smlouvy. Kupující musí prodávajícímu vydat vše, co na základě kupní smlouvy
            získal. Pokud to již není dobře možné (např. v mezidobí bylo zboží zničeno nebo spotřebováno),
            musí kupující poskytnout peněžitou náhradu jako protihodnotu toho, co již nemůže být vydáno. Pokud
            je vrácené zboží poškozeno jen částečně, může prodávající uplatnit na spotřebiteli právo na
            náhradu škody a započíst svůj nárok na vracenou kupní cenu. Prodávající kupujícímu v takovém
            případě vrací jen takto sníženou kupní cenu.
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
    </section>
  );
}
