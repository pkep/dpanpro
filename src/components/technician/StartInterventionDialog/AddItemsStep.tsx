import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import type { QuoteModificationItem } from './types';

interface AddItemsStepProps {
  items: QuoteModificationItem[];
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<QuoteModificationItem>) => void;
  disabled: boolean;
}

export function AddItemsStep({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  disabled,
}: AddItemsStepProps) {
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Prestation {index + 1}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveItem(item.id)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="grid gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={item.itemType}
                onValueChange={(value) =>
                  onUpdateItem(item.id, { itemType: value as QuoteModificationItem['itemType'] })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Prestation</SelectItem>
                  <SelectItem value="equipment">Équipement</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Libellé *</Label>
              <Input
                placeholder="Ex: Remplacement joint"
                value={item.label}
                onChange={(e) => onUpdateItem(item.id, { label: e.target.value })}
                disabled={disabled}
              />
            </div>

            <div>
              <Label>Description (optionnel)</Label>
              <Textarea
                placeholder="Détails..."
                value={item.description}
                onChange={(e) => onUpdateItem(item.id, { description: e.target.value })}
                rows={2}
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix unitaire (€) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    onUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                  }
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdateItem(item.id, { quantity: parseInt(e.target.value) || 1 })
                  }
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="text-right text-sm font-medium">
              Sous-total: {(item.unitPrice * item.quantity).toFixed(2)} €
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" className="w-full" onClick={onAddItem} disabled={disabled}>
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une prestation
      </Button>

      {items.length > 0 && (
        <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
          <span>Total supplémentaire:</span>
          <span>{calculateTotal().toFixed(2)} €</span>
        </div>
      )}
    </div>
  );
}
