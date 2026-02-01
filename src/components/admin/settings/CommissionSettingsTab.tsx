import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Percent, Edit2, Save, X, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CommissionSetting {
  id: string;
  commissionRate: number;
  effectiveFrom: string;
}

export function CommissionSettingsTab() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editRate, setEditRate] = useState<number>(15);

  const { data: commission, isLoading } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('*')
        .is('partner_id', null)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        id: data.id,
        commissionRate: Number(data.commission_rate),
        effectiveFrom: data.effective_from,
      } as CommissionSetting;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (rate: number) => {
      // Create a new commission setting with today's date
      const { error } = await supabase.from('commission_settings').insert({
        commission_rate: rate,
        partner_id: null,
        effective_from: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      toast.success('Commission mise à jour');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const startEdit = () => {
    setEditRate(commission?.commissionRate ?? 15);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditRate(15);
  };

  const saveEdit = () => {
    updateMutation.mutate(editRate);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentRate = commission?.commissionRate ?? 15;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Commission
        </CardTitle>
        <CardDescription>Configurer le pourcentage de commission retenu sur chaque prestation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-6 border rounded-lg bg-muted/30">
          {isEditing ? (
            <>
              <div className="flex-1 max-w-xs">
                <Label htmlFor="commission-rate">Pourcentage de commission</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="commission-rate"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={editRate}
                    onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-xl font-medium">%</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-sm text-muted-foreground">Commission actuelle</span>
                <p className="text-4xl font-bold mt-1">{currentRate}%</p>
                {commission?.effectiveFrom && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Effective depuis le {new Date(commission.effectiveFrom).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <Button onClick={startEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">À propos de la commission</p>
            <p className="mt-1">
              Ce pourcentage est retenu sur le montant de chaque prestation terminée avant le versement au technicien.
              Par exemple, pour une prestation de 100€ avec une commission de {currentRate}%, le technicien recevra{' '}
              {(100 - currentRate).toFixed(0)}€.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
