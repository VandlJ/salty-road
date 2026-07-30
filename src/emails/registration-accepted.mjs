// Sent when an admin accepts a submitted registration. The QR payment code
// is attached separately (as a cid: inline image) by the caller.
export function registrationAcceptedEmail() {
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

  return { subject, text, html };
}
