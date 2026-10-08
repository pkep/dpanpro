import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS } from '@/types/intervention.types';
import type { QuoteLine } from '@/services/interfaces/quotes.interface';
import type { QuoteModification } from '@/services/interfaces/quote-modifications.interface';
import { services } from '@/services/factory';
import { resolveClientName } from '@/lib/clientName';
import { loadPdfAssets, PDF_LOGO_WIDTH, PDF_LOGO_HEIGHT, PDF_CERTIFIE_WIDTH, PDF_CERTIFIE_HEIGHT } from '@/lib/pdfAssets';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface InvoiceData {
  intervention: Intervention;
  quoteLines: QuoteLine[];
  approvedModifications: QuoteModification[];
  technicianName: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  isCompany: boolean;
  companyName: string | null;
  siren: string | null;
  vatNumber: string | null;
  invoiceNumber: string;
  invoiceDate: Date;
  finalAmount: number;
  vatRate: number;
  questionnaireAnswers: string[];
  /** Partenaire B2B « entreprise de construction » → facture en autoliquidation de TVA. */
  constructionCompany: boolean;
  signatureData?: string | null;
  signatureAt?: string | null;
}

const COMPANY_INFO = {
  name: 'Depan.Pro',
  address: '7, place du 11 Novembre 1918',
  city: '93000 Bobigny',
  phone: '01 84 60 86 30',
  email: 'contact@depan.pro',
  siren: '992 525 576',
  siret: '992 525 576 00011',
  tva: 'FR41 992 525 576',
};

// Depan.Pro brand color (green)
const BRAND_GREEN: [number, number, number] = [15, 184, 127]; // #0FB87F

const FONT_NAME = 'PlusJakartaSans';

/** Fetch a TTF file from public/fonts and register it in jsPDF */
async function registerFont(
  doc: jsPDF,
  url: string,
  fileName: string,
  style: 'normal' | 'bold',
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    doc.addFileToVFS(fileName, base64);
    doc.addFont(fileName, FONT_NAME, style);
  } catch {
    // Silently fall back to helvetica if fonts can't be loaded
  }
}

