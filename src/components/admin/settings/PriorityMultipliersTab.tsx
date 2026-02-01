import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Edit2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PriorityMultiplier {
  id: string;
  priority: string;
  label: string;
  multiplier: number;
  displayOrder: number;
}

interface DbPriorityMultiplier {
  id: string;
  priority: string;
  label: string;
  multiplier: number;
  display_order: number;
}

export function PriorityMultipliersTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ label: string; multiplier: number }>({ label: '', multiplier: 1 });

  const { data: multipliers = [], isLoading } = useQuery({
    queryKey: ['priority-multipliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('priority_multipliers')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data as DbPriorityMultiplier[]).map((m): PriorityMultiplier => ({
        id: m.id,
        priority: m.priority,
        label: m.label,
        multiplier: m.multiplier,
        displayOrder: m.display_order,
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, label, multiplier }: { id: string; label: string; multiplier: number }) => {
      const { error } = await supabase
        .from('priority_multipliers')
        .update({ label, multiplier })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priority-multipliers'] });
      toast.success('Multiplicateur mis à jour');
      setEditingId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const startEdit = (multiplier: PriorityMultiplier) => {
    setEditingId(multiplier.id);
    setEditValues({ label: multiplier.label, multiplier: multiplier.multiplier });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ label: '', multiplier: 1 });
  };

  const saveEdit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...editValues });
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Multiplicateurs de priorité
        </CardTitle>
        <CardDescription>
          Configurer les multiplicateurs de prix par niveau d'urgence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {multipliers.map((multiplier) => (
            <div
              key={multiplier.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {editingId === multiplier.id ? (
                <>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="label">Libellé</Label>
                      <Input
                        id="label"
                        value={editValues.label}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, label: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="multiplier">Multiplicateur</Label>
                      <Input
                        id="multiplier"
                        type="number"
                        step="0.1"
                        min="1"
                        value={editValues.multiplier}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, multiplier: parseFloat(e.target.value) || 1 }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Code</span>
                      <p className="font-medium capitalize">{multiplier.priority}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Libellé</span>
                      <p className="font-medium">{multiplier.label}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Multiplicateur</span>
                      <p className="font-medium text-lg">×{multiplier.multiplier}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(multiplier)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
