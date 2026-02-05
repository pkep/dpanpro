import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink, FileText, Euro } from 'lucide-react';
import { toast } from 'sonner';

interface PendingQuote {
  id: string;
  interventionId: string;
  interventionTitle: string;
  totalAmount: number;
  notificationToken: string;
  createdAt: string;
}

export function PendingQuotesBanner() {
  const { user } = useAuth();
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingQuotes = async () => {
    if (!user) return;

    try {
      // Get all interventions for this client
      const { data: interventions, error: intError } = await supabase
        .from('interventions')
        .select('id, title')
        .eq('client_id', user.id)
        .not('status', 'in', '("completed","cancelled")');

      if (intError) throw intError;
      if (!interventions || interventions.length === 0) {
        setPendingQuotes([]);
        return;
      }

      // Get pending quote modifications for these interventions
      const interventionIds = interventions.map(i => i.id);
      const { data: modifications, error: modError } = await supabase
        .from('quote_modifications')
        .select('id, intervention_id, total_additional_amount, notification_token, created_at')
        .in('intervention_id', interventionIds)
        .eq('status', 'pending');

      if (modError) throw modError;

      // Map modifications to include intervention title
      const quotes: PendingQuote[] = (modifications || []).map(mod => {
        const intervention = interventions.find(i => i.id === mod.intervention_id);
        return {
          id: mod.id,
          interventionId: mod.intervention_id,
          interventionTitle: intervention?.title || 'Intervention',
          totalAmount: mod.total_additional_amount,
          notificationToken: mod.notification_token || '',
          createdAt: mod.created_at,
        };
      });

      setPendingQuotes(quotes);
    } catch (error) {
      console.error('Error fetching pending quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQuotes();
  }, [user]);

  // Listen for realtime changes on quote_modifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('client-pending-quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_modifications',
        },
        (payload) => {
          // Refresh the list when any change happens
          fetchPendingQuotes();
          
          // Show toast for new pending quotes
          if (payload.eventType === 'INSERT' && (payload.new as any).status === 'pending') {
            toast.warning('Nouveau devis en attente', {
              description: 'Le technicien a proposé des prestations supplémentaires',
              action: {
                label: 'Voir',
                onClick: () => {
                  const token = (payload.new as any).notification_token;
                  if (token) {
                    window.location.href = `/quote-approval/${token}`;
                  }
                },
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading || pendingQuotes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pendingQuotes.map((quote) => (
        <Alert 
          key={quote.id} 
          className="border-warning bg-warning/10 border-l-4 border-l-warning"
        >
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle className="flex items-center gap-2 text-warning">
            <FileText className="h-4 w-4" />
            Devis en attente de validation
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{quote.interventionTitle}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background">
                    <Euro className="h-3 w-3 mr-1" />
                    {quote.totalAmount.toFixed(2)} € supplémentaires
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le technicien propose des prestations supplémentaires qui nécessitent votre approbation.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/intervention/${quote.interventionId}`}>
                    Détails
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={`/quote-approval/${quote.notificationToken}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Traiter
                  </Link>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
