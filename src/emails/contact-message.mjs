// Sent to ORDER_EMAIL (falls back to ADMIN_EMAIL) whenever someone submits
// the floating contact widget.
export function contactMessageEmail({ name, email, message }) {
  const subject = `Nová zpráva z webu: ${name}`;

  const text = `Nová zpráva z kontaktního formuláře na saltyroad.cz:

Jméno: ${name}
Email: ${email}

${message}

Odpovědět rovnou na ${email}, nebo spravovat v adminu na /admin/messages.`;

  return { subject, text };
}
