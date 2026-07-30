// Sent when an admin declines a submitted registration.
export function registrationRejectedEmail() {
  const subject = "Salty Road Meet vol. I - Vyjádření k registraci";

  const text = `Ahoj,

díky za přihlášení vozu na Salty Road Meet vol. I.
Po pečlivém výběru jsme se rozhodli tvůj vůz do oficiálního výběru nezařadit.

Výběr nebyl jednoduchý a kapacita akce je omezená – rozhodně to ale neznamená, že by s autem bylo něco špatně.

I tak můžeš s vozem dorazit a zaparkovat na přilehlých parkovištích a užít si akci jako návštěvník.

Díky za pochopení a třeba se potkáme u dalšího ročníku 🔥
Tým Salty Road Meet`;

  const html = text.replace(/\n/g, "<br/>");

  return { subject, text, html };
}
