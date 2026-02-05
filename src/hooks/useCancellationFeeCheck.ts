import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateRoute, calculateFallbackRoute } from '@/services/routing/routing.service';

interface CancellationFeeInfo {
  hasFees: boolean;
  reason: 'arrived' | 'in_progress' | 'proximity' | null;
  displacementPriceHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  isCompany: boolean;
  etaMinutes?: number;
}

interface UseCancellationFeeCheckProps {
  interventionId: string;
  interventionStatus: string;
  interventionCategory: string;
  enabled: boolean;
}

// Threshold in minutes for proximity-based cancellation fees
const PROXIMITY_THRESHOLD_MINUTES = 5;

export function useCancellationFeeCheck({
  interventionId,
  interventionStatus,
  interventionCategory,
  enabled,
}: UseCancellationFeeCheckProps) {
  const [feeInfo, setFeeInfo] = useState<CancellationFeeInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setFeeInfo(null);
      return;
    }

    const checkCancellationFees = async () => {
      setLoading(true);
      try {
        // Status-based fees (arrived or in_progress)
        if (['arrived', 'in_progress'].includes(interventionStatus)) {
          const fees = await calculateDisplacementFees(
            interventionId,
            interventionCategory,
            interventionStatus as 'arrived' | 'in_progress'
          );
          setFeeInfo(fees);
          setLoading(false);
          return;
        }

        // Proximity-based fees (on_route and < 5 minutes away)
        if (interventionStatus === 'on_route') {
          const proximityFees = await checkProximityFees(
            interventionId,
            interventionCategory
          );
          setFeeInfo(proximityFees);
          setLoading(false);
          return;
        }

        // No fees for other statuses
        setFeeInfo({
          hasFees: false,
          reason: null,
          displacementPriceHT: 0,
          vatRate: 0,
          vatAmount: 0,
          totalTTC: 0,
          isCompany: false,
        });
      } catch (err) {
        console.error('Error checking cancellation fees:', err);
        setFeeInfo(null);
      } finally {
        setLoading(false);
      }
    };

    checkCancellationFees();
  }, [enabled, interventionId, interventionStatus, interventionCategory]);

  return { feeInfo, loading };
}

async function calculateDisplacementFees(
  interventionId: string,
  category: string,
  reason: 'arrived' | 'in_progress' | 'proximity'
): Promise<CancellationFeeInfo> {
  // Get intervention details to check if client is company
  const { data: intervention } = await supabase
    .from('interventions')
    .select('client_id')
    .eq('id', interventionId)
    .single();

  // Check if client is company
  let isCompany = false;
  if (intervention?.client_id) {
    const { data: user } = await supabase
      .from('users')
      .select('is_company')
      .eq('id', intervention.client_id)
      .single();
    isCompany = user?.is_company ?? false;
  }

  // Get service displacement price
  const { data: service } = await supabase
    .from('services')
    .select('displacement_price, vat_rate_individual, vat_rate_professional')
    .eq('code', category)
    .single();

  if (!service) {
    return {
      hasFees: false,
      reason: null,
      displacementPriceHT: 0,
      vatRate: 0,
      vatAmount: 0,
      totalTTC: 0,
      isCompany: false,
    };
  }

  const displacementPriceHT = service.displacement_price;
  const vatRate = isCompany ? service.vat_rate_professional : service.vat_rate_individual;
  const vatAmount = Math.round(displacementPriceHT * (vatRate / 100) * 100) / 100;
  const totalTTC = Math.round((displacementPriceHT + vatAmount) * 100) / 100;

  return {
    hasFees: true,
    reason,
    displacementPriceHT,
    vatRate,
    vatAmount,
    totalTTC,
    isCompany,
  };
}

async function checkProximityFees(
  interventionId: string,
  category: string
): Promise<CancellationFeeInfo> {
  // Get intervention details including technician and location
  const { data: intervention } = await supabase
    .from('interventions')
    .select('technician_id, latitude, longitude, client_id')
    .eq('id', interventionId)
    .single();

  if (!intervention?.technician_id || !intervention.latitude || !intervention.longitude) {
    return {
      hasFees: false,
      reason: null,
      displacementPriceHT: 0,
      vatRate: 0,
      vatAmount: 0,
      totalTTC: 0,
      isCompany: false,
    };
  }

  // Get technician's current position
  const { data: techApplication } = await supabase
    .from('partner_applications')
    .select('latitude, longitude')
    .eq('user_id', intervention.technician_id)
    .single();

  if (!techApplication?.latitude || !techApplication?.longitude) {
    return {
      hasFees: false,
      reason: null,
      displacementPriceHT: 0,
      vatRate: 0,
      vatAmount: 0,
      totalTTC: 0,
      isCompany: false,
    };
  }

  // Calculate ETA
  let etaMinutes: number;
  const routeResult = await calculateRoute(
    techApplication.latitude,
    techApplication.longitude,
    intervention.latitude,
    intervention.longitude
  );

  if (routeResult) {
    etaMinutes = routeResult.durationMinutes;
  } else {
    // Fallback calculation
    const fallback = calculateFallbackRoute(
      techApplication.latitude,
      techApplication.longitude,
      intervention.latitude,
      intervention.longitude
    );
    etaMinutes = fallback.durationMinutes;
  }

  console.log(`[CancellationFeeCheck] ETA: ${etaMinutes} minutes, threshold: ${PROXIMITY_THRESHOLD_MINUTES} minutes`);

  // Check if within proximity threshold
  if (etaMinutes <= PROXIMITY_THRESHOLD_MINUTES) {
    const fees = await calculateDisplacementFees(interventionId, category, 'proximity');
    return {
      ...fees,
      etaMinutes,
    };
  }

  return {
    hasFees: false,
    reason: null,
    displacementPriceHT: 0,
    vatRate: 0,
    vatAmount: 0,
    totalTTC: 0,
    isCompany: false,
    etaMinutes,
  };
}
