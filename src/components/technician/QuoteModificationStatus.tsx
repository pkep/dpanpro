import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { quoteModificationsService, QuoteModification } from '@/services/quote-modifications/quote-modifications.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface QuoteModificationStatusProps {
  interventionId: string;
  onRefresh?: () => void;
}

const STATUS_CONFIG = {
  pending: {
    label: 'En attente de validation client',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    variant: 'default' as const,
  },
  approved: {
    label: 'Approuvé par le client',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    variant: 'default' as const,
  },
  declined: {
    label: 'Refusé par le client',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    variant: 'destructive' as const,
  },
};

export function QuoteModificationStatus({ interventionId, onRefresh }: QuoteModificationStatusProps) {
  const [pendingModification, setPendingModification] = useState<QuoteModification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const mod = await quoteModificationsService.getPendingModification(interventionId);
      setPendingModification(mod);
    } catch (err) {
      console.error('Error fetching pending modification:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [interventionId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`quote-mod-${interventionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quote_modifications',
          filter: `intervention_id=eq.${interventionId}`,
        },
        () => {
          fetchPending();
          onRefresh?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interventionId, onRefresh]);

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingModification) {
    return null;
  }

  const config = STATUS_CONFIG[pendingModification.status];
  const StatusIcon = config.icon;

  return (
    <Card className="mb-4 border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          Modification de devis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {pendingModification.status === 'pending' 
              ? 'En attente de validation du client. Vous ne pouvez pas finaliser l\'intervention tant que le client n\'a pas répondu.'
              : pendingModification.status === 'approved'
              ? 'Le client a approuvé la modification. Vous pouvez continuer l\'intervention.'
              : 'Le client a refusé la modification. Finalisez l\'intervention si possible ou abandonnez.'}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm font-medium">Détails de la modification :</p>
          {pendingModification.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.label} {item.quantity > 1 && `x${item.quantity}`}
              </span>
              <span className="font-medium">{item.totalPrice.toFixed(2)} €</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t pt-2">
            <span>Total supplémentaire</span>
            <span>{pendingModification.totalAdditionalAmount.toFixed(2)} €</span>
          </div>
        </div>

        <Badge className={config.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </CardContent>
    </Card>
  );
}
