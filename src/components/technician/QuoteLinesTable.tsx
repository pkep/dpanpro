import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QuoteLine } from '@/services/quotes/quotes.service';
import { QuoteModification, QuoteModificationItem } from '@/services/quote-modifications/quote-modifications.service';
import { Wrench, Truck, Shield, Package, FileText } from 'lucide-react';

interface QuoteLinesTableProps {
  quoteLines: QuoteLine[];
  approvedModifications: QuoteModification[];
}

const LINE_TYPE_ICONS: Record<string, React.ReactNode> = {
  displacement: <Truck className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  repair: <Wrench className="h-4 w-4" />,
  service: <Wrench className="h-4 w-4" />,
  equipment: <Package className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

const LINE_TYPE_LABELS: Record<string, string> = {
  displacement: 'Déplacement',
  security: 'Sécurité',
  repair: 'Dépannage',
  service: 'Prestation',
  equipment: 'Équipement',
  other: 'Autre',
};

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export function QuoteLinesTable({ quoteLines, approvedModifications }: QuoteLinesTableProps) {
  // Calculate totals
  const baseTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
  
  const approvedItems: QuoteModificationItem[] = approvedModifications.flatMap(mod => mod.items);
  const modificationsTotal = approvedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  const grandTotal = baseTotal + modificationsTotal;

  // Start line numbering from 1
  let lineNumber = 0;

  if (quoteLines.length === 0 && approvedModifications.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucune ligne de devis</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead className="text-right">Qté</TableHead>
            <TableHead className="text-right">Prix unit.</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Initial quote lines */}
          {quoteLines.map((line) => {
            lineNumber++;
            return (
              <TableRow key={`quote-${line.id}`}>
                <TableCell className="font-mono text-muted-foreground">{lineNumber}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {LINE_TYPE_ICONS[line.lineType]}
                    <span className="text-xs text-muted-foreground">
                      {LINE_TYPE_LABELS[line.lineType]}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{line.label}</TableCell>
                <TableCell className="text-right">1</TableCell>
                <TableCell className="text-right">{formatPrice(line.calculatedPrice)}</TableCell>
                <TableCell className="text-right font-medium">{formatPrice(line.calculatedPrice)}</TableCell>
              </TableRow>
            );
          })}
          
          {/* Approved modification items */}
          {approvedItems.map((item) => {
            lineNumber++;
            return (
              <TableRow key={`mod-item-${item.id}`} className="bg-green-50/50 dark:bg-green-900/10">
                <TableCell className="font-mono text-muted-foreground">{lineNumber}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {LINE_TYPE_ICONS[item.itemType]}
                    <Badge variant="outline" className="text-xs border-green-500/50 text-green-700 dark:text-green-400">
                      {LINE_TYPE_LABELS[item.itemType]}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {item.label}
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                <TableCell className="text-right font-medium">{formatPrice(item.unitPrice * item.quantity)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          {quoteLines.length > 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-right">Devis initial</TableCell>
              <TableCell className="text-right font-medium">{formatPrice(baseTotal)}</TableCell>
            </TableRow>
          )}
          {modificationsTotal > 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-right text-green-700 dark:text-green-400">
                Suppléments approuvés
              </TableCell>
              <TableCell className="text-right font-medium text-green-700 dark:text-green-400">
                +{formatPrice(modificationsTotal)}
              </TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-bold">Total général</TableCell>
            <TableCell className="text-right font-bold text-lg">{formatPrice(grandTotal)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
