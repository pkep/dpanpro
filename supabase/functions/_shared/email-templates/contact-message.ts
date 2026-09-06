/**
 * Template: Contact Message Email
 * Used by: send-contact-email
 * Forwards a contact form submission to the Depan.Pro team.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface ContactMessageEmailData {
  profileType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
}

export function buildContactMessageHtml(data: ContactMessageEmailData): { subject: string; html: string } {
  const subject = `Nouveau message de contact — ${data.profileType}`;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour,</p>

    <p style="font-size: 16px; color: #374151;">
      Un nouveau message a été envoyé via le formulaire de contact <strong>Depan.Pro</strong>.
    </p>

    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Profil :</strong> ${data.profileType}</p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Nom :</strong> ${data.firstName} ${data.lastName}</p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Email :</strong> <a href="mailto:${data.email}" style="color: #0FB87F;">${data.email}</a></p>
      ${data.phone ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Téléphone :</strong> ${data.phone}</p>` : ""}
      <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Message :</strong></p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #4b5563; white-space: pre-wrap;">${data.message}</p>
    </div>

    <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
      Ce message a été généré automatiquement depuis le formulaire de contact Depan.Pro.
    </p>
  `;

  const html = wrapInBaseLayout({
    headerTitle: "Nouveau message de contact",
    headerSubtitle: `Profil : ${data.profileType}`,
    bodyContent,
  });

  return { subject, html };
}
