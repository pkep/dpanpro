import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS } from '@/types/intervention.types';
import { quotesService, QuoteLine } from '@/services/quotes/quotes.service';
import { quoteModificationsService, QuoteModification } from '@/services/quote-modifications/quote-modifications.service';
import { supabase } from '@/integrations/supabase/client';
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
  invoiceNumber: string;
  invoiceDate: Date;
  finalAmount: number;
}

const COMPANY_INFO = {
  name: 'Dépan\'Express',
  address: '123 Avenue des Dépanneurs',
  city: '75001 Paris',
  phone: '01 23 45 67 89',
  email: 'contact@depanexpress.fr',
  siret: '123 456 789 00012',
  tva: 'FR12 345678901',
};

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

    // Get client name
    let clientName = 'Client';
    const { data: clientData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', intervention.clientId)
      .single();
    if (clientData) {
      clientName = `${clientData.first_name} ${clientData.last_name}`;
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
      invoiceNumber: this.generateInvoiceNumber(intervention.id, invoiceDate),
      invoiceDate,
      finalAmount: baseTotal + additionalTotal,
    };
  }

  /**
   * Generate PDF invoice
   */
  async generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colors
    const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
    const textDark: [number, number, number] = [31, 41, 55];
    const textMuted: [number, number, number] = [107, 114, 128];

    let yPos = 20;

    // Header - Company Info
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name, 20, yPos);

    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    doc.text(COMPANY_INFO.address, 20, yPos);
    yPos += 5;
    doc.text(COMPANY_INFO.city, 20, yPos);
    yPos += 5;
    doc.text(`Tél: ${COMPANY_INFO.phone}`, 20, yPos);
    yPos += 5;
    doc.text(`Email: ${COMPANY_INFO.email}`, 20, yPos);
    yPos += 5;
    doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPos);
    yPos += 5;
    doc.text(`TVA: ${COMPANY_INFO.tva}`, 20, yPos);

    // Invoice Title
    doc.setFontSize(28);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageWidth - 20, 25, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° ${data.invoiceNumber}`, pageWidth - 20, 35, { align: 'right' });
    doc.text(
      `Date: ${format(data.invoiceDate, 'dd MMMM yyyy', { locale: fr })}`,
      pageWidth - 20,
      42,
      { align: 'right' }
    );

    // Separator line
    yPos = 65;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    // Client Info Box
    yPos = 75;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(pageWidth - 90, yPos, 70, 35, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURER À', pageWidth - 85, yPos + 8);
    
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientName, pageWidth - 85, yPos + 16);
    if (data.clientEmail) {
      doc.text(data.clientEmail, pageWidth - 85, yPos + 22);
    }
    if (data.clientPhone) {
      doc.text(data.clientPhone, pageWidth - 85, yPos + 28);
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
    yPos = 135;

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
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(totalsBoxX, yPos, totalsBoxWidth, 45, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    doc.text('Sous-total HT:', totalsBoxX + 5, yPos + 10);
    doc.text(`${totalHT.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 10, { align: 'right' });

    doc.text('TVA (20%):', totalsBoxX + 5, yPos + 20);
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
    doc.setFillColor(220, 252, 231); // Green background
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
      'Merci pour votre confiance ! Pour toute question, contactez-nous à contact@depanexpress.fr',
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    doc.text(
      `${COMPANY_INFO.name} - ${COMPANY_INFO.siret} - TVA ${COMPANY_INFO.tva}`,
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
}

export const invoiceService = new InvoiceService();
