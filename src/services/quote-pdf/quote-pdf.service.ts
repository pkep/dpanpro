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

export interface QuotePDFData {
  intervention: Intervention;
  quoteLines: QuoteLine[];
  pendingModifications: QuoteModification[];
  technicianName: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  isCompany: boolean;
  companyName: string | null;
  siren: string | null;
  vatNumber: string | null;
  quoteNumber: string;
  quoteDate: Date;
  totalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  signatureData?: string | null;
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

const BRAND_GREEN: [number, number, number] = [15, 184, 127];

class QuotePDFService {
  private generateQuoteNumber(interventionId: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = interventionId.substring(0, 8).toUpperCase();
    return `DEV-${year}${month}-${shortId}`;
  }

  async prepareQuotePDFData(
    intervention: Intervention,
    signatureData?: string | null
  ): Promise<QuotePDFData> {
    const quoteLines = await quotesService.getQuoteLines(intervention.id);

    const modifications = await quoteModificationsService.getModificationsByIntervention(intervention.id);
    const pendingModifications = modifications.filter(m => m.status === 'approved');

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

    let clientName = 'Client';
    let isCompany = false;
    let companyName: string | null = null;
    let clientAddress: string | null = null;
    let siren: string | null = null;
    let vatNumber: string | null = null;

    if (intervention.clientId) {
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
    }

    let vatRate = isCompany ? 20 : 10;
    try {
      const services = await servicesService.getActiveServices();
      const service = services.find(s => s.code === intervention.category);
      if (service) {
        vatRate = isCompany ? service.vatRateProfessional : service.vatRateIndividual;
      }
    } catch (err) {
      console.error('Error fetching service for VAT rate:', err);
    }

    const baseTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
    const additionalTotal = pendingModifications.reduce(
      (sum, mod) => sum + mod.totalAdditionalAmount,
      0
    );
    const totalHT = baseTotal + additionalTotal;
    const vatAmount = Math.round(totalHT * (vatRate / 100) * 100) / 100;
    const totalTTC = Math.round((totalHT + vatAmount) * 100) / 100;

    const quoteDate = new Date();

    return {
      intervention,
      quoteLines,
      pendingModifications,
      technicianName,
      clientName,
      clientEmail: intervention.clientEmail,
      clientPhone: intervention.clientPhone,
      clientAddress,
      isCompany,
      companyName,
      siren,
      vatNumber,
      quoteNumber: this.generateQuoteNumber(intervention.id, quoteDate),
      quoteDate,
      totalHT,
      vatRate,
      vatAmount,
      totalTTC,
      signatureData,
    };
  }

  async generateQuotePDF(data: QuotePDFData): Promise<jsPDF> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const primaryColor: [number, number, number] = BRAND_GREEN;
    const textDark: [number, number, number] = [31, 41, 55];
    const textMuted: [number, number, number] = [107, 114, 128];

    let yPos = 20;

    // Header bar
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
    doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPos);
    yPos += 5;
    doc.text(`N° TVA: ${COMPANY_INFO.tva}`, 20, yPos);

    // Title
    doc.setFontSize(28);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', pageWidth - 20, 28, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° ${data.quoteNumber}`, pageWidth - 20, 38, { align: 'right' });
    doc.text(
      `Date: ${format(data.quoteDate, 'dd MMMM yyyy', { locale: fr })}`,
      pageWidth - 20,
      45,
      { align: 'right' }
    );

    // Separator
    yPos = 70;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    // Client Info Box
    yPos = 75;
    const clientBoxHeight = data.isCompany ? 50 : 40;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(pageWidth - 95, yPos, 75, clientBoxHeight, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT', pageWidth - 90, yPos + 8);

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

    // Quote Lines Table
    yPos = 140;

    const tableData: (string | number)[][] = [];

    data.quoteLines.forEach((line) => {
      tableData.push([
        line.label,
        'Devis initial',
        `${line.basePrice.toFixed(2)} €`,
        `×${line.multiplier}`,
        `${line.calculatedPrice.toFixed(2)} €`,
      ]);
    });

    data.pendingModifications.forEach((mod) => {
      mod.items.forEach((item) => {
        tableData.push([
          item.label,
          'Prestation complémentaire',
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
        1: { cellWidth: 40 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
    yPos = finalY + 15;

    // Totals Box
    const totalsBoxWidth = 80;
    const totalsBoxX = pageWidth - 20 - totalsBoxWidth;

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(totalsBoxX, yPos, totalsBoxWidth, 45, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    doc.text('Total HT:', totalsBoxX + 5, yPos + 10);
    doc.text(`${data.totalHT.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 10, { align: 'right' });

    doc.text(`TVA (${data.vatRate}%):`, totalsBoxX + 5, yPos + 20);
    doc.text(`${data.vatAmount.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 20, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(totalsBoxX + 5, yPos + 26, totalsBoxX + totalsBoxWidth - 5, yPos + 26);

    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('Total TTC:', totalsBoxX + 5, yPos + 38);
    doc.setTextColor(...primaryColor);
    doc.text(`${data.totalTTC.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 38, { align: 'right' });

    // Signature section
    yPos += 55;
    doc.setFontSize(10);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature du client:', 20, yPos);

    if (data.signatureData) {
      try {
        doc.addImage(data.signatureData, 'PNG', 20, yPos + 5, 60, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...textMuted);
        doc.text(
          `Signé le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
          20,
          yPos + 40
        );
      } catch (err) {
        console.error('Error adding signature to PDF:', err);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, yPos + 5, 80, 35, 2, 2, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text('En attente de signature', 60, yPos + 25, { align: 'center' });
    }

    // Validity notice
    yPos += 50;
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text('Ce devis est valable pour la durée de l\'intervention.', 20, yPos);
    doc.text('Bon pour accord et signature du client.', 20, yPos + 5);

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 20;
    doc.text(
      `${COMPANY_INFO.name} - SIRET ${COMPANY_INFO.siret} - N° TVA ${COMPANY_INFO.tva}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );

    return doc;
  }

  async generateAndDownloadQuote(intervention: Intervention, signatureData?: string | null): Promise<void> {
    const data = await this.prepareQuotePDFData(intervention, signatureData);
    const pdf = await this.generateQuotePDF(data);
    pdf.save(`devis-${data.quoteNumber}.pdf`);
  }

  async generateQuoteBase64(intervention: Intervention, signatureData?: string | null): Promise<{ base64: string; fileName: string }> {
    const data = await this.prepareQuotePDFData(intervention, signatureData);
    const pdf = await this.generateQuotePDF(data);

    const base64 = pdf.output('datauristring').split(',')[1];
    const fileName = `devis-${data.quoteNumber}.pdf`;

    return { base64, fileName };
  }
}

export const quotePDFService = new QuotePDFService();
