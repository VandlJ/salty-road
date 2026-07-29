import { Resend } from 'resend';

// Instantiated lazily: the Resend constructor throws if the key is missing,
// which would otherwise crash module evaluation (and the build) in any
// environment where RESEND_API_KEY isn't set yet.
let resend: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

interface Attachment {
  filename: string;
  content: Buffer | string;
  contentId?: string;
}

export async function sendEmail(
  to: string, 
  subject: string, 
  text: string, 
  html?: string,
  attachments?: Attachment[]
) {
  const from = process.env.EMAIL_FROM || 'Salty Road <onboarding@resend.dev>';

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured. Skipping email.");
    return;
  }

  try {
    await client.emails.send({
      from,
      to,
      subject,
      text,
      html,
      attachments,
    });
  } catch (error) {
    console.error("Resend error:", error);
  }
}

export async function sendRejectionEmail(to: string) {
  const subject = "Salty Road Meet vol. I - Vyjádření k registraci";
  const text = `Ahoj,

díky za přihlášení vozu na Salty Road Meet vol. I.
Po pečlivém výběru jsme se rozhodli tvůj vůz do oficiálního výběru nezařadit.

Výběr nebyl jednoduchý a kapacita akce je omezená – rozhodně to ale neznamená, že by s autem bylo něco špatně.

I tak můžeš s vozem dorazit a zaparkovat na přilehlých parkovištích a užít si akci jako návštěvník.

Díky za pochopení a třeba se potkáme u dalšího ročníku 🔥
Tým Salty Road Meet`;

  // Simple HTML version
  const html = text.replace(/\n/g, '<br/>');

  await sendEmail(to, subject, text, html);
}

export async function sendAcceptanceEmail(to: string, qrCodeBase64: string) {
  const subject = "Salty Road Meet vol. I - Potvrzení registrace";
  const text = `Ahoj,

gratulujeme! 🎉 Tvůj vůz byl vybrán na hlavní výstavní plochu akce Salty Road Meet vol. I.

Pro potvrzení účasti je potřeba uhradit rezervační poplatek ve výši 299 Kč.

Níže najdeš QR kód s platebními údaji – po jeho uhrazení bude tvoje místo na hlavní ploše závazně rezervováno.

Poplatek je potřeba uhradit do 14 dnů od přijetí tohoto e-mailu, jinak bude místo uvolněno dalšímu zájemci.

Zhruba měsíc před akcí ti pošleme veškeré potřebné informace ohledně programu, parkování a organizace.

Těšíme se na tebe i tvůj vůz 🔥
Tým Salty Road Meet`;

  const html = `
    <p>Ahoj,</p>
    <p>gratulujeme! 🎉 Tvůj vůz byl vybrán na hlavní výstavní plochu akce Salty Road Meet vol. I.</p>
    <p>Pro potvrzení účasti je potřeba uhradit rezervační poplatek ve výši 299 Kč.</p>
    <p>Níže najdeš QR kód s platebními údaji – po jeho uhrazení bude tvoje místo na hlavní ploše závazně rezervováno.</p>
    <div style="margin: 20px 0;">
      <img src="cid:qr-code" alt="QR Platba" style="width: 200px; height: 200px;" />
    </div>
    <p>Poplatek je potřeba uhradit do 14 dnů od přijetí tohoto e-mailu, jinak bude místo uvolněno dalšímu zájemci.</p>
    <p>Zhruba měsíc před akcí ti pošleme veškeré potřebné informace ohledně programu, parkování a organizace.</p>
    <p>Těšíme se na tebe i tvůj vůz 🔥<br/>Tým Salty Road Meet</p>
  `;

  await sendEmail(to, subject, text, html, [
    {
      filename: 'qr-platba.png',
      content: qrCodeBase64,
      contentId: 'qr-code'
    }
  ]);
}