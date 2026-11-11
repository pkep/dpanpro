import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { LOGO_DATA_URI, LOGO_WIDTH, LOGO_HEIGHT } from "../assets.ts";

const COMPANY_INFO = {
  name: "Depan.Pro",
  address: "7, place du 11 Novembre 1918",
  city: "93000 Bobigny",
  phone: "01 84 60 86 30",
  email: "contact@depan.pro",
  siret: "992 525 576 00011",
  tva: "FR41 992 525 576",
};

const TEXT_DARK: [number, number, number] = [17, 24, 39];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];
const TEXT_BODY: [number, number, number] = [55, 65, 81];
const LINE: [number, number, number] = [209, 213, 219];

export interface PdfDocumentLine {
  label: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PdfDocumentData {
  title: "DEVIS" | "FACTURE";
  numberLabel: string;
  number: string;
  date: Date;
  clientLabel: string;
  metaLines: string[];
  service: string;
  /** Détail de l'intervention affiché après la catégorie (non gras). */
  interventionDetail?: string | null;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  tracking: string;
  technician: string;
  /** Affiche l'adresse et le n° de TVA du client (documents B2B). */
  showCompanyDetails: boolean;
  client: {
    name: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    vatNumber?: string | null;
  };
  lines: PdfDocumentLine[];
  totalHT: number;
  vatRate: number;
  vat: number;
  totalTTC: number;
  vatExempt: boolean;
  /** Optionnel : absent pour les factures (pas de conditions générales). */
  conditionsTitle?: string | null;
  conditionsLines?: string[];
  /** Optionnel : absent pour les factures (signature non requise). */
  signature?: {
    data?: string | null;
    id?: string | null;
    place?: string | null;
    date?: Date | null;
  } | null;
}

function money(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function qty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

function shortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function wrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 4.5): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export interface InlineTextSegment {
  text: string;
  bold?: boolean;
  size?: number;
  color?: [number, number, number];
}

/** Mesure la hauteur (nombre de lignes) d'une suite de segments inline. */
export function measureInlineSegments(
  doc: jsPDF,
  segments: InlineTextSegment[],
  maxWidth: number,
  defaultSize = 10,
): number {
  let lines = 1;
  let cursor = 0;
  for (const segment of segments) {
    doc.setFontSize(segment.size ?? defaultSize);
    doc.setFont("helvetica", segment.bold ? "bold" : "normal");
    const tokens = segment.text.split(/(\s+)/).filter(Boolean);
    for (const token of tokens) {
      const width = doc.getTextWidth(token);
      if (cursor + width > maxWidth && token.trim() !== "") {
        lines++;
        cursor = 0;
      }
      cursor += width;
    }
  }
  return lines;
}

/** Dessine des segments avec des styles différents, avec retour à la ligne. */
export function drawInlineSegments(
  doc: jsPDF,
  segments: InlineTextSegment[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 4.5,
  defaultSize = 10,
): number {
  let cursorX = x;
  let cursorY = y;
  for (const segment of segments) {
    doc.setFontSize(segment.size ?? defaultSize);
    doc.setFont("helvetica", segment.bold ? "bold" : "normal");
    if (segment.color) doc.setTextColor(...segment.color);
    const tokens = segment.text.split(/(\s+)/).filter(Boolean);
    for (const token of tokens) {
      const width = doc.getTextWidth(token);
      if (cursorX + width > x + maxWidth && token.trim() !== "") {
        cursorY += lineHeight;
        cursorX = x;
      }
      doc.text(token, cursorX, cursorY);
      cursorX += width;
    }
  }
  return cursorY + lineHeight;
}

/** Écrit la catégorie en gras puis « : détail » en normal, avec retour à la ligne. */
export function drawServiceWithDetail(
  doc: jsPDF,
  service: string,
  detail: string | null | undefined,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5,
): number {
  const segments: InlineTextSegment[] = [
    { text: service, bold: true, size: 10, color: TEXT_DARK },
  ];
  if (detail) {
    segments.push({ text: ` : ${detail}`, bold: false, size: 10, color: TEXT_DARK });
  }
  return drawInlineSegments(doc, segments, x, y, maxWidth, lineHeight, 10);
}

function wrappedRight(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 4.5): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    doc.text(line, x, y, { align: "right" });
    y += lineHeight;
  }
  return y;
}

