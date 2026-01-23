import { useState } from 'react';
import { quoteModificationsService } from '@/services/quote-modifications/quote-modifications.service';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Send, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface QuoteModificationFormProps {
  interventionId: string;
  technicianId: string;
  clientEmail: string | null;
  clientPhone: string | null;
  disabled?: boolean;
}

interface ModificationItem {
  id: string;
  itemType: 'service' | 'equipment' | 'other';
  label: string;
  description: string;
  unitPrice: number;
  quantity: number;
}

const ITEM_TYPE_LABELS = {
  service: 'Prestation',
  equipment: 'Équipement',
  other: 'Autre',
};

export function QuoteModificationForm({
  interventionId,
  technicianId,
  clientEmail,
  clientPhone,
  disabled = false,
}: QuoteModificationFormProps) {
  const [items, setItems] = useState<ModificationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        itemType: 'service',
        label: '',
        description: '',
        unitPrice: 0,
        quantity: 1,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ModificationItem>) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Ajoutez au moins une prestation ou un équipement');
      return;
    }

    const invalidItems = items.filter((item) => !item.label || item.unitPrice <= 0);
    if (invalidItems.length > 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the modification
      const modification = await quoteModificationsService.createModification({
        interventionId,
        createdBy: technicianId,
        items: items.map((item) => ({
          itemType: item.itemType,
          label: item.label,
          description: item.description || undefined,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      });

      // Send notification to client
      const { error: notifyError } = await supabase.functions.invoke('notify-quote-modification', {
        body: {
          modificationId: modification.id,
          clientEmail,
          clientPhone,
        },
      });

      if (notifyError) {
        console.error('Error sending notification:', notifyError);
        toast.warning('Modification créée mais notification non envoyée');
      } else {
        await quoteModificationsService.markAsNotified(modification.id);
        toast.success('Demande de modification envoyée au client');
      }

      // Reset form
      setItems([]);
    } catch (err) {
      console.error('Error creating modification:', err);
      toast.error('Erreur lors de la création de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground text-center">
            Les modifications de devis ne sont plus possibles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Compléter le devis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ajoutez des prestations ou équipements supplémentaires. Le client devra valider.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Item {index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
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
                    updateItem(item.id, { itemType: value as ModificationItem['itemType'] })
                  }
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
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                />
              </div>

              <div>
                <Label>Description (optionnel)</Label>
                <Textarea
                  placeholder="Détails..."
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  rows={2}
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
                      updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Quantité *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="text-right text-sm font-medium">
                Sous-total: {(item.unitPrice * item.quantity).toFixed(2)} €
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une ligne
        </Button>
      </CardContent>

      {items.length > 0 && (
        <CardFooter className="flex-col gap-4">
          <div className="w-full flex justify-between items-center text-lg font-bold">
            <span>Total supplémentaire:</span>
            <span>{calculateTotal().toFixed(2)} €</span>
          </div>
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer au client pour validation'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
