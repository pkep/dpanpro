import { supabase } from '@/integrations/supabase/client';
import type { IInvoiceService } from '@/services/interfaces/invoice.interface';
import { invoiceService, type InvoiceData } from '@/services/components/invoice/invoice.service';
import type { Intervention } from '@/types/intervention.types';
import { quotesService } from '@/services/supabase/quotes.service';
import { quoteModificationsService } from '@/services/supabase/quote-modifications.service';
import { resolveClientName } from '@/lib/clientName';

class SupabaseInvoiceService implements IInvoiceService {
  async prepareInvoiceData(intervention: Intervention): Promise<InvoiceData> {
    // Get quote lines
    const quoteLines = await quotesService.getQuoteLines(intervention.id);

    // Get approved modifications
    const modifications = await quoteModificationsService.getModificationsByIntervention(intervention.id);
    const approvedModifications = modifications.filter(m => m.status === 'approved');

    // Get technician info
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

    // Get client info
    let clientEmail = null;
    let clientPhone = null;
    let clientAddress = null;
    let isCompany = false;
    let companyName = null;
    let siren = null;
    let vatNumber = null;
    let accountFirstName: string | null = null;
    let accountLastName: string | null = null;

    if (intervention.clientId) {
      const { data: clientData } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, is_company, company_name, company_address, siren, vat_number')
        .eq('id', intervention.clientId)
        .single();

      if (clientData) {
        accountFirstName = clientData.first_name;
        accountLastName = clientData.last_name;
        clientEmail = clientData.email;
        clientPhone = clientData.phone;
        clientAddress = clientData.company_address;
        isCompany = clientData.is_company || false;
        companyName = clientData.company_name;
        siren = clientData.siren;
        vatNumber = clientData.vat_number;
      }
    }

    // Nom : compte, sinon contact B2B, sinon contact saisi (invité), sinon "Non spécifié".
    const clientName = resolveClientName(
      {
        accountFirstName,
        accountLastName,
        b2bContactFirstName: intervention.b2bContactFirstName,
        b2bContactLastName: intervention.b2bContactLastName,
        clientFirstName: intervention.clientFirstName,
        clientLastName: intervention.clientLastName,
      },
      'Non spécifié',
    );

    // Get questionnaire answers
    let questionnaireAnswers: string[] = [];
    if (intervention.id) {
      const { data: intData } = await supabase
        .from('interventions')
        .select('questionnaire_answers')
        .eq('id', intervention.id)
        .single();
      if (intData?.questionnaire_answers) {
        questionnaireAnswers = Array.isArray(intData.questionnaire_answers) ? intData.questionnaire_answers.map(String) : [];
      }
    }

    // Calculate totals and VAT
    const baseTotal = quoteLines.reduce((sum, line) => sum + Number(line.calculatedPrice || 0), 0);
    const additionalTotal = approvedModifications.reduce(
      (sum, m) => sum + Number(m.totalAdditionalAmount || 0),
      0
    );
    const totalHT = baseTotal + additionalTotal;
    const vatRate = 0.20; // 20% TVA standard
    const vatAmount = totalHT * vatRate;
    const totalTTC = totalHT + vatAmount;

    return {
      intervention,
      quoteLines,
      approvedModifications,
      technicianName,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      isCompany,
      companyName,
      siren: siren,
      vatNumber,
      invoiceNumber: `FAC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${intervention.id.substring(0, 8).toUpperCase()}`,
      invoiceDate: new Date(),
      finalAmount: totalTTC,
      vatRate,
      questionnaireAnswers,
    };
  }

  async sendInvoice(invoiceData: InvoiceData): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          interventionId: invoiceData.intervention.id,
          clientEmail: invoiceData.clientEmail,
          clientName: invoiceData.clientName,
          invoiceNumber: invoiceData.invoiceNumber,
          finalAmount: invoiceData.finalAmount,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }
  generateAndDownloadInvoice(intervention: Intervention): Promise<void> {
    return invoiceService.generateAndDownloadInvoice(intervention);
  }
  generateInvoiceBlob(intervention: Intervention): Promise<Blob> {
    return invoiceService.generateInvoiceBlob(intervention);
  }
  sendInvoiceByEmail(intervention: Intervention): Promise<boolean> {
    return invoiceService.sendInvoiceByEmail(intervention);
  }
  generateAndArchiveInvoice(intervention: Intervention): Promise<string> {
    return invoiceService.generateAndArchiveInvoice(intervention);
  }

}

export const supabaseInvoiceService = new SupabaseInvoiceService();

