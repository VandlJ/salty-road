import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { 
      firstName, 
      lastName, 
      email, 
      brand, 
      model, 
      year, 
      description, 
      instagram,
      photos 
    } = body;

    // Server-side validation
    if (!firstName || !lastName || !email || !brand || !model || !year || !description) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    const uploadedUrls: string[] = Array.isArray(photos) ? photos : [];

    const record = await prisma.registration.create({
      data: {
        firstName,
        lastName,
        email,
        brand,
        model,
        year,
        description,
        instagram: instagram || null,
        photos: uploadedUrls,
      },
    });

    // Send emails
    const adminEmail = process.env.ADMIN_EMAIL;
    const siteUrl = process.env.NEXT_PUBLIC_URL || "https://saltyroad.cz"; 

    // 1. Email to User (Bilingual)
    const userSubject = `Registration Confirmation / Potvrzení registrace - Salty Road Meet`;
    const userText = `
Ahoj,
děkujeme za registraci na Salty Road Meet – registraci jsme v pořádku přijali 🙌

Teď nás čeká schvalovací proces vozů. Jakmile projdeme přihlášené registrace, dáme ti vědět jedním z následujících e-mailů:
- v případě schválení ti pošleme potvrzení o zařazení vozu na akci,
- pokud vůz nevybereme, dostaneš od nás informaci o neschválení.

👉 I v případě, že vůz nebude vybrán, jsi stále vítán/a dorazit se na akci podívat jako návštěvník.

🆔 ID tvé registrace: ${record.id}
🔍 Stav registrace můžeš sledovat zde:
${siteUrl}/cs/check

📅 Datum konání: 25. 7. 2026
📍 Místo konání: Velké náměstí a Kostelní náměstí, Prachatice

Pokud máš mezitím jakýkoliv dotaz, ozvi se nám na info@saltyroad.cz.

Těšíme se,
Salty Road Meet tým

--------------------------------------------------

Hello,
thank you for registering for Salty Road Meet – we have successfully received your registration 🙌

We are now starting the vehicle approval process. Once we review the registrations, we will inform you via email:
- If approved, we will send you a confirmation of your vehicle’s acceptance to the event.
- If your vehicle is not selected, we will send you a notification regarding the decision.

👉 Even if your vehicle is not selected, you are still welcome to come and visit the event as a spectator.

🆔 Your Registration ID: ${record.id}
🔍 You can check your registration status here:
${siteUrl}/en/check

📅 Date: July 25, 2026
📍 Location: Velké náměstí and Kostelní náměstí, Prachatice

If you have any questions in the meantime, please contact us at info@saltyroad.cz.

We look forward to seeing you,
Salty Road Meet Team
    `;

    // 2. Email to Admin (Czech)
    const adminSubject = `Nová registrace: ${firstName} ${lastName} - ${brand} ${model}`;
    const adminText = `
Nová registrace na Salty Road Meet!

Jméno: ${firstName} ${lastName}
Email: ${email}
Instagram: ${instagram || "-"}
Vozidlo: ${brand} ${model} (${year})
Popis: ${description}
ID: ${record.id}
Počet fotek: ${uploadedUrls.length}

Zkontrolujte registraci v administraci: ${siteUrl}/admin
    `;

    // Await email sending to ensure execution before response closes
    try {
      await Promise.all([
        sendEmail(email, userSubject, userText),
        adminEmail ? sendEmail(adminEmail, adminSubject, adminText) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Error sending emails:", err);
      // We don't block the success response if emails fail, but we log it.
    }

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
