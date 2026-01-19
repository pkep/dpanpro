import { useState, useEffect } from 'react';
import { servicesService, Service } from '@/services/services/services.service';
import { pricingService, PriorityMultiplier } from '@/services/pricing/pricing.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Euro, Percent, Wrench, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ExtendedService extends Service {
  basePrice: number;
  defaultPriority: string;
}

export function ServicesManagement() {
  const [services, setServices] = useState<ExtendedService[]>([]);
  const [multipliers, setMultipliers] = useState<PriorityMultiplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedServices, setEditedServices] = useState<Record<string, Partial<ExtendedService>>>({});
  const [editedMultipliers, setEditedMultipliers] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [servicesData, multipliersData] = await Promise.all([
        loadServicesWithPricing(),
        pricingService.getPriorityMultipliers(),
      ]);
      setServices(servicesData);
      setMultipliers(multipliersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const loadServicesWithPricing = async (): Promise<ExtendedService[]> => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      code: s.code as string,
      name: s.name as string,
      description: s.description as string | null,
      icon: s.icon as string | null,
      isActive: s.is_active as boolean,
      displayOrder: s.display_order as number,
      createdAt: s.created_at as string,
      updatedAt: s.updated_at as string,
      basePrice: s.base_price as number,
      defaultPriority: s.default_priority as string,
    }));
  };

  const handleServiceChange = (serviceId: string, field: keyof ExtendedService, value: unknown) => {
    setEditedServices((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value,
      },
    }));
  };

  const handleMultiplierChange = (multiplierId: string, value: number) => {
    setEditedMultipliers((prev) => ({
      ...prev,
      [multiplierId]: value,
    }));
  };

  const saveChanges = async () => {
    try {
      setIsSaving(true);

      // Save service changes
      for (const [serviceId, changes] of Object.entries(editedServices)) {
        const updateData: Record<string, unknown> = {};
        if (changes.basePrice !== undefined) updateData.base_price = changes.basePrice;
        if (changes.defaultPriority !== undefined) updateData.default_priority = changes.defaultPriority;
        if (changes.isActive !== undefined) updateData.is_active = changes.isActive;

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('services')
            .update(updateData)
            .eq('id', serviceId);
          if (error) throw error;
        }
      }

      // Save multiplier changes
      for (const [multiplierId, multiplier] of Object.entries(editedMultipliers)) {
        await pricingService.updateMultiplier(multiplierId, multiplier);
      }

      toast.success('Modifications enregistrées');
      setEditedServices({});
      setEditedMultipliers({});
      await loadData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = <T extends keyof ExtendedService>(
    service: ExtendedService,
    field: T
  ): ExtendedService[T] => {
    const edited = editedServices[service.id];
    if (edited && edited[field] !== undefined) {
      return edited[field] as ExtendedService[T];
    }
    return service[field];
  };

  const getMultiplierValue = (multiplier: PriorityMultiplier): number => {
    if (editedMultipliers[multiplier.id] !== undefined) {
      return editedMultipliers[multiplier.id];
    }
    return multiplier.multiplier;
  };

  const hasChanges = Object.keys(editedServices).length > 0 || Object.keys(editedMultipliers).length > 0;

  const getPriorityLabel = (priority: string): string => {
    const found = multipliers.find((m) => m.priority === priority);
    return found?.label || priority;
  };

  const getPriorityBadgeVariant = (priority: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Priority Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Coefficients multiplicateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {multipliers.map((multiplier) => (
              <div key={multiplier.id} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge variant={getPriorityBadgeVariant(multiplier.priority)}>
                    {multiplier.label}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={getMultiplierValue(multiplier)}
                    onChange={(e) => handleMultiplierChange(multiplier.id, parseFloat(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">×</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Services et tarifs
          </CardTitle>
          {hasChanges && (
            <Button onClick={saveChanges} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Prix de base</TableHead>
                <TableHead>Priorité par défaut</TableHead>
                <TableHead>Prix estimé</TableHead>
                <TableHead>Actif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const basePrice = getDisplayValue(service, 'basePrice') as number;
                const defaultPriority = getDisplayValue(service, 'defaultPriority') as string;
                const isActive = getDisplayValue(service, 'isActive') as boolean;
                const multiplier = multipliers.find((m) => m.priority === defaultPriority);
                const multiplierValue = multiplier ? getMultiplierValue(multiplier) : 1;
                const estimatedPrice = pricingService.calculateEstimatedPrice(basePrice, multiplierValue);

                return (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={basePrice}
                          onChange={(e) =>
                            handleServiceChange(service.id, 'basePrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                        <Euro className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={defaultPriority}
                        onValueChange={(value) => handleServiceChange(service.id, 'defaultPriority', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {multipliers.map((m) => (
                            <SelectItem key={m.priority} value={m.priority}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-primary">{estimatedPrice.toFixed(2)}</span>
                        <Euro className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          ({basePrice} × {multiplierValue})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => handleServiceChange(service.id, 'isActive', checked)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
