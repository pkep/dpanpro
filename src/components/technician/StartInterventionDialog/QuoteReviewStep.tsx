import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { QuoteConfig, QuoteModificationItem } from './types';

interface QuoteReviewStepProps {
  quoteConfig: QuoteConfig | null;
  selectedVarianteId: string | null;
  onVarianteChange: (id: string | null) => void;
  laborPrice: number;
  onLaborPriceChange: (price: number) => void;
  pendingItems: QuoteModificationItem[];
  vatRate: number;
}

export function QuoteReviewStep({
  quoteConfig,
  selectedVarianteId,
  onVarianteChange,
  laborPrice,
  onLaborPriceChange,
  pendingItems,
  vatRate,
}: QuoteReviewStepProps) {
  if (!quoteConfig) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Chargement du devis...
      </div>
    );
  }

  const { displacementPrice, securityPrice, variantes } = quoteConfig;

  // Determine active price range (variant or base result)
  const selectedVariante = variantes.find(v => v.id === selectedVarianteId);
  const activePrixMinTTC = selectedVariante?.prixMin ?? quoteConfig.resultatPrixMin ?? 0;
  const activePrixMaxTTC = selectedVariante?.prixMax ?? quoteConfig.resultatPrixMax ?? 0;

  // Convert TTC bounds to HT
  const toHT = (ttc: number) => ttc / (1 + vatRate / 100);
  const minHT = toHT(activePrixMinTTC);
  const maxHT = toHT(activePrixMaxTTC);

  // Labor bounds
  const minLabor = Math.max(0, Math.round((minHT - displacementPrice - securityPrice) * 100) / 100);
  const maxLabor = Math.max(0, Math.round((maxHT - displacementPrice - securityPrice) * 100) / 100);

  // Base totals (without additional items)
  const baseHT = displacementPrice + securityPrice + laborPrice;
  const additionalTotal = pendingItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const totalHT = baseHT + additionalTotal;
  const vatAmount = Math.round(totalHT * (vatRate / 100) * 100) / 100;
  const totalTTC = Math.round((totalHT + vatAmount) * 100) / 100;

  // Check if base total exceeds max (additional items excluded from cap)
  const baseTTC = Math.round((baseHT + baseHT * (vatRate / 100)) * 100) / 100;
  const exceedsMax = baseTTC > activePrixMaxTTC && activePrixMaxTTC > 0;

  const handleLaborChange = (value: string) => {
    const num = parseFloat(value) || 0;
    // Cap labor so base TTC doesn't exceed max
    const capped = Math.min(num, maxLabor);
    onLaborPriceChange(Math.max(0, Math.round(capped * 100) / 100));
  };

  const handleVarianteSelect = (varianteId: string) => {
    const isBase = varianteId === '__base__';
    onVarianteChange(isBase ? null : varianteId);

    // Recalculate default labor for the new selection
    const v = variantes.find(v => v.id === varianteId);
    const newMinTTC = isBase ? (quoteConfig.resultatPrixMin ?? 0) : (v?.prixMin ?? 0);
    const newMinHT = toHT(newMinTTC);
    const newDefaultLabor = Math.max(0, Math.round((newMinHT - displacementPrice - securityPrice) * 100) / 100);
    onLaborPriceChange(newDefaultLabor);
  };

  return (
    <div className="space-y-4">
      {/* Prestation result name + selected variant */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-lg">{quoteConfig.resultatNom}</h3>
        {selectedVariante && (
          <p className="text-sm font-medium text-primary">
            Variante : {selectedVariante.nom}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Fourchette : {activePrixMinTTC} – {activePrixMaxTTC} € TTC
        </p>
      </div>

      {/* Variant selection */}
      {variantes.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Label className="font-medium">Variante de prestation</Label>
            <RadioGroup
              value={selectedVarianteId || '__base__'}
              onValueChange={handleVarianteSelect}
              className="space-y-2"
            >
              {/* Base option */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="__base__" id="variante-base" className="mt-0.5" />
                <label htmlFor="variante-base" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Prestation standard</span>
                    <Badge variant="secondary" className="text-xs">
                      {quoteConfig.resultatPrixMin} – {quoteConfig.resultatPrixMax} €
                    </Badge>
                  </div>
                </label>
              </div>

              {variantes.map((v) => (
                <div key={v.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value={v.id} id={`variante-${v.id}`} className="mt-0.5" />
                  <label htmlFor={`variante-${v.id}`} className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{v.nom}</span>
                      {v.prixMin != null && v.prixMax != null && (
                        <Badge variant="secondary" className="text-xs">
                          {v.prixMin} – {v.prixMax} €
                        </Badge>
                      )}
                    </div>
                    {v.description && (
                      <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                    )}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Price breakdown */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Label className="font-medium">Décomposition du prix</Label>

          {/* Displacement */}
          {displacementPrice > 0 && (
            <div className="flex justify-between items-center text-sm py-2 px-3 rounded bg-muted/50">
              <span>Déplacement technicien</span>
              <span className="font-medium">{displacementPrice.toFixed(2)} € HT</span>
            </div>
          )}

          {/* Security */}
          {securityPrice > 0 ? (
            <div className="flex justify-between items-center text-sm py-2 px-3 rounded bg-muted/50">
              <span>Mise en sécurité</span>
              <span className="font-medium">{securityPrice.toFixed(2)} € HT</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-sm py-2 px-3 rounded bg-muted/50">
              <span>Mise en sécurité</span>
              <Badge variant="outline" className="text-xs">Gratuite</Badge>
            </div>
          )}

          {/* Labor - editable */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span>Main d'œuvre</span>
              <span className="text-xs text-muted-foreground">
                min {minLabor.toFixed(2)} – max {maxLabor.toFixed(2)} € HT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={maxLabor}
                value={laborPrice}
                onChange={(e) => handleLaborChange(e.target.value)}
                className="text-right font-medium"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">€ HT</span>
            </div>
          </div>

          {/* Warning if exceeds max */}
          {exceedsMax && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Le montant dépasse le maximum de {activePrixMaxTTC} € TTC
              </AlertDescription>
            </Alert>
          )}

          {/* Additional items summary */}
          {pendingItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                {pendingItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-1 px-3 rounded bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Ajouté
                      </Badge>
                    </div>
                    <span className="font-medium">{(item.unitPrice * item.quantity).toFixed(2)} € HT</span>
                  </div>
                ))}
              </div>
            </>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}
