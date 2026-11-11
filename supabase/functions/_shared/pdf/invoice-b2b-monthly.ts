/**
 * Générateur de PDF de facture mensuelle B2B (jsPDF) — partagé edge functions.
 * Le PDF est produit en mémoire (aucune persistance ici).
 */
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import { LOGO_DATA_URI, LOGO_WIDTH, LOGO_HEIGHT } from "../assets.ts";
import { drawCompanyFooter } from "./document-layout.ts";
import { computeB2bVat } from "../b2b-vat.ts";

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
  /** Date d'émission (ISO ou dd/mm/yyyy). Défaut : aujourd'hui. */
  generatedAt?: string | null;
  periodStart: string;
  periodEnd: string;
  partner: {
    company_name?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    siret?: string | null;
    vat_number?: string | null;
    contact_firstname?: string | null;
    contact_lastname?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    /** Entreprise de construction (BTP) : facture en autoliquidation de TVA. */
    construction_company?: boolean | null;
  };
  lines: B2bInvoiceLine[];
  totalHt: number;
  vat: number;
  totalTtc: number;
}

const MARGIN = 19; // mm — jsPDF est configuré en millimètres par défaut
const TEXT_DARK: [number, number, number] = [17, 24, 39];
const TEXT_BODY: [number, number, number] = [55, 65, 81];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];

