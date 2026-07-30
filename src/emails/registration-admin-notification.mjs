// Sent to ADMIN_EMAIL whenever a new registration comes in, so the team
// notices it without having to keep the admin panel open.
export function registrationAdminNotificationEmail({
  firstName,
  lastName,
  email,
  instagram,
  brand,
  model,
  year,
  description,
  registrationId,
  photoCount,
  siteUrl,
}) {
  const subject = `Nová registrace: ${firstName} ${lastName} - ${brand} ${model}`;

  const text = `
Nová registrace na Salty Road Meet!

Jméno: ${firstName} ${lastName}
Email: ${email}
Instagram: ${instagram || "-"}
Vozidlo: ${brand} ${model} (${year})
Popis: ${description}
ID: ${registrationId}
Počet fotek: ${photoCount}

Zkontrolujte registraci v administraci: ${siteUrl}/admin
  `;

  return { subject, text };
}