/** Pied de page légal commun à tous les documents (devis, factures, factures mensuelles). */
export function drawCompanyFooter(doc: jsPDF, margin = 19) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = margin;
  const right = pageWidth - margin;
  const lineHeight = 4.5; // mm
  // 30 px ≈ 7.94 mm : dernière ligne à 8 mm du bas de page.
  const lastBaseline = pageHeight - 8;

  const leftLines = [
    { text: "Dépan.Pro", bold: true, size: 9.5 },
    { text: "SAS au capital de 1 000 €", bold: false, size: 8.5 },
    { text: COMPANY_INFO.phone, bold: false, size: 8.5 },
    { text: COMPANY_INFO.email, bold: false, size: 8.5 },
    { text: `${COMPANY_INFO.address}, ${COMPANY_INFO.city}`, bold: false, size: 8.5 },
  ];
  const topBaseline = lastBaseline - (leftLines.length - 1) * lineHeight;

  leftLines.forEach((line, index) => {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(line.size);
    doc.setTextColor(...(line.bold ? TEXT_DARK : TEXT_BODY));
    doc.text(line.text, left, topBaseline + index * lineHeight);
  });

  const rightLines = [
    `SIRET ${COMPANY_INFO.siret}`,
    "RCS",
    `N° TVA ${COMPANY_INFO.tva}`,
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_BODY);
  rightLines.forEach((line, index) => {
    doc.text(line, right, topBaseline + index * lineHeight, { align: "right" });
  });
}

