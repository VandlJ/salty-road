// Post-event thank-you email sent to Vol.1 exhibitors who actually showed
// up (registration.status === "accepted" && arrived === true), with a
// shop discount coupon. Sent via the admin "Vol.1 poděkování" bulk-send
// tool, not automatically.
/**
 * @param {{ firstName: string, couponCode: string, siteUrl: string }} data
 */
export function vol1ExhibitorThankYouEmail({ firstName, couponCode, siteUrl }) {
  const subject = "Díky, že jste byli u Salty Road Meet — dárek pro vás";
  const shopUrl = `${siteUrl}/cs/shop`;
  const greeting = firstName ? `Ahoj ${firstName},` : "Ahoj,";

  const text = `${greeting}

Salty Road Meet Vol. 1 je za námi a my bychom vám ještě jednou chtěli obrovsky poděkovat, že jste byli jeho součástí.

Díky tomu, že jste dorazili se svými auty, podpořili naši akci a pomohli vytvořit atmosféru, kterou jsme si při plánování celého meetu přáli, se nám podařilo zaplnit prachatické náměstí a společně si užít skvělý den.

Zároveň vám chceme poděkovat za to, jak celý meet proběhl. Bez zbytečných problémů, bez bordelu a s respektem k místu, ostatním účastníkům i návštěvníkům. I díky vám jsme mohli ukázat, že automobilová komunita umí udělat pořádnou akci a zároveň se chovat tak, jak má.

Vaší podpory si opravdu vážíme, a proto pro vás máme ještě jednu malou odměnu.

Rozjeli jsme Salty Road e-shop!

A protože jste se registrovali a byli přímo součástí Salty Road Meet Vol. 1, dáváme vám 10% slevu na celý nákup a na cokoliv z našeho e-shopu.

Váš slevový kód: ${couponCode}
Uplatníte ho při dokončení objednávky na ${shopUrl}

Budeme samozřejmě rádi, když si z letošního ročníku odnesete i něco dalšího na památku. Zároveň každým nákupem podporujete další fungování Salty Road Meet a naši snahu posouvat celou akci zase o kus dál.

Protože my už teď přemýšlíme, co všechno uděláme příště ještě lépe.

Vol. 1 nám ukázal, že tohle celé má smysl. A Salty Road Meet Vol. 2 v roce 2027 chceme posunout zase o pořádný kus dál.

Doufáme, že u toho budete znovu s námi.

Ještě jednou díky za účast, podporu, skvělou atmosféru a za všechna milá slova, která se k nám po akci dostala. Opravdu si toho vážíme.

Uvidíme se na Salty Road Meet Vol. 2!

Mějte se skvěle!

Tým Salty Road Meet
info@saltyroad.cz`;

  const html = `
<div style="background-color:#f4f4f4;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e5e5e5;">

    <div style="background-color:#ffffff;padding:28px 32px;text-align:center;border-bottom:3px solid #dc2626;">
      <img src="${siteUrl}/Logo/invoice-logo.png" alt="Salty Road" width="230" style="display:block;margin:0 auto;" />
    </div>

    <div style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 16px;">${greeting}</p>

      <p style="margin:0 0 16px;">Salty Road Meet Vol. 1 je za námi a my bychom vám ještě jednou chtěli obrovsky poděkovat, že jste byli jeho součástí.</p>

      <p style="margin:0 0 16px;">Díky tomu, že jste dorazili se svými auty, podpořili naši akci a pomohli vytvořit atmosféru, kterou jsme si při plánování celého meetu přáli, se nám podařilo zaplnit prachatické náměstí a společně si užít skvělý den.</p>

      <p style="margin:0 0 16px;">Zároveň vám chceme poděkovat za to, jak celý meet proběhl. Bez zbytečných problémů, bez bordelu a s respektem k místu, ostatním účastníkům i návštěvníkům. I díky vám jsme mohli ukázat, že automobilová komunita umí udělat pořádnou akci a zároveň se chovat tak, jak má.</p>

      <p style="margin:0 0 16px;">Vaší podpory si opravdu vážíme, a proto pro vás máme ještě jednu malou odměnu.</p>

      <p style="margin:0 0 4px;font-weight:700;">Rozjeli jsme Salty Road e-shop!</p>

      <p style="margin:0 0 24px;">A protože jste se registrovali a byli přímo součástí Salty Road Meet Vol. 1, dáváme vám <strong>10% slevu</strong> na celý nákup a na cokoliv z našeho e-shopu.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td align="center" style="background-color:#fafafa;border:2px dashed #dc2626;border-radius:4px;padding:20px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#666666;font-weight:700;margin-bottom:8px;">Váš slevový kód pro vystavovatele Vol. 1</div>
            <div style="font-size:26px;font-weight:800;letter-spacing:0.06em;color:#dc2626;font-family:monospace;margin-bottom:16px;">${couponCode}</div>
            <a href="${shopUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;padding:12px 28px;border-radius:4px;">Do e-shopu</a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;">Budeme samozřejmě rádi, když si z letošního ročníku odnesete i něco dalšího na památku. Zároveň každým nákupem podporujete další fungování Salty Road Meet a naši snahu posouvat celou akci zase o kus dál.</p>

      <p style="margin:0 0 16px;">Protože my už teď přemýšlíme, co všechno uděláme příště ještě lépe.</p>

      <p style="margin:0 0 16px;">Vol. 1 nám ukázal, že tohle celé má smysl. A Salty Road Meet Vol. 2 v roce 2027 chceme posunout zase o pořádný kus dál.</p>

      <p style="margin:0 0 16px;">Doufáme, že u toho budete znovu s námi.</p>

      <p style="margin:0 0 16px;">Ještě jednou díky za účast, podporu, skvělou atmosféru a za všechna milá slova, která se k nám po akci dostala. Opravdu si toho vážíme.</p>

      <p style="margin:0 0 4px;font-weight:700;">Uvidíme se na Salty Road Meet Vol. 2!</p>
      <p style="margin:0 0 24px;">Mějte se skvěle!</p>

      <p style="margin:0;color:#666666;font-size:13px;">Tým Salty Road Meet<br />info@saltyroad.cz</p>
    </div>
  </div>
</div>`;

  return { subject, text, html };
}
