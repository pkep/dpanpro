import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Cog, Edit2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { configurationService, type DispatchAlgorithmConfig } from '@/services/configuration/configuration.service';
import { useAuth } from '@/hooks/useAuth';

interface WeightConfig {
  proximity: number;
  skills: number;
  workload: number;
  rating: number;
}

export function DispatchAlgorithmTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editWeights, setEditWeights] = useState<WeightConfig>({
    proximity: 40,
    skills: 30,
    workload: 20,
    rating: 10,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['dispatch-algorithm-config'],
    queryFn: async () => {
      return configurationService.getDispatchAlgorithmConfig();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (weights: WeightConfig) => {
      if (!user?.id) throw new Error('User not authenticated');
      await configurationService.updateDispatchAlgorithmConfig(
        {
          weightProximity: weights.proximity,
          weightSkills: weights.skills,
          weightWorkload: weights.workload,
          weightRating: weights.rating,
        },
        user.id,
        'Mise à jour des poids de l\'algorithme de dispatch'
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-algorithm-config'] });
      toast.success('Algorithme de dispatch mis à jour');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const startEdit = () => {
    if (config) {
      setEditWeights({
        proximity: config.weightProximity,
        skills: config.weightSkills,
        workload: config.weightWorkload,
        rating: config.weightRating,
      });
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = () => {
    updateMutation.mutate(editWeights);
  };

  const totalWeight = editWeights.proximity + editWeights.skills + editWeights.workload + editWeights.rating;
  const isValidTotal = totalWeight === 100;

  const updateWeight = (key: keyof WeightConfig, value: number) => {
    setEditWeights((prev) => ({ ...prev, [key]: value }));
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

  const weights = config
    ? {
        proximity: config.weightProximity,
        skills: config.weightSkills,
        workload: config.weightWorkload,
        rating: config.weightRating,
      }
    : { proximity: 40, skills: 30, workload: 20, rating: 10 };

  const weightLabels: { key: keyof WeightConfig; label: string; description: string }[] = [
    { key: 'proximity', label: 'Proximité', description: 'Distance du technicien par rapport au client' },
    { key: 'skills', label: 'Compétences', description: 'Adéquation des compétences du technicien' },
    { key: 'workload', label: 'Charge travail', description: 'Disponibilité actuelle du technicien' },
    { key: 'rating', label: 'Note client', description: 'Évaluations reçues par le technicien' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" />
          Algorithme de dispatch
        </CardTitle>
        <CardDescription>
          Configurer les poids de l'algorithme de sélection des techniciens (total doit être 100%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing ? (
          <>
            <div className="space-y-6">
              {weightLabels.map(({ key, label, description }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">{label}</Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editWeights[key]}
                        onChange={(e) => updateWeight(key, parseInt(e.target.value) || 0)}
                        className="w-20 text-right"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Slider
                    value={[editWeights[key]]}
                    onValueChange={([value]) => updateWeight(key, value)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                isValidTotal
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
              }`}
            >
              {!isValidTotal && <AlertCircle className="h-4 w-4" />}
              <span className="font-medium">
                Total: {totalWeight}% {!isValidTotal && '(doit être égal à 100%)'}
              </span>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={saveEdit} disabled={!isValidTotal || updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {weightLabels.map(({ key, label }) => (
                <Card
                  key={key}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={startEdit}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{weights[key]}%</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={startEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier les poids
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
