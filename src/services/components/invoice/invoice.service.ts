import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS } from '@/types/intervention.types';
import type { QuoteLine } from '@/services/interfaces/quotes.interface';
import type { QuoteModification } from '@/services/interfaces/quote-modifications.interface';
import { services } from '@/services/factory';
import { supabase } from '@/integrations/supabase/client';
import { resolveClientName } from '@/lib/clientName';
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

async function formatDateFr(d: Date): Promise<string> {
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

    // ── Palette ───────────────────────────────────────────────────────────
    const primaryColor = BRAND_GREEN;
    const textDark: [number, number, number] = [31, 41, 55];
    const textMuted: [number, number, number] = [107, 114, 128];

    // Totals
    let vatRate = data.isCompany ? 20 : 10;
    const baseTotal = data.quoteLines.reduce((s: number, l: any) => s + Number(l.calculatedPrice), 0);
    const additionalTotal = data.approvedModifications.reduce((s: number, m: any) => s + Number(m.totalAdditionalAmount), 0);
    const totalHT = baseTotal + additionalTotal;
    const tva = totalHT * (vatRate / 100);
    const totalTTC = totalHT + tva;

    const fmt = (n: number) => n.toFixed(2) + ' \u20ac';

    let yPos = 20;

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 8, "F");

    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(COMPANY_INFO.name, 20, yPos + 5);

    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "normal");
    yPos += 13;
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

    yPos = 70;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    yPos = 75;
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

    yPos = 140;

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
    data.approvedModifications.forEach((mod: QuoteModification) => {
      const items = mod.items;
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
    doc.roundedRect(totalsBoxX, yPos, totalsBoxWidth, 45, 3, 3, "F");

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

    // Signature section
    doc.setFontSize(10);
    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "bold");
    doc.text("Signature du client:", 20, yPos);

    const signatureData: string | null = data.intervention.invoiceSignatureData || null;
    if (signatureData) {
      try {
        doc.addImage(signatureData, "PNG", 20, yPos + 5, 60, 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...textMuted);
        const signedAt = data.intervention.invoiceSignedAt ? new Date(data.intervention.invoiceSignedAt) : new Date();
        doc.text(
          `Signé le ${String(signedAt.getDate()).padStart(2, "0")}/${String(signedAt.getMonth() + 1).padStart(2, "0")}/${signedAt.getFullYear()}`,
          20,
          yPos + 40,
        );
      } catch (err) {
        console.error("Error adding signature to PDF:", err);
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

    yPos += 50;
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, "F");
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text("PAYÉE", pageWidth / 2, yPos + 13, { align: "center" });

    const footerY = doc.internal.pageSize.getHeight() - 30;
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
  /**
   * Send invoice by email
   */
  async sendInvoiceByEmail(intervention: Intervention): Promise<boolean> {
    try {
      const { base64, fileName } = await this.generateInvoiceBase64(intervention);
      
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          interventionId: intervention.id,
          invoiceBase64: base64,
          invoiceFileName: fileName,
        },
      });

      if (error) {
        console.error('Error sending invoice email:', error);
        return false;
      }

      return data?.success === true;
    } catch (err) {
      console.error('Error sending invoice email:', err);
      return false;
    }
  }

  /**
   * Generate invoice PDF and archive it to storage.
   * Path: {interventionId}/invoices/facture-{invoiceNumber}.pdf
   * Updates interventions.invoice_pdf_url in DB.
   */
  async generateAndArchiveInvoice(intervention: Intervention): Promise<string> {
    const { storageService, buildInterventionPath } = await import('@/services/components/utils/storage/storage.service');

    const data = await this.prepareInvoiceData(intervention.id);
    const pdf = await this.generateInvoicePDF(data);
    const blob = pdf.output('blob');

    const fileName = `facture-${data.invoiceNumber}.pdf`;
    const storagePath = buildInterventionPath(intervention.id, 'invoices', fileName);

    const file = new File([blob], fileName, { type: 'application/pdf' });
    const publicUrl = await storageService.uploadFileToPath('interventions', storagePath, file);

    // Update DB with URL
    await supabase
      .from('interventions')
      .update({ invoice_pdf_url: publicUrl } as any)
      .eq('id', intervention.id);

    console.log('[Invoice] Archived invoice to:', publicUrl);
    return publicUrl;
  }
}

export const invoiceService = new InvoiceService();
