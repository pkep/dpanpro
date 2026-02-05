import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { QuoteLine } from '@/services/quotes/quotes.service';
import type { QuoteModificationItem } from './types';

interface QuoteReviewStepProps {
  quoteLines: QuoteLine[];
  pendingItems: QuoteModificationItem[];
  vatRate: number;
}

export function QuoteReviewStep({ quoteLines, pendingItems, vatRate }: QuoteReviewStepProps) {
  const baseTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
  const additionalTotal = pendingItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const totalHT = baseTotal + additionalTotal;
  const vatAmount = Math.round(totalHT * (vatRate / 100) * 100) / 100;
  const totalTTC = Math.round((totalHT + vatAmount) * 100) / 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
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
                    <div className="flex items-center gap-2">
                      <span>{line.label}</span>
                      {line.multiplier > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          ×{line.multiplier}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {line.calculatedPrice.toFixed(2)} €
                  </TableCell>
                </TableRow>
              ))}
              {pendingItems.map((item) => (
                <TableRow key={item.id} className="bg-amber-50 dark:bg-amber-950/20">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800">
                        Ajouté
                      </Badge>
                      {item.quantity > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          ×{item.quantity}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {(item.unitPrice * item.quantity).toFixed(2)} €
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

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
        </CardContent>
      </Card>
    </div>
  );
}
