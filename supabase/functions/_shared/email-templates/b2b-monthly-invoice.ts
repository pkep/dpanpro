import { wrapInBaseLayout } from "./base-layout.ts";

export function buildB2bMonthlyInvoiceEmail(data: {
  contactName: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  vatExempt: boolean;
  totalHt: number;
  totalTtc: number;
}): { subject: string; html: string } {
  const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
  const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
  const date = (value: string) => new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  return {
    subject: `Depan.Pro : Facture mensuelle ${data.invoiceNumber}`,
    html: wrapInBaseLayout({
      headerTitle: "Votre facture mensuelle",
      bodyContent: `<p>Bonjour ${escape(data.contactName)},</p>
        <p>Veuillez trouver votre facture <strong>${escape(data.invoiceNumber)}</strong> pour la période du ${escape(date(data.periodStart))} au ${escape(date(data.periodEnd))}.</p>
        <p>Total HT : <strong>${money(data.totalHt)}</strong><br>Montant TTC : <strong>${money(data.totalTtc)}</strong></p>
        <p>La facture au format PDF est jointe à cet e-mail.</p>
        <p>Pour toute question, contactez-nous à contact@depan.pro.</p>`,
    }),
  };
}