import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Download, CheckCircle, PenTool, ChevronDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { services as api } from '@/services/factory';
import type { Intervention } from '@/types/intervention.types';
import type { QuoteLine } from '@/services/interfaces/quotes.interface';
import type { QuoteModification } from '@/services/interfaces/quote-modifications.interface';
import { toast } from 'sonner';

interface SignedQuoteCardProps {
  intervention: Intervention;
  quoteLines: QuoteLine[];
  approvedModifications: QuoteModification[];
  vatRate: number;
  isLoading?: boolean;
}

export function SignedQuoteCard({
  intervention,
  quoteLines,
  approvedModifications,
  vatRate,
  isLoading = false,
}: SignedQuoteCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isSigned = !!intervention.quoteSignedAt;
  const signatureDate = intervention.quoteSignedAt ? new Date(intervention.quoteSignedAt) : null;

  const baseTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
  const additionalTotal = approvedModifications.reduce(
    (sum, mod) => sum + mod.totalAdditionalAmount,
    0
  );
  const totalHT = baseTotal + additionalTotal;
  const vatAmount = Math.round(totalHT * (vatRate / 100) * 100) / 100;
  const totalTTC = Math.round((totalHT + vatAmount) * 100) / 100;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await api.quotePDF.generateAndDownloadQuote(
        intervention,
        intervention.quoteSignatureData || undefined
      );
      toast.success('Devis téléchargé');
    } catch (err) {
      console.error('Error downloading quote:', err);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Devis d'intervention
          {isSigned && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 ml-auto">
              <CheckCircle className="h-3 w-3 mr-1" />
              Signé
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {isSigned
                ? 'Le devis a été accepté et signé par le client.'
                : 'Le devis est en attente de signature.'}
            </p>
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-muted-foreground">
                Montant HT : {fmt(totalHT)}
              </p>
              <p className="text-sm text-muted-foreground">
                TVA ({vatRate}%) : {fmt(vatAmount)}
              </p>
              <p className="text-lg font-semibold">
                Montant TTC : {fmt(totalTTC)}
              </p>
            </div>
            {isSigned && signatureDate && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <PenTool className="h-3 w-3" />
                Signé le {format(signatureDate, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            )}
          </div>
          <Button onClick={handleDownload} disabled={isDownloading || quoteLines.length === 0}>
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Télécharger
          </Button>
        </div>

        {/* Collapsible detail lines */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
              {detailsOpen ? 'Masquer le détail' : 'Voir le détail'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            <Separator className="mb-2" />
            {quoteLines.map((line) => (
              <div key={line.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-muted-foreground">
                  {line.label}
                  {line.multiplier > 1 && (
                    <Badge variant="outline" className="ml-2 text-xs">×{line.multiplier}</Badge>
                  )}
                </span>
                <span className="font-medium">{fmt(line.calculatedPrice)}</span>
              </div>
            ))}
            {approvedModifications.map((mod) =>
              mod.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1 bg-muted/50 rounded px-2">
                  <span className="text-muted-foreground">
                    {item.label}
                    <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                      Supplément
                    </Badge>
                    {item.quantity > 1 && (
                      <Badge variant="outline" className="ml-1 text-xs">×{item.quantity}</Badge>
                    )}
                  </span>
                  <span className="font-medium">{fmt(item.totalPrice)}</span>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
