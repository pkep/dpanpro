/**
 * Template: Affiliate QR Code Email
 * Used by: affiliate-send-email
 * Sends the affiliate's QR code with the Depan.Pro design.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface AffiliateQrCodeEmailData {
  firstName: string;
  lastName: string;
  code: string;
  referralUrl: string;
  commissionType: string;
  commissionValue: string; // already formatted, e.g. "5" or "20"
  /** Optional Content-ID of an inline QR PNG attachment (e.g. "affiliate_qr"). */
  qrContentId?: string;
  /** Whether a PDF poster is attached to the email. */
  hasPdfAttachment?: boolean;
}

export function buildAffiliateQrCodeEmailHtml(data: AffiliateQrCodeEmailData): string {
  const qrImageUrl = data.qrContentId
    ? `cid:${data.qrContentId}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.referralUrl)}`;

  const attachmentNote = data.hasPdfAttachment
    ? `<p style="font-size: 13px; color: #0FB87F; text-align: center; margin: 8px 0 0 0;">
         Votre affiche A5 prête à imprimer est jointe à cet email.
       </p>`
    : "";

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour <strong>${data.firstName} ${data.lastName}</strong>,</p>

    <p style="font-size: 16px; color: #374151;">
      Bienvenue dans le programme d'affiliation <strong>Depan.Pro</strong> !
    </p>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 16px 0 8px 0;">
      Partagez ce QR code ou le lien ci-dessous :
    </p>

    <div style="text-align: center; margin: 16px 0;">
      <img src="${qrImageUrl}" alt="QR Code ${data.code}" width="250" height="250" style="border: 1px solid #e5e7eb; border-radius: 12px; display: inline-block;" />
    </div>

    ${attachmentNote}

    <div style="text-align: center; margin: 16px 0;">
      <a href="${data.referralUrl}" style="display: inline-block; background-color: #0FB87F; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Lien de parrainage
      </a>
    </div>

    <p style="font-size: 12px; color: #9ca3af; text-align: center; word-break: break-all;">
      ${data.referralUrl}
    </p>

    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
      Chaque nouveau client utilisant ce lien génère une commission qui apparaîtra dans votre tableau de bord affilié.
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: "Votre QR Code affilié Depan.Pro",
    headerSubtitle: `Code : ${data.code}`,
    bodyContent,
  });
}
