import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS } from '@/types/intervention.types';
import { quotesService, QuoteLine } from '@/services/quotes/quotes.service';
import { quoteModificationsService, QuoteModification } from '@/services/quote-modifications/quote-modifications.service';
import { supabase } from '@/integrations/supabase/client';
import { servicesService } from '@/services/services/services.service';
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
}

const COMPANY_INFO = {
  name: 'Depan.Pro',
  address: '7, place du 11 Novembre 1918',
  city: '93000 Bobigny',
  phone: '01 84 60 86 30',
  email: 'contact@depan-pro.com',
  siren: '992 525 576',
  siret: '992 525 576 00011',
  tva: 'FR41 992 525 576',
};

// Depan.Pro brand color (green)
const BRAND_GREEN: [number, number, number] = [15, 184, 127]; // #0FB87F

class InvoiceService {
  /**
   * Generate invoice number from intervention
   */
  private generateInvoiceNumber(interventionId: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = interventionId.substring(0, 8).toUpperCase();
    return `FAC-${year}${month}-${shortId}`;
  }

  /**
   * Prepare invoice data from intervention
   */
  async prepareInvoiceData(intervention: Intervention): Promise<InvoiceData> {
    // Get quote lines
    const quoteLines = await quotesService.getQuoteLines(intervention.id);

    // Get approved modifications
    const modifications = await quoteModificationsService.getModificationsByIntervention(intervention.id);
    const approvedModifications = modifications.filter(m => m.status === 'approved');

    // Get technician name
    let technicianName = 'Non assigné';
    if (intervention.technicianId) {
      const { data: techData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', intervention.technicianId)
        .single();
      if (techData) {
        technicianName = `${techData.first_name} ${techData.last_name}`;
      }
    }

    // Get client info (name, company status, etc.)
    let clientName = 'Client';
    let isCompany = false;
    let companyName: string | null = null;
    let clientAddress: string | null = null;
    let siren: string | null = null;
    let vatNumber: string | null = null;

    const { data: clientData } = await supabase
      .from('users')
      .select('first_name, last_name, is_company, company_name, company_address, siren, vat_number')
      .eq('id', intervention.clientId)
      .single();
    if (clientData) {
      clientName = `${clientData.first_name} ${clientData.last_name}`;
      isCompany = clientData.is_company || false;
      companyName = clientData.company_name;
      clientAddress = clientData.company_address;
      siren = clientData.siren;
      vatNumber = clientData.vat_number;
    }

    // Get VAT rate based on client type and service
    let vatRate = isCompany ? 20 : 10; // Default rates
    try {
      const services = await servicesService.getActiveServices();
      const service = services.find(s => s.code === intervention.category);
      if (service) {
        vatRate = isCompany ? service.vatRateProfessional : service.vatRateIndividual;
      }
    } catch (err) {
      console.error('Error fetching service for VAT rate:', err);
    }

    // Calculate final amount
    const baseTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
    const additionalTotal = approvedModifications.reduce(
      (sum, mod) => sum + mod.totalAdditionalAmount,
      0
    );

    const invoiceDate = new Date();

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
    };
  }

  /**
   * Generate PDF invoice
   */
  async generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colors
    const primaryColor: [number, number, number] = BRAND_GREEN; // Depan.Pro green
    const textDark: [number, number, number] = [31, 41, 55];
    const textMuted: [number, number, number] = [107, 114, 128];

    let yPos = 20;

