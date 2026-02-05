import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, CheckCircle, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { quotePDFService } from '@/services/quote-pdf/quote-pdf.service';
import type { Intervention } from '@/types/intervention.types';
import type { QuoteLine } from '@/services/quotes/quotes.service';
import type { QuoteModification } from '@/services/quote-modifications/quote-modifications.service';
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
      await quotePDFService.generateAndDownloadQuote(
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Devis d'intervention
          </CardTitle>
          {isSigned && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Signé
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quote lines table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Prix HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quoteLines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <span>{line.label}</span>
                  {line.multiplier > 1 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      ×{line.multiplier}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {line.calculatedPrice.toFixed(2)} €
                </TableCell>
              </TableRow>
            ))}
            {approvedModifications.map((mod) =>
              mod.items.map((item) => (
                <TableRow key={item.id} className="bg-muted/50">
                  <TableCell>
                    <span>{item.label}</span>
                    <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                      Supplément
                    </Badge>
                    {item.quantity > 1 && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        ×{item.quantity}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.totalPrice.toFixed(2)} €
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Separator />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium">{totalHT.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">TVA ({vatRate}%)</span>
            <span className="font-medium">{vatAmount.toFixed(2)} €</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total TTC</span>
            <span className="text-primary">{totalTTC.toFixed(2)} €</span>
          </div>
        </div>

        {/* Signature info */}
        {isSigned && signatureDate && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PenTool className="h-4 w-4" />
              <span>
                Signé le {format(signatureDate, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
          </>
        )}

        {/* Download button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleDownload}
          disabled={isDownloading || quoteLines.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Téléchargement...' : 'Télécharger le devis PDF'}
        </Button>
      </CardContent>
    </Card>
  );
}
