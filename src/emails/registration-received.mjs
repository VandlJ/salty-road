// Sent immediately to the person who just submitted a registration —
// confirms it was received and is now pending review.
//
// Date and venue are passed in from the edition being registered for; they
// were hard-coded to Volume 1's, which would have quietly told Volume 2
// registrants to turn up in July 2026.
/**
 * @param {{
 *   registrationId: string, siteUrl: string,
 *   dateCs: string, dateEn: string, venue: string,
 * }} data
 */
export function registrationReceivedEmail({ registrationId, siteUrl, dateCs, dateEn, venue }) {
  const subject = "Registration Confirmation / Potvrzení registrace - Salty Road Meet";

  const text = `
Ahoj,
děkujeme za registraci na Salty Road Meet – registraci jsme v pořádku přijali 🙌

Teď nás čeká schvalovací proces vozů. Jakmile projdeme přihlášené registrace, dáme ti vědět jedním z následujících e-mailů:
- v případě schválení ti pošleme potvrzení o zařazení vozu na akci,
- pokud vůz nevybereme, dostaneš od nás informaci o neschválení.

👉 I v případě, že vůz nebude vybrán, jsi stále vítán/a dorazit se na akci podívat jako návštěvník.

🆔 ID tvé registrace: ${registrationId}
🔍 Stav registrace můžeš sledovat zde:
${siteUrl}/cs/check

📅 Datum konání: ${dateCs}
📍 Místo konání: ${venue}

Pokud máš mezitím jakýkoliv dotaz, ozvi se nám na info@saltyroad.cz.

Těšíme se,
Salty Road Meet tým

--------------------------------------------------

Hello,
thank you for registering for Salty Road Meet – we have successfully received your registration 🙌

We are now starting the vehicle approval process. Once we review the registrations, we will inform you via email:
- If approved, we will send you a confirmation of your vehicle's acceptance to the event.
- If your vehicle is not selected, we will send you a notification regarding the decision.

👉 Even if your vehicle is not selected, you are still welcome to come and visit the event as a spectator.

🆔 Your Registration ID: ${registrationId}
🔍 You can check your registration status here:
${siteUrl}/en/check

📅 Date: ${dateEn}
📍 Location: ${venue}

If you have any questions in the meantime, please contact us at info@saltyroad.cz.

We look forward to seeing you,
Salty Road Meet Team
  `;

  return { subject, text };
}