    // Header - Logo and Company Info
    // Draw a colored header bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 8, 'F');

    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name, 20, yPos + 5);

    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.setFont('helvetica', 'normal');
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

    // Invoice Title
    doc.setFontSize(28);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageWidth - 20, 28, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° ${data.invoiceNumber}`, pageWidth - 20, 38, { align: 'right' });
    doc.text(
      `Date: ${format(data.invoiceDate, 'dd MMMM yyyy', { locale: fr })}`,
      pageWidth - 20,
      45,
      { align: 'right' }
    );

    // Separator line
    yPos = 70;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    // Client Info Box
    yPos = 75;
    const clientBoxHeight = data.isCompany ? 50 : 40;
    doc.setFillColor(240, 253, 244); // Light green tint
    doc.roundedRect(pageWidth - 95, yPos, 75, clientBoxHeight, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURER À', pageWidth - 90, yPos + 8);
    
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'normal');
    
    let clientYPos = yPos + 16;
    if (data.isCompany && data.companyName) {
      doc.setFont('helvetica', 'bold');
      doc.text(data.companyName, pageWidth - 90, clientYPos);
      clientYPos += 6;
      doc.setFont('helvetica', 'normal');
    }
    doc.text(data.clientName, pageWidth - 90, clientYPos);
    clientYPos += 6;
    
    if (data.clientEmail) {
      doc.text(data.clientEmail, pageWidth - 90, clientYPos);
      clientYPos += 6;
    }
    if (data.clientPhone) {
      doc.text(data.clientPhone, pageWidth - 90, clientYPos);
      clientYPos += 6;
    }
    if (data.isCompany && data.siren) {
      doc.text(`SIREN: ${data.siren}`, pageWidth - 90, clientYPos);
    }

    // Intervention Info
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('INTERVENTION', 20, yPos + 8);
    
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'normal');
    doc.text(data.intervention.title, 20, yPos + 16);
    doc.setTextColor(...textMuted);
    doc.text(`${data.intervention.address}`, 20, yPos + 22);
    doc.text(`${data.intervention.postalCode} ${data.intervention.city}`, 20, yPos + 28);
    doc.text(`Catégorie: ${CATEGORY_LABELS[data.intervention.category]}`, 20, yPos + 34);
    doc.text(`Technicien: ${data.technicianName}`, 20, yPos + 40);
    if (data.intervention.trackingCode) {
      doc.text(`Réf: ${data.intervention.trackingCode}`, 20, yPos + 46);
    }

    // Quote Lines Table
    yPos = 140;

    // Build table data
    const tableData: (string | number)[][] = [];

    // Base quote lines
    data.quoteLines.forEach((line) => {
      tableData.push([
        line.label,
        'Devis initial',
        `${line.basePrice.toFixed(2)} €`,
        `×${line.multiplier}`,
        `${line.calculatedPrice.toFixed(2)} €`,
      ]);
    });

    // Approved modifications
    data.approvedModifications.forEach((mod) => {
      mod.items.forEach((item) => {
        tableData.push([
          item.label,
          'Supplément approuvé',
          `${item.unitPrice.toFixed(2)} €`,
          `×${item.quantity}`,
          `${item.totalPrice.toFixed(2)} €`,
        ]);
      });
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Type', 'Prix unitaire', 'Qté/Coef.', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: textDark,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
    yPos = finalY + 15;

    // Totals Box
    const totalsBoxWidth = 80;
    const totalsBoxX = pageWidth - 20 - totalsBoxWidth;
    
    // Calculate totals
    const baseTotal = data.quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
    const additionalTotal = data.approvedModifications.reduce(
      (sum, mod) => sum + mod.totalAdditionalAmount,
      0
    );
    const totalHT = baseTotal + additionalTotal;
    const tva = totalHT * (data.vatRate / 100);
    const totalTTC = totalHT + tva;

    doc.setFillColor(240, 253, 244); // Light green tint
    doc.roundedRect(totalsBoxX, yPos, totalsBoxWidth, 45, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    doc.text('Sous-total HT:', totalsBoxX + 5, yPos + 10);
    doc.text(`${totalHT.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 10, { align: 'right' });

    doc.text(`TVA (${data.vatRate}%):`, totalsBoxX + 5, yPos + 20);
    doc.text(`${tva.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 20, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(totalsBoxX + 5, yPos + 26, totalsBoxX + totalsBoxWidth - 5, yPos + 26);

    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('Total TTC:', totalsBoxX + 5, yPos + 38);
    doc.setTextColor(...primaryColor);
    doc.text(`${totalTTC.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 38, { align: 'right' });

    // Payment Status
    yPos += 55;
    doc.setFillColor(220, 252, 231); // Light green background
    doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74); // Green text
    doc.setFont('helvetica', 'bold');
    doc.text('✓ PAYÉE', pageWidth / 2, yPos + 13, { align: 'center' });

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Merci pour votre confiance ! Pour toute question, contactez-nous à ${COMPANY_INFO.email}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    doc.text(
      `${COMPANY_INFO.name} - SIRET ${COMPANY_INFO.siret} - N° TVA ${COMPANY_INFO.tva}`,
      pageWidth / 2,
      yPos + 6,
      { align: 'center' }
    );

    return doc;
  }

  /**
   * Generate and download invoice
   */
  async generateAndDownloadInvoice(intervention: Intervention): Promise<void> {
    const data = await this.prepareInvoiceData(intervention);
    const pdf = await this.generateInvoicePDF(data);
    
    // Download
    pdf.save(`facture-${data.invoiceNumber}.pdf`);
  }

  /**
   * Generate invoice as Blob (for upload/email)
   */
  async generateInvoiceBlob(intervention: Intervention): Promise<Blob> {
    const data = await this.prepareInvoiceData(intervention);
    const pdf = await this.generateInvoicePDF(data);
    
    return pdf.output('blob');
  }

  /**
   * Generate invoice as base64 (for email attachment)
   */
  async generateInvoiceBase64(intervention: Intervention): Promise<{ base64: string; fileName: string }> {
    const data = await this.prepareInvoiceData(intervention);
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
}

export const invoiceService = new InvoiceService();