function formatDateFr(d: Date): string {
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

class InvoiceService {
  /**
   * Generate invoice number from intervention
   */
  private generateInvoiceNumber(interventionId: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = interventionId.substring(0, 8).toUpperCase();
    return `${year}${month}-${shortId}`;
  }

  /**
   * Prepare invoice data from intervention
   */
  async prepareInvoiceData(interventionId: string): Promise<InvoiceData> {
    const intervention = await services.interventions.getIntervention(interventionId);
    // Get quote lines
    const quoteLines = await services.quotes.getQuoteLines(interventionId);

    // Get approved modifications
    const modifications = await services.quoteModifications.getModificationsByIntervention(interventionId);
    const approvedModifications = modifications.filter(m => m.status === 'approved');

    // Get technician name
    let technicianName = 'Non assigné';
    if (intervention.technicianId) {
      const techData = await services.users.getUser(intervention.technicianId);
      if (techData) {
        technicianName = `${techData.firstName} ${techData.lastName}`;
      }
    }

    // Get client info (name, company status, etc.)
    let accountFirstName: string | null = null;
    let accountLastName: string | null = null;
    let isCompany = false;
    let companyName: string | null = null;
    let clientAddress: string | null = null;
    let siren: string | null = null;
    let vatNumber: string | null = null;

    if (intervention.clientId) {
      const clientData = await services.users.getUser(intervention.clientId);
      if (clientData) {
        accountFirstName = clientData.firstName;
        accountLastName = clientData.lastName;
        isCompany = clientData.isCompany || false;
        companyName = clientData.companyName || null;
        clientAddress = clientData.companyAddress || null;
        siren = clientData.siren || null;
        vatNumber = clientData.vatNumber || null;
      }
    }

    // Nom : compte, sinon contact B2B, sinon contact saisi (invité), sinon "Client".
    const clientName = resolveClientName({
      accountFirstName,
      accountLastName,
      b2bContactFirstName: intervention.b2bContactFirstName,
      b2bContactLastName: intervention.b2bContactLastName,
      clientFirstName: intervention.clientFirstName,
      clientLastName: intervention.clientLastName,
    });

    // Get VAT rate based on client type and service
    let vatRate = isCompany ? 20 : 10; // Default rates
    try {
      const servicesList = await services.services.getActiveServices();
      const service = servicesList.find(s => s.code === intervention.category);
      if (service) {
        vatRate = isCompany ? service.vatRateProfessional : service.vatRateIndividual;
      }
    } catch (err) {
      console.error('Error fetching service for VAT rate:', err);
    }

    // B2B « entreprise de construction » → autoliquidation de TVA (art. 283-2 nonies du CGI).
    let constructionCompany = false;
    if (intervention.b2bPartnerId) {
      try {
        const partner = await services.b2b.getPartner(intervention.b2bPartnerId);
        constructionCompany = partner.constructionCompany === true;
      } catch (err) {
        console.error('Error fetching B2B partner for VAT exemption:', err);
      }
    }

    // Get questionnaire answers for labor line detail
    let questionnaireAnswers: string[] = [];
    try {
      if (intervention && Array.isArray(intervention.questionnaireAnswers)) {
        questionnaireAnswers = (intervention.questionnaireAnswers as unknown[]).map(String);
      }
    } catch { /* silent */ }

    // Calculate final amount
    const baseTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
    const additionalTotal = approvedModifications.reduce(
      (sum, mod) => sum + mod.totalAdditionalAmount,
      0
    );

    const invoiceDate = intervention.invoiceSignedAt ? new Date(intervention.invoiceSignedAt) : new Date();

    return {
      intervention,
      quoteLines,
      approvedModifications,
      technicianName,
      clientName,
      clientEmail: intervention.clientEmail,
      clientPhone: intervention.clientPhone,
      clientAddress,
      isCompany,
      companyName,
      siren,
      vatNumber,
      invoiceNumber: this.generateInvoiceNumber(intervention.id, invoiceDate),
      invoiceDate,
      finalAmount: baseTotal + additionalTotal,
      vatRate,
      questionnaireAnswers,
      constructionCompany,
      signatureData: intervention.invoiceSignatureData,
      signatureAt: intervention.invoiceSignedAt,
    };
  }
  /**
   * Generate PDF invoice
   */
  async generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
    const doc  = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { logo, certifie } = await loadPdfAssets();

    // ── Palette ───────────────────────────────────────────────────────────
    const primaryColor = BRAND_GREEN;
    const textDark: [number, number, number] = [31, 41, 55];
    const textMuted: [number, number, number] = [107, 114, 128];

    // Totals
    const vatExempt = data.constructionCompany === true;
    const vatRate = vatExempt ? 0 : (data.isCompany ? 20 : 10);
    const baseTotal = data.quoteLines.reduce((s: number, l: any) => s + Number(l.calculatedPrice), 0);
    const additionalTotal = data.approvedModifications.reduce((s: number, m: any) => s + Number(m.totalAdditionalAmount), 0);
    const totalHT = baseTotal + additionalTotal;
    const tva = vatExempt ? 0 : totalHT * (vatRate / 100);
    const totalTTC = totalHT + tva;

    const fmt = (n: number) => n.toFixed(2) + ' \u20ac';

    let yPos = 20;

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 8, "F");

    // Logo (remplace le titre texte « Depan.Pro »)
    doc.addImage(logo, 'PNG', 20, 13.33, PDF_LOGO_WIDTH, PDF_LOGO_HEIGHT);

    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "normal");
    yPos = 36;
    doc.text(COMPANY_INFO.address, 20, yPos);
    yPos += 5;
    doc.text(COMPANY_INFO.city, 20, yPos);
    yPos += 5;
    doc.text(`Tél: ${COMPANY_INFO.phone}`, 20, yPos);
    yPos += 5;
    doc.text(`Email: ${COMPANY_INFO.email}`, 20, yPos);
    yPos += 5;
    doc.text(`SIREN: ${COMPANY_INFO.siren}`, 20, yPos);
    yPos += 5;
    doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPos);
    yPos += 5;
    doc.text(`N° TVA: ${COMPANY_INFO.tva}`, 20, yPos);

    doc.setFontSize(28);
    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE", pageWidth - 20, 28, { align: "right" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${data.invoiceNumber}`, pageWidth - 20, 38, { align: "right" });
    const date = await formatDateFr(data.invoiceDate);
    doc.text(`Date: ${date}`, pageWidth - 20, 45, { align: "right" });

    yPos = 72;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    yPos = 77;
    const clientBoxHeight = data.isCompany ? 50 : 40;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(pageWidth - 95, yPos, 75, clientBoxHeight, 3, 3, "F");

    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURER À", pageWidth - 90, yPos + 8);

    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "normal");

    let cY = yPos + 16;
    if (data.isCompany && data.companyName) {
      doc.setFont("helvetica", "bold");
      doc.text(data.companyName, pageWidth - 90, cY);
      cY += 6;
      doc.setFont("helvetica", "normal");
    }
    doc.text(data.clientName, pageWidth - 90, cY);
    cY += 6;
    if (data.clientEmail) {
      doc.text(data.clientEmail, pageWidth - 90, cY);
      cY += 6;
    }
    if (data.clientPhone) {
      doc.text(data.clientPhone, pageWidth - 90, cY);
      cY += 6;
    }
    if (data.isCompany && data.siren) doc.text(`SIREN: ${data.siren}`, pageWidth - 90, cY);

    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("INTERVENTION", 20, yPos + 8);

    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "normal");
    doc.text(data.intervention.title || "", 20, yPos + 16);
    doc.setTextColor(...textMuted);
    doc.text(`${data.intervention.address || ""}`, 20, yPos + 22);
    doc.text(`${data.intervention.postalCode || ""} ${data.intervention.city || ""}`, 20, yPos + 28);
    doc.text(`Catégorie: ${CATEGORY_LABELS[data.intervention.category] || data.intervention.category}`, 20, yPos + 34);
    doc.text(`Technicien: ${data.technicianName}`, 20, yPos + 40);
    if (data.intervention.trackingCode) doc.text(`Réf: ${data.intervention.trackingCode}`, 20, yPos + 46);

    yPos = 128;

    const tableData: (string | number)[][] = [];
    data.quoteLines.forEach((line: any) => {
      tableData.push([
        line.label,
        "Devis initial",
        `${Number(line.basePrice).toFixed(2)} €`,
        `×${line.multiplier}`,
        `${Number(line.calculatedPrice).toFixed(2)} €`,
      ]);
    });
    data.approvedModifications.forEach((mod: any) => {
      const items = (mod.items || []).filter((it: any) => it.modificationId === mod.id);
      items.forEach((item: any) => {
        tableData.push([
          item.label,
          "Supplément approuvé",
          `${Number(item.unitPrice).toFixed(2)} €`,
          `×${item.quantity}`,
          `${Number(item.totalPrice).toFixed(2)} €`,
        ]);
      });
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Description", "Type", "Prix unitaire", "Qté/Coef.", "Total"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: textDark },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 30, halign: "right" },
      },
      margin: { left: 20, right: 20 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
    yPos = finalY + 15;

    const totalsBoxWidth = 80;
    const totalsBoxX = pageWidth - 20 - totalsBoxWidth;

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(totalsBoxX, yPos, totalsBoxWidth, vatExempt ? 30 : 45, 3, 3, "F");

    if (vatExempt) {
      // Autoliquidation de TVA (sous-traitance BTP) : pas de TVA, pas de « Total TTC ».
      doc.setFontSize(12);
      doc.setTextColor(...textDark);
      doc.setFont("helvetica", "bold");
      doc.text("Total HT:", totalsBoxX + 5, yPos + 18);
      doc.setTextColor(...primaryColor);
      doc.text(`${totalHT.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 18, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text(
        "TVA non applicable — autoliquidation par le preneur (art. 283-2 nonies du CGI).",
        totalsBoxX,
        yPos + 37,
        { maxWidth: totalsBoxWidth },
      );
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text("Sous-total HT:", totalsBoxX + 5, yPos + 10);
      doc.text(`${totalHT.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 10, { align: "right" });
      doc.text(`TVA (${vatRate}%):`, totalsBoxX + 5, yPos + 20);
      doc.text(`${tva.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 20, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.line(totalsBoxX + 5, yPos + 26, totalsBoxX + totalsBoxWidth - 5, yPos + 26);

      doc.setFontSize(12);
      doc.setTextColor(...textDark);
      doc.setFont("helvetica", "bold");
      doc.text("Total TTC:", totalsBoxX + 5, yPos + 38);
      doc.setTextColor(...primaryColor);
      doc.text(`${totalTTC.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 38, { align: "right" });
    }

    // Signature « certifiée » (la signature manuscrite n'est plus affichée)
    const signatureData: string | null = data.intervention.invoiceSignatureData || null;
    if (signatureData) {
      try {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textDark);
        const at = data.intervention.invoiceSignedAt ? new Date(data.intervention.invoiceSignedAt) : null;
        const label = at ? ` le ${format(at, 'dd/MM/yyyy HH:mm', { locale: fr })}` : '';
        const signText = `Signé électroniquement${label}`;
        doc.text(signText, 20, yPos);
        doc.addImage(
          certifie,
          'JPEG',
          20 + doc.getTextWidth(signText) / 2 - PDF_CERTIFIE_WIDTH / 2,
          yPos + 6,
          PDF_CERTIFIE_WIDTH,
          PDF_CERTIFIE_HEIGHT,
        );
      } catch (err) {
        console.error("Error adding certified badge to PDF:", err);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, yPos + 5, 80, 35, 2, 2, "FD");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text("En attente de signature", 60, yPos + 25, { align: "center" });
    }

    yPos += 58;
    const footerY = doc.internal.pageSize.getHeight() - 26.03;
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, "F");
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text("PAYÉE", pageWidth / 2, yPos + 13, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Merci pour votre confiance ! Pour toute question, contactez-nous à ${COMPANY_INFO.email}`,
      pageWidth / 2,
      footerY,
      { align: "center" },
    );
    doc.text(
      `${COMPANY_INFO.name} - SIRET ${COMPANY_INFO.siret} - N° TVA ${COMPANY_INFO.tva}`,
      pageWidth / 2,
      footerY + 6,
      { align: "center" },
    );

    return doc;
  }

  /**
   * Generate and download invoice
   */
  async generateAndDownloadInvoice(intervention: Intervention): Promise<void> {
    const data = await this.prepareInvoiceData(intervention.id);
    const pdf = await this.generateInvoicePDF(data);
    // Download
    pdf.save(`facture-${data.invoiceNumber}.pdf`);
  }

  /**
   * Generate invoice as Blob (for upload/email)
   */
  async generateInvoiceBlob(intervention: Intervention): Promise<Blob> {
    const data = await this.prepareInvoiceData(intervention.id);
    const pdf = await this.generateInvoicePDF(data);
    
    return pdf.output('blob');
  }

  /**
   * Generate invoice as base64 (for email attachment)
   */
  async generateInvoiceBase64(intervention: Intervention): Promise<{ base64: string; fileName: string }> {
    const data = await this.prepareInvoiceData(intervention.id);
    const pdf = await this.generateInvoicePDF(data);
    
    // Get base64 without data URI prefix
    const base64 = pdf.output('datauristring').split(',')[1];
    const fileName = `facture-${data.invoiceNumber}.pdf`;
    
    return { base64, fileName };
  }
}

export const invoiceService = new InvoiceService();