export function renderDocumentPdf(data: PdfDocumentData): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 19;
  const right = pageWidth - 19;

  // En-tête : date + numéro à gauche, logo à droite.
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date : ${shortDate(data.date)}`, left, 18);

  doc.setFont("helvetica", "bold");
  doc.text(data.numberLabel, left, 24);
  const numberLabelWidth = doc.getTextWidth(`${data.numberLabel} `);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.text(data.number, left + numberLabelWidth, 24);

  doc.addImage(LOGO_DATA_URI, "PNG", right - LOGO_WIDTH, 14, LOGO_WIDTH, LOGO_HEIGHT);

  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text(data.title, right, 52, { align: "right" });

  // Parties.
  let y = 72;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_BODY);
  doc.text("Intervention :", left, y);
  y += 6;
  doc.setTextColor(...TEXT_DARK);
  y = drawServiceWithDetail(doc, data.service, data.interventionDetail, left, y, 95, 5);
  y = wrapped(doc, `${data.address}, ${data.city} ${data.postalCode}`.trim(), left, y, 95, 4.5);
  doc.text(data.phone || "", left, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Réf. : ${data.tracking}`, left, y);
  y += 5;
  doc.text(`Technicien : ${data.technician}`, left, y);

  let cy = 72;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_BODY);
  doc.text(data.clientLabel, right, cy, { align: "right" });
  cy += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  if (data.client.company) {
    doc.text(data.client.company, right, cy, { align: "right" });
    cy += 5;
  }
  doc.text(data.client.name, right, cy, { align: "right" });
  cy += 5;
  doc.setFont("helvetica", "normal");
  if (data.client.email) {
    doc.text(data.client.email, right, cy, { align: "right" });
    cy += 5;
  }
  if (data.client.phone) {
    doc.text(data.client.phone, right, cy, { align: "right" });
    cy += 5;
  }
  if (data.showCompanyDetails && data.client.address) {
    cy = wrappedRight(doc, data.client.address, right, cy, 70, 4.5);
  }
  if (data.showCompanyDetails && data.client.vatNumber) {
    doc.text(`TVA intra. : ${data.client.vatNumber}`, right, cy, { align: "right" });
    cy += 5;
  }

  let metaY = Math.max(y, cy) + 10;
  for (const line of data.metaLines) {
    doc.setTextColor(...TEXT_DARK);
    doc.text(line, left, metaY);
    metaY += 6;
  }

  const tableStartY = Math.max(metaY + 2, 112);
  const body = data.lines.map((line) => [
    line.description ? `${line.label}\n${line.description}` : line.label,
    qty(line.quantity),
    money(line.unitPrice),
    money(line.total),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["DESCRIPTION", "QTÉ", "PRIX UNIT.", "TOTAL"]],
    body,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: TEXT_DARK,
      cellPadding: { top: 2.2, right: 0, bottom: 2.2, left: 0 },
      lineWidth: 0,
    },
    headStyles: {
      fontStyle: "bold",
      fontSize: 8,
      textColor: TEXT_DARK,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
    margin: { left, right: 19 },
    didDrawCell: (hookData: any) => {
      if (hookData.section !== "head" && hookData.section !== "body") return;
      const cell = hookData.cell;
      doc.setDrawColor(...(hookData.section === "head" ? TEXT_DARK : LINE));
      doc.setLineWidth(hookData.section === "head" ? 0.5 : 0.1);
      doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
    },
  });

  let bottomY = (doc as any).lastAutoTable?.finalY ?? tableStartY + 20;
  bottomY += 12;
  if (bottomY > pageHeight - 70) {
    doc.addPage();
    bottomY = 30;
  }

  // Conditions et signature à gauche : uniquement pour les devis.
  // Une facture ne doit jamais afficher de bloc signature (« En attente de signature » inclus).
  const isQuote = data.title === "DEVIS";
  let leftY = bottomY;
  if (isQuote && data.conditionsTitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_DARK);
    doc.text(data.conditionsTitle, left, leftY);
    leftY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_BODY);
    for (const line of data.conditionsLines ?? []) {
      leftY = wrapped(doc, line, left, leftY, 95, 4.5);
    }
    leftY += 4;
  }

  if (isQuote && data.signature) {
    const hasSignature = Boolean(data.signature.data || data.signature.id);
    const signatureLabel = data.signature.id
      ? `Signé : ${data.signature.id}`
      : (hasSignature ? "Signé :" : "En attente de signature");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    doc.text(signatureLabel, left, leftY);
    leftY += 8;
    doc.setDrawColor(...TEXT_DARK);
    doc.setLineWidth(0.3);
    doc.line(left, leftY, left + 62, leftY);
    leftY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MUTED);
    const sigDate = data.signature.date || data.date;
    doc.text(`Le ${shortDate(sigDate)} à ${data.signature.place || data.city}`, left, leftY);
  }

  // Mention légale d'autoliquidation (factures et devis B2B construction).
  if (data.vatExempt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_BODY);
    const noteY = leftY > bottomY ? leftY + 4 : leftY;
    wrapped(
      doc,
      "TVA non applicable — autoliquidation par le preneur (art. 283-2 nonies du CGI).",
      left,
      noteY,
      95,
      4.5,
    );
  }

  // Totaux à droite.
  const totalsLabelX = right - 55;
  let ty = bottomY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text("TOTAL HT", totalsLabelX, ty);
  doc.text(money(data.totalHT), right, ty, { align: "right" });
  ty += 7;
  doc.text(`TVA (${data.vatRate} %)`, totalsLabelX, ty);
  doc.text(money(data.vat), right, ty, { align: "right" });
  ty += 7;
  doc.setDrawColor(...TEXT_DARK);
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, ty - 3, right, ty - 3);
  doc.text("TOTAL TTC", totalsLabelX, ty + 2);
  doc.text(money(data.totalTTC), right, ty + 2, { align: "right" });

  // Footer sur toutes les pages.
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawCompanyFooter(doc);
  }

  return doc.output("datauristring").split(",")[1];
}
