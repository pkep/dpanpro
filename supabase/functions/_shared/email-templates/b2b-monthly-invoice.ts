/**
 * Template: B2B monthly invoice email
 * Sent manually to a B2B partner contact with the monthly invoice PDF attached.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

export interface B2bMonthlyInvoiceEmailData {
  contactName: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  vatExempt: boolean;
  totalHt: number;
  totalTtc: number;
}

function fmtEuro(value: number): string {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} €`;
}

export function buildB2bMonthlyInvoiceEmail(
  data: B2bMonthlyInvoiceEmailData,
): { subject: string; html: string } {
  const { contactName, invoiceNumber, periodStart, periodEnd, vatExempt, totalHt, totalTtc } = data;
  const subject = `Votre facture Depan.Pro ${invoiceNumber}`;
  const amountLabel = vatExempt ? fmtEuro(totalHt) : fmtEuro(totalTtc);
  const vatLabel = vatExempt ? "HT" : "TTC";

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px; font-weight: 600;">
      Votre facture mensuelle Depan.Pro
    </h2>

    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Bonjour ${contactName},
    </p>

    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Veuillez trouver ci-joint votre facture <strong>${invoiceNumber}</strong>
      pour la période du ${periodStart} au ${periodEnd}.
    </p>

    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #374151; font-size: 15px;">
        Montant total ${vatLabel} : <strong>${amountLabel}</strong>
      </p>
    </div>

    ${vatExempt ? `
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #92400e; font-size: 13px;">
        TVA non applicable — autoliquidation par le preneur
        (art. 283-2 nonies du CGI).
      </p>
    </div>` : ""}

    <p style="margin: 0 0 8px; color: #374151; font-size: 15px;">
      Merci pour votre confiance.
    </p>
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      Depan.Pro — SIRET 992 525 576 00011
    </p>
  `;

  return {
    subject,
    html: wrapInBaseLayout({
      headerTitle: "Facture mensuelle B2B",
      headerSubtitle: invoiceNumber,
      headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
      bodyContent,
    }),
  };
}
