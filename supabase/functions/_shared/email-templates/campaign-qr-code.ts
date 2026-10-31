/**
 * Template: Campaign QR Code Email
 * Used by: campaign-send-email
 * Sends a campaign offer with its promo code, QR code and optional A5 PDF poster.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface CampaignQrCodeEmailData {
  /** Campaign display name (e.g. "Rentrée 2026"). */
  name: string;
  /** Promo code to enter when booking. */
  code: string;
  /** Booking link carrying the promo code. */
  promoUrl: string;
  /** Formatted discount label (e.g. "-10%" or "-15.00 €"). */
  discountLabel: string;
  /** Optional Content-ID of an inline QR PNG attachment (e.g. "campaign_qr"). */
  qrContentId?: string;
  /** Whether a PDF poster is attached to the email. */
  hasPdfAttachment?: boolean;
}

export function buildCampaignQrCodeEmailHtml(data: CampaignQrCodeEmailData): string {
  const qrImageUrl = data.qrContentId
    ? `cid:${data.qrContentId}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.promoUrl)}`;

  const attachmentNote = data.hasPdfAttachment
    ? `<p style="font-size: 13px; color: #0FB87F; text-align: center; margin: 8px 0 0 0;">
         L'affiche A5 de l'offre est jointe à cet email.
       </p>`
    : "";

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour,</p>

    <p style="font-size: 16px; color: #374151;">
      Profitez de l'offre <strong>${data.name}</strong> chez <strong>Depan.Pro</strong>.
    </p>

    <div style="text-align: center; margin: 20px 0;">
      <span style="display: inline-block; background-color: #ecfdf5; border: 1px solid #0FB87F; border-radius: 10px; padding: 12px 24px; font-size: 22px; font-weight: 700; color: #0FB87F;">
        ${data.discountLabel}
      </span>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 16px 0 8px 0;">
      Scannez ce QR code ou utilisez le code promo ci-dessous :
    </p>

    <div style="text-align: center; margin: 16px 0;">
      <img src="${qrImageUrl}" alt="QR Code ${data.code}" width="250" height="250" style="border: 1px solid #e5e7eb; border-radius: 12px; display: inline-block;" />
    </div>

    ${attachmentNote}

    <div style="text-align: center; margin: 16px 0;">
      <a href="${data.promoUrl}" style="display: inline-block; background-color: #0FB87F; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        En profiter maintenant
      </a>
    </div>

    <p style="font-size: 14px; color: #374151; text-align: center; margin: 16px 0 4px 0;">
      Code promo : <strong style="letter-spacing: 1px;">${data.code}</strong>
    </p>

    <p style="font-size: 12px; color: #9ca3af; text-align: center; word-break: break-all;">
      ${data.promoUrl}
    </p>

    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
      Le code est à saisir au moment de la demande d'intervention. Offre valable dans la limite de sa durée de validité.
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: `Offre ${data.name} — Depan.Pro`,
    headerSubtitle: `Code : ${data.code}`,
    bodyContent,
  });
}
