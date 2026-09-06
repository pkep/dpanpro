/**
 * Template: Contact Message
 * Sent to contact@depan.pro when a visitor submits the contact form.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface ContactMessageData {
  profileType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
}

export function buildContactMessageHtml(
  data: ContactMessageData
): { subject: string; html: string } {
  const { profileType, firstName, lastName, email, phone, message } = data;

  const profileLabel =
    profileType === "particulier" ? "Particulier" :
    profileType === "entreprise" ? "Entreprise" :
    profileType === "technicien" ? "Technicien" :
    profileType;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">
      Un nouveau message a été reçu via le formulaire de contact.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px; font-size: 15px;">
      <tr style="background: #f9fafb;">
        <td style="padding: 10px 14px; font-weight: 600; color: #374151; width: 140px; border: 1px solid #e5e7eb;">Profil</td>
        <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">${profileLabel}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Nom</td>
        <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">${lastName} ${firstName}</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 10px 14px; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Email</td>
        <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">
          <a href="mailto:${email}" style="color: #0FB87F;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; color: #374151; border: 1px solid #e5e7eb;">Téléphone</td>
        <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">
          ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}" style="color: #0FB87F;">${phone}</a>` : '<span style="color: #9ca3af;">Non renseigné</span>'}
        </td>
      </tr>
    </table>

    <div style="background: #f3f4f6; border-left: 4px solid #0FB87F; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px;">
      <p style="font-size: 13px; font-weight: 600; color: #6b7280; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
      <p style="font-size: 15px; color: #111827; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
    </div>

    <p style="font-size: 13px; color: #9ca3af; margin: 0;">
      Répondre directement à cet email pour contacter <strong>${firstName} ${lastName}</strong> à l'adresse <a href="mailto:${email}" style="color: #0FB87F;">${email}</a>.
    </p>
  `;

  return {
    subject: `[Contact] ${profileLabel} — ${firstName} ${lastName}`,
    html: wrapInBaseLayout({
      headerTitle: "Nouveau message de contact",
      headerSubtitle: `${firstName} ${lastName} (${profileLabel})`,
      headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
      bodyContent,
    }),
  };
}
