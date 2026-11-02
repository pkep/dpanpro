/**
 * Générateur de PDF de facture mensuelle B2B (jsPDF) — partagé edge functions.
 * Le PDF est produit en mémoire (aucune persistance ici).
 */
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { LOGO_DATA_URI, LOGO_WIDTH, LOGO_HEIGHT } from "./assets.ts";
import { drawCompanyFooter } from "./pdf/document-layout.ts";

export interface B2bInvoiceLine {
  interventionId: string;
  label: string;
  amount: number;
  /** Snapshot d'intervention pour la facture mensuelle. */
  interventionDate?: string | null;
  externalRef?: string | null;
  address?: string | null;
  details?: string[];
  technicianName?: string | null;
  trackingCode?: string | null;
  perServiceInvoiceNumber?: string | null;
}

export interface B2bInvoicePdfInput {
  number: string;
  periodStart: string;
  periodEnd: string;
  partner: {
    company_name?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    siret?: string | null;
    vat_number?: string | null;
    /** Entreprise de construction (BTP) : facture en autoliquidation de TVA. */
    construction_company?: boolean | null;
  };
  lines: B2bInvoiceLine[];
  totalHt: number;
  vat: number;
  totalTtc: number;
}

/** Construit le PDF (base64, sans préfixe data URI). */
export function buildB2bInvoicePdfBase64(data: B2bInvoicePdfInput): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Logo (remplace le titre texte « Depan.Pro »)
  doc.addImage(LOGO_DATA_URI, "PNG", 14, 13.33, LOGO_WIDTH, LOGO_HEIGHT);
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  y = 37;
  doc.text("7, place du 11 Novembre 1918, 93000 Bobigny", 14, y);
  y += 4;
  doc.text("SIRET 992 525 576 00011 - TVA FR41 992 525 576", 14, y);

  y += 14;
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text("FACTURE MENSUELLE", 14, y);
  doc.setFontSize(9);
  doc.text(`N° ${data.number}`, pageWidth - 14, y, { align: "right" });
  doc.text(`Période ${data.periodStart} → ${data.periodEnd}`, pageWidth - 14, y + 5, { align: "right" });

  y += 14;
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text(data.partner.company_name ?? "", 14, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (data.partner.address) {
    doc.text(`${data.partner.address}, ${data.partner.city ?? ""} ${data.partner.postal_code ?? ""}`, 14, y);
    y += 4;
  }
  if (data.partner.siret) { doc.text(`SIRET: ${data.partner.siret}`, 14, y); y += 4; }
  if (data.partner.vat_number) { doc.text(`TVA: ${data.partner.vat_number}`, 14, y); y += 4; }

  autoTable(doc, {
    startY: y + 6,
    head: [["Intervention", "Montant HT"]],
    body: data.lines.map((l) => {
      const rows = [
        l.interventionDate || "",
        l.externalRef ? `Réf. externe : ${l.externalRef}` : "",
        l.address ? `Adresse : ${l.address}` : "",
        l.details?.length ? `Détail : ${l.details.join(" ; ")}` : "",
        l.technicianName ? `Technicien : ${l.technicianName}` : "",
        l.label,
        l.perServiceInvoiceNumber ? `Facture intervention : ${l.perServiceInvoiceNumber}` : "",
      ].filter(Boolean);
      return [rows.join("\n"), `${l.amount.toFixed(2)} €`];
    }),
    styles: { fontSize: 8, valign: "top", cellPadding: 3 },
    headStyles: { fillColor: [15, 184, 127] },
    columnStyles: { 1: { halign: "right", cellWidth: 30 } },
    margin: { bottom: 42 },
  });

  // @ts-ignore autotable adds lastAutoTable
  y = (doc as any).lastAutoTable?.finalY ?? y + 20;
  y += 10;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + 35 > pageHeight - 42) {
    doc.addPage();
    y = 30;
  }
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  const vatExempt = data.partner.construction_company === true;
  doc.text(`Total HT: ${data.totalHt.toFixed(2)} €`, pageWidth - 14, y, { align: "right" });
  doc.text(
    `TVA (${vatExempt ? 0 : 20} %): ${(vatExempt ? 0 : data.vat).toFixed(2)} €`,
    pageWidth - 14,
    y + 6,
    { align: "right" },
  );
  doc.setFontSize(12);
  doc.setTextColor(15, 184, 127);
  doc.text(`Total TTC: ${data.totalTtc.toFixed(2)} €`, pageWidth - 14, y + 13, { align: "right" });
  if (vatExempt) {
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(
      "TVA non applicable — autoliquidation par le preneur (art. 283-2 nonies du CGI).",
      14,
      y + 20,
    );
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawCompanyFooter(doc);
  }

  return doc.output("datauristring").split(",")[1];
}