function money(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function formatFrDate(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
  }
  return value;
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 4.2,
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/** Construit le PDF (base64, sans préfixe data URI). */
export function buildInvoiceB2bMonthlyPdfBase64(data: B2bInvoicePdfInput): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = MARGIN;
  const right = pageWidth - MARGIN;
  const contentWidth = right - left;
  const amountWidth = 24;
  const textWidth = contentWidth - amountWidth - 3;
  const footerTop = pageHeight - 32;

  const { vatExempt, vatRate, vatAmount, totalTtc } = computeB2bVat(
    data.totalHt,
    data.partner.construction_company === true,
  );
  const emissionDate = formatFrDate(data.generatedAt ?? new Date().toISOString());
  const periodStart = formatFrDate(data.periodStart);
  const periodEnd = formatFrDate(data.periodEnd);

  // ── En-tête ─────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Date : ${emissionDate}`, left, 18);

  doc.setFont("helvetica", "bold");
  doc.text("Facture mensuelle N°", left, 24);
  const labelWidth = doc.getTextWidth("Facture mensuelle N° ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.text(data.number, left + labelWidth, 24);

  doc.setTextColor(...TEXT_DARK);
  doc.text(`Période : ${periodStart} -> ${periodEnd}`, left, 30);

  doc.addImage(LOGO_DATA_URI, "PNG", right - LOGO_WIDTH, 14, LOGO_WIDTH, LOGO_HEIGHT);

  // ── Titre ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(...TEXT_DARK);
  doc.text("FACTURE MENSUELLE", right, 52, { align: "right" });

  // ── Récapitulatif / Facturé à ───────────────────────────────────────────
  let leftY = 70;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_BODY);
  doc.text("Récapitulatif :", left, leftY);
  leftY += 6;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(9.2);
  doc.text(`${data.lines.length} interventions réalisées`, left, leftY);
  leftY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_BODY);
  doc.text(`Période du ${periodStart} -> ${periodEnd}`, left, leftY);
  leftY += 8;

  doc.setFontSize(8.5);
  leftY = drawWrapped(
    doc,
    "Document de facturation groupé du mois. Les factures par intervention sont des justificatifs et ne doivent pas être réglées séparément.",
    left,
    leftY,
    95,
    4.2,
  );

  let rightY = 70;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_BODY);
  doc.text("Facturé à :", right, rightY, { align: "right" });
  rightY += 6;

  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (data.partner.company_name) {
    doc.text(data.partner.company_name, right, rightY, { align: "right" });
    rightY += 5;
  }
  const contactName = [data.partner.contact_firstname, data.partner.contact_lastname]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (contactName) {
    doc.setFontSize(11);
    doc.text(contactName, right, rightY, { align: "right" });
    rightY += 5;
  }

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_BODY);
  if (data.partner.contact_email) {
    doc.setFont("helvetica", "bold");
    doc.text(data.partner.contact_email, right, rightY, { align: "right" });
    rightY += 4;
  }
  if (data.partner.contact_phone) {
    doc.setFont("helvetica", "bold");
    doc.text(data.partner.contact_phone, right, rightY, { align: "right" });
    rightY += 4;
  }
  doc.setFont("helvetica", "normal");
  if (data.partner.address) {
    doc.text(data.partner.address, right, rightY, { align: "right" });
    rightY += 4;
  }
  const cityLine = [data.partner.postal_code, data.partner.city].filter(Boolean).join(" ");
  if (cityLine) {
    doc.text(cityLine, right, rightY, { align: "right" });
    rightY += 4;
  }
  if (data.partner.siret) {
    doc.text(`SIRET : ${data.partner.siret}`, right, rightY, { align: "right" });
    rightY += 4;
  }
  if (data.partner.vat_number) {
    doc.text(`TVA intra. : ${data.partner.vat_number}`, right, rightY, {
      align: "right",
    });
    rightY += 4;
  }

  let y = Math.max(leftY, rightY) + 8;

  const drawTableHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_DARK);
    doc.text("INTERVENTION", left, y);
    doc.text("MONTANT HT", right, y, { align: "right" });
    y += 3;
    doc.setDrawColor(...TEXT_DARK);
    doc.setLineWidth(0.5);
    doc.line(left, y, right, y);
    y += 6;
  };

  drawTableHeader();

  for (const line of data.lines) {
    type Block = { text: string; bold?: boolean; size?: number; color?: [number, number, number]; gapBefore?: number };
    const blocks: Block[] = [];
    if (line.interventionDate) blocks.push({ text: line.interventionDate, bold: true, size: 9.2 });
    if (line.externalRef) blocks.push({ text: `Réf. externe : ${line.externalRef}`, size: 9 });
    if (line.address) blocks.push({ text: `Adresse : ${line.address}`, size: 9 });
    if (line.details?.length) blocks.push({ text: `Détail : ${line.details.join(" ; ")}`, size: 9 });
    if (line.technicianName) blocks.push({ text: `Technicien : ${line.technicianName}`, size: 9 });
    if (line.trackingCode) {
      blocks.push({
        text: `Prestation de services en sous-traitance - Référence ${line.trackingCode}`,
        size: 9,
        gapBefore: 2,
      });
    }
    if (line.perServiceInvoiceNumber) {
      blocks.push({ text: `Facture intervention : ${line.perServiceInvoiceNumber}`, size: 7.6, color: TEXT_MUTED });
    }

    const lineHeights = blocks.map((b) => {
      doc.setFontSize(b.size ?? 9);
      doc.setFont("helvetica", b.bold ? "bold" : "normal");
      return (doc.splitTextToSize(b.text, textWidth) as string[]).length * 4.2 + (b.gapBefore ?? 0);
    });
    const rowHeight = lineHeights.reduce((sum, h) => sum + h, 0) + 4;

    if (y + rowHeight > footerTop) {
      doc.addPage();
      y = 30;
      drawTableHeader();
    }

    const rowTop = y;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.gapBefore) y += block.gapBefore;
      doc.setFontSize(block.size ?? 9);
      doc.setFont("helvetica", block.bold ? "bold" : "normal");
      doc.setTextColor(...(block.color ?? TEXT_BODY));
      const wrapped = doc.splitTextToSize(block.text, textWidth) as string[];
      for (const part of wrapped) {
        doc.text(part, left, y);
        y += 4.2;
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_DARK);
    doc.text(money(line.amount), right, rowTop, { align: "right" });

    y += 3;
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.1);
    doc.line(left, y, right, y);
    y += 4;
  }

  // ── Conditions + totaux ─────────────────────────────────────────────────
  if (y + 22 > footerTop) {
    doc.addPage();
    y = 30;
  }

  const totalsTop = y + 4;
  doc.setFontSize(8.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_BODY);
  doc.text("Échéance : à réception de la facture", left, totalsTop);
  if (vatExempt) {
    doc.setFontSize(8.5);
    drawWrapped(
      doc,
      "TVA non applicable — autoliquidation par le preneur (art. 283-2 nonies du CGI).",
      left,
      totalsTop + 10,
      60,
      4.2,
    );
  }

  const totalsX = right - 72;
  let ty = totalsTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text("TOTAL HT", totalsX, ty);
  doc.text(money(data.totalHt), right, ty, { align: "right" });
  ty += 6;
  doc.text(`TVA (${vatRate} %)`, totalsX, ty);
  doc.text(money(vatAmount), right, ty, { align: "right" });
  ty += 6;
  doc.setDrawColor(...TEXT_DARK);
  doc.setLineWidth(0.4);
  doc.line(totalsX, ty - 3, right, ty - 3);
  doc.setFontSize(11);
  doc.text("TOTAL TTC", totalsX, ty + 3);
  doc.text(money(totalTtc), right, ty + 3, { align: "right" });

  // ── Footer sur toutes les pages ─────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawCompanyFooter(doc, MARGIN);
  }

  return doc.output("datauristring").split(",")[1];
}
