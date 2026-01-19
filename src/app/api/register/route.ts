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
Hello / Ahoj ${firstName} ${lastName},

Thank you for registering for Salty Road Meet Vol. 1.
We have received your registration details:

Vehicle: ${brand} ${model} (${year})
Description: ${description}
Registration ID: ${record.id}

You can check the status of your registration here: ${siteUrl}/check
Just enter your registration ID: ${record.id}

We will review your application and get back to you soon.

---

Děkujeme za registraci na Salty Road Meet Vol. 1.
Přijali jsme vaše údaje k registraci:

Vozidlo: ${brand} ${model} (${year})
Popis: ${description}
ID registrace: ${record.id}

Stav své registrace můžete zkontrolovat zde: ${siteUrl}/check
Zadejte své ID registrace: ${record.id}

Vaši žádost posoudíme a brzy se vám ozveme.

Salty Road Team
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

    // Send asynchronously without blocking response
    Promise.allSettled([
      sendEmail(email, userSubject, userText),
      adminEmail ? sendEmail(adminEmail, adminSubject, adminText) : Promise.resolve(),
    ]).catch((err) => console.error("Error sending emails:", err));

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
