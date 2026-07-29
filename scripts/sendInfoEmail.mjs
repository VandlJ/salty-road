import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const SEND_ALL = process.argv.includes("--all");
const TEST_EMAIL = process.env.TEST_EMAIL;

if (!SEND_ALL && !TEST_EMAIL) {
  console.error("Set TEST_EMAIL env var for a test run, or pass --all to email every accepted registration.");
  console.error("Usage: TEST_EMAIL=you@example.com node scripts/sendInfoEmail.mjs");
  process.exit(1);
}

const subject = "Shrnutí informací - Salty Road Meet vol.1";

const text = `Ahoj,

Salty Road Meet Vol. 1 se pomalu blíží, a tak bychom ti chtěli poslat pár důležitých informací k příjezdu, organizaci a celému průběhu akce.

V první řadě ti chceme poděkovat za registraci. Tvoje auto patří mezi schválené vozy, počítáme s tebou na výstavní ploše a máme velkou radost, že budeš součástí prvního ročníku Salty Road Meetu na Velkém náměstí v Prachaticích. Sestava schválených aut vypadá opravdu skvěle a věříme, že společně vytvoříme den plný aut, zábavy, zážitků a nových přátelství spojených stejnou vášní.

Velmi důležitá je pro nás organizace příjezdu vystavovaných vozidel. Velké náměstí v Prachaticích bude pro vystavované vozy přístupné v pátek 24. července 2026 od 19:00 do 22:00 a následně v sobotu 25. července 2026 od 8:00 do 11:00. Mimo tyto časy nebude vjezd vozidel na náměstí povolen.

Prosíme tě proto, abys svůj příjezd naplánoval opravdu v jednom z uvedených časových oken. Budeme pracovat s omezeným prostorem v historickém centru a auta musíme na náměstí poskládat tak, aby se všichni vešli, aby celá výstavní plocha dávala smysl a aby byl pohyb po náměstí bezpečný pro návštěvníky, vystavovatele i samotná auta. Zároveň prosíme, aby se během akce z místa neodjíždělo a znovu nepřijíždělo. Nechceme z náměstí udělat průjezdní dvůr, ale hezky připravený a uspořádaný prostor pro auta, lidi a atmosféru celé akce.

Odjezd z místa konání bude možný v sobotu 25. července po 18:00, případně v neděli 26. července do 10:00. Pokud bys z jakéhokoliv důvodu potřeboval řešit příjezd nebo odjezd individuálně, dej nám prosím vědět předem, určitě se domluvíme.

Po příjezdu tě navedou členové organizačního týmu. Poznáš nás podle červených triček Salty Road Meet CREW. U příjezdu bude naše crew, která bude kontrolovat registrace, rozdávat pásky a směrovat vystavované vozy na konkrétní místa. Prosíme, měj u sebe připravené potvrzení registrace / potvrzovací e-mail, případně registrační údaje k vozu. Urychlí nám to odbavení a pomůže to tomu, aby příjezd aut probíhal plynule a bez zbytečného zdržování.

Kontaktní osobou v den akce je David Šmídmajer, telefon 724 386 935.

Pokud vezeš auto na vleku nebo podvalu, můžeš pro odstavení soupravy využít parkoviště v ulici Menšíkova. Samotný výstavní vůz bude následně naveden na náměstí podle pokynů organizačního týmu.

Samotný program akce začne v sobotu dopoledne příjezdem vystavovaných vozů, který musí být dokončený do 11:00. Ve 12:00 akci oficiálně zahájíme a zároveň odstartuje hlasování o TOP 3 vozidla srazu. Ve 14:00 proběhne soutěž ve výměně kola, v 16:00 soutěž v tahání auta a v 17:30 vyhlásíme TOP 3 vozidla srazu. Od 18:00 do 22:00 se o hudbu postará DJ Raty a od 22:00 bude pokračovat afterparty v Music Clubu Hrozen.

Po celý den bude připravený také doprovodný program. Těšit se můžete na hairstylistu a barbera Jakuba Boudu, zaplétání copánků od Cherry Braids, malování na obličej od carymary_pt, drinky a pivko od stánku Music Club Hrozen, kávu z Cafe Madona, Burger & Grill od Black Bear, včetně signature E55 Burgeru, hudební doprovod po dobu konání akce a také lokální zahrádky k posezení, jídlu a pití.

Akce rozhodně není jen pro majitele aut. Klidně vezmi kámoše, rodinu, děti nebo kohokoliv, kdo má auta rád a chce si užít příjemný den v centru Prachatic. Bude připravený program i pro děti, občerstvení, hudba, soutěže a hlavně spousta zajímavých aut.

Abychom si akci všichni užili v klidu a bez problémů, prosíme také o respektování návštěvního řádu a základních pravidel. Na vystavená auta se nesahá bez souhlasu majitele, respektují se pokyny organizačního týmu a v prostoru akce je potřeba se pohybovat ohleduplně vůči návštěvníkům, dětem, vystavovatelům i ostatním autům. Pálení gum, nebezpečná jízda, zbytečné vytáčení motorů a pops and bangs na místě akce nejsou povoleny. Zároveň počítej s tím, že během akce budou pořizovány fotografie a videa pro účely propagace Salty Road Meetu.

Chceme, aby měl první ročník skvělou atmosféru, ale zároveň úroveň, respekt a bezpečný průběh, zkrátka aby to nebyl zároveň poslední ročník. Díky moc, že nám s tím pomůžeš.

Pevně věříme, že dorazíš, protože s tebou a tvým autem opravdu počítáme. Pokud by se ale stalo něco zásadního a nakonec bys přijet nemohl, dej nám prosím co nejdřív vědět. Pomůže nám to s organizací výstavní plochy a případným uvolněním místa pro další vůz.

Budeme moc rádi, když budeš akci sdílet i u sebe na Instagramu a označíš nás jako @salty_road_meet. Ať se o akci dozví co nejvíc lidí a ať společně ukážeme, jaká sestava aut se v Prachaticích chystá.

Díky moc, že jsi součástí Salty Road Meet Vol. 1. Těšíme se na tebe, na tvoje auto a na skvělý den na Velkém náměstí v Prachaticích.

Za Salty Road Meet tým

David Šmídmajer
Salty Road Meet CREW
724 386 935`;

const html = text
  .split("\n\n")
  .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
  .join("\n");

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured.");
    process.exit(1);
  }

  const where = {
    status: "accepted",
    infoEmailSentAt: null,
    ...(SEND_ALL ? {} : { email: TEST_EMAIL }),
  };

  const registrations = await prisma.registration.findMany({ where });

  console.log(
    `Mode: ${SEND_ALL ? "ALL accepted registrations" : `TEST (only ${TEST_EMAIL})`}`
  );
  console.log(`Found ${registrations.length} registration(s) to email.`);

  for (const reg of registrations) {
    try {
      const from = process.env.EMAIL_FROM || "Salty Road <onboarding@resend.dev>";
      await resend.emails.send({
        from,
        to: reg.email,
        subject,
        text,
        html,
      });
      await prisma.registration.update({
        where: { id: reg.id },
        data: { infoEmailSentAt: new Date() },
      });
      console.log(`Sent to ${reg.email} (${reg.firstName} ${reg.lastName})`);
    } catch (err) {
      console.error(`Failed to send to ${reg.email}:`, err);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
