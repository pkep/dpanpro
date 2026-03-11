import { supabase } from '@/integrations/supabase/client';
import { invoiceService } from '@/services/invoice/invoice.service';
import type { Intervention } from '@/types/intervention.types';

export interface CancellationResult {
  success: boolean;
  hasFees: boolean;
  feeAmount?: number;
  invoiceSent?: boolean;
  error?: string;
}

interface CancellationFeeInfo {
  displacementPriceHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
}

class CancellationService {
  /**
   * Cancel an intervention with potential displacement fees
   * If status is 'arrived', 'in_progress', or 'on_route' with proximity < 5 min,
   * displacement fees are charged
   */
  async cancelInterventionWithFees(
    interventionId: string,
    reason: string,
    forceChargeFees: boolean = false
  ): Promise<CancellationResult> {
    try {
      // Get intervention details
      const { data: intervention, error: intError } = await supabase
        .from('interventions')
        .select('*')
        .eq('id', interventionId)
        .single();

      if (intError || !intervention) {
        throw new Error('Intervention non trouvée');
      }

      const status = intervention.status;
      
      // Check if displacement fees apply based on status or proximity
      let hasDisplacementFees = ['arrived', 'in_progress'].includes(status);
      
      // For on_route, check proximity if forceChargeFees is true (already verified by frontend)
      if (status === 'on_route' && forceChargeFees) {
        hasDisplacementFees = true;
      }

      if (hasDisplacementFees) {
        // Calculate and capture displacement fees
        const feeInfo = await this.calculateDisplacementFees(intervention);
        
        if (feeInfo && feeInfo.totalTTC > 0) {
          // Capture the displacement fee via edge function
          const captureResult = await this.captureDisplacementFee(
            interventionId,
            feeInfo.totalTTC
          );

          if (!captureResult.success) {
            console.error('Failed to capture displacement fee:', captureResult.error);
            // Continue with cancellation even if capture fails
            // The fee can be collected separately
          }

          // Update intervention with final price (displacement fee)
          await supabase
            .from('interventions')
            .update({
              status: 'cancelled',
              is_active: false,
              final_price: feeInfo.totalTTC,
              completed_at: new Date().toISOString(),
            })
            .eq('id', interventionId);

          // Cancel any pending dispatch attempts
          await supabase
            .from('dispatch_attempts')
            .update({ status: 'cancelled' })
            .eq('intervention_id', interventionId)
            .in('status', ['pending', 'notified']);

          // Send invoice for displacement fees
          let invoiceSent = false;
          try {
            // Get updated intervention for invoice
            const { data: updatedIntervention } = await supabase
              .from('interventions')
              .select('*')
              .eq('id', interventionId)
              .single();

            if (updatedIntervention) {
              // Generate and send invoice via edge function
              invoiceSent = await this.sendCancellationInvoice(updatedIntervention, feeInfo);
            }
          } catch (invoiceErr) {
            console.error('Error sending cancellation invoice:', invoiceErr);
          }

          console.log(`Intervention ${interventionId} cancelled by client with displacement fee: ${feeInfo.totalTTC}€. Reason: ${reason}`);

          return {
            success: true,
            hasFees: true,
            feeAmount: feeInfo.totalTTC,
            invoiceSent,
          };
        }
      }

      // No displacement fees - standard cancellation
      await supabase
        .from('interventions')
        .update({
          status: 'cancelled',
          is_active: false,
        })
        .eq('id', interventionId);

      // Cancel any pending dispatch attempts
      await supabase
        .from('dispatch_attempts')
        .update({ status: 'cancelled' })
        .eq('intervention_id', interventionId)
        .in('status', ['pending', 'notified']);

      // Cancel payment authorization if exists
      try {
        await supabase.functions.invoke('cancel-payment', {
          body: { interventionId },
        });
      } catch (cancelErr) {
        console.error('Error cancelling payment authorization:', cancelErr);
      }

      console.log(`Intervention ${interventionId} cancelled by client without fees. Reason: ${reason}`);

      return {
        success: true,
        hasFees: false,
      };
    } catch (err) {
      console.error('Error cancelling intervention:', err);
      return {
        success: false,
        hasFees: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Calculate displacement fees for an intervention
   */
  private async calculateDisplacementFees(
    intervention: Record<string, unknown>
  ): Promise<CancellationFeeInfo | null> {
    try {
      // Check if client is company
      let isCompany = false;
      if (intervention.client_id) {
        const { data: user } = await supabase
          .from('users')
          .select('is_company')
          .eq('id', intervention.client_id as string)
          .single();
        isCompany = user?.is_company ?? false;
      }

      // Get service displacement price
      const { data: service } = await supabase
        .from('services')
        .select('displacement_price, vat_rate_individual, vat_rate_professional')
        .eq('code', intervention.category as string)
        .single();

      if (!service) {
        console.error('Service not found for category:', intervention.category);
        return null;
      }

      const displacementPriceHT = service.displacement_price;
      const vatRate = isCompany ? service.vat_rate_professional : service.vat_rate_individual;
      const vatAmount = Math.round(displacementPriceHT * (vatRate / 100) * 100) / 100;
      const totalTTC = Math.round((displacementPriceHT + vatAmount) * 100) / 100;

      return {
        displacementPriceHT,
        vatRate,
        vatAmount,
        totalTTC,
      };
    } catch (err) {
      console.error('Error calculating displacement fees:', err);
      return null;
    }
  }

  /**
   * Capture displacement fee from existing payment authorization
   */
  private async captureDisplacementFee(
    interventionId: string,
    amountTTC: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const amountCents = Math.round(amountTTC * 100);

      const { data, error } = await supabase.functions.invoke('capture-payment', {
        body: {
          interventionId,
          amount: amountCents,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: data?.success === true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur de capture',
      };
    }
  }

  /**
   * Send cancellation invoice for displacement fees
   */
  private async sendCancellationInvoice(
    intervention: Record<string, unknown>,
    feeInfo: CancellationFeeInfo
  ): Promise<boolean> {
    try {
      // Generate a simple cancellation invoice
      const { data, error } = await supabase.functions.invoke('send-cancellation-invoice', {
        body: {
          interventionId: intervention.id,
          displacementPriceHT: feeInfo.displacementPriceHT,
          vatRate: feeInfo.vatRate,
          vatAmount: feeInfo.vatAmount,
          totalTTC: feeInfo.totalTTC,
        },
      });

      if (error) {
        console.error('Error sending cancellation invoice:', error);
        return false;
      }

      return data?.success === true;
    } catch (err) {
      console.error('Error sending cancellation invoice:', err);
      return false;
    }
  }
}

export const cancellationService = new CancellationService();
