import { wrapInBaseLayout } from "./base-layout.ts";

interface PayoutNotificationData {
  technicianName: string;
  amount: number;
  periodLabel: string;
  payoutDate: string;
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
}

export function buildPayoutNotificationEmailHtml(data: PayoutNotificationData): string {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  const bodyContent = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px;">
      Bonjour <strong>${data.technicianName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px;">
      Votre versement pour la période de <strong>${data.periodLabel}</strong> a été validé.
    </p>

    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <tr style="background-color: #f9fafb;">
        <td style="padding: 12px 16px; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">CA brut généré</td>
        <td style="padding: 12px 16px; font-size: 14px; color: #111827; text-align: right; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${formatCurrency(data.grossRevenue)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Commission plateforme (${data.commissionRate}%)</td>
        <td style="padding: 12px 16px; font-size: 14px; color: #dc2626; text-align: right; border-bottom: 1px solid #e5e7eb;">- ${formatCurrency(data.commissionAmount)}</td>
      </tr>
      <tr style="background-color: #f0fdf4;">
        <td style="padding: 14px 16px; font-size: 15px; color: #111827; font-weight: 700;">Montant net versé</td>
        <td style="padding: 14px 16px; font-size: 18px; color: #059669; text-align: right; font-weight: 700;">${formatCurrency(data.amount)}</td>
      </tr>
    </table>

    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
      📅 Date de versement : <strong>${data.payoutDate}</strong>
    </p>
    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 13px;">
      Le virement sera effectué sous 2 à 3 jours ouvrés.
    </p>

    <p style="margin: 0; color: #374151; font-size: 14px;">
      Merci pour votre travail et votre engagement. 🙏
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: "💰 Versement validé",
    headerSubtitle: `Période : ${data.periodLabel}`,
    headerBgGradient: "linear-gradient(135deg, #059669, #10b981)",
    bodyContent,
  });
}
