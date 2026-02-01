import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { servicesService, Service } from '@/services/services/services.service';

export function ServicesSettingsTab() {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    displacementPrice: 0,
    securityPrice: 0,
    repairPrice: 0,
    vatRateIndividual: 10,
    vatRateProfessional: 20,
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ['services-all'],
    queryFn: () => servicesService.getAllServices(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      servicesService.toggleServiceActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-all'] });
      toast.success('Service mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<Service> }) =>
      servicesService.updateService(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-all'] });
      toast.success('Service modifié avec succès');
      setEditingService(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      displacementPrice: service.displacementPrice,
      securityPrice: service.securityPrice,
      repairPrice: service.repairPrice,
      vatRateIndividual: service.vatRateIndividual,
      vatRateProfessional: service.vatRateProfessional,
    });
  };

  const handleSave = () => {
    if (!editingService) return;
    
    updateMutation.mutate({
      id: editingService.id,
      updates: {
        name: formData.name,
        description: formData.description || null,
        displacementPrice: formData.displacementPrice,
        securityPrice: formData.securityPrice,
        repairPrice: formData.repairPrice,
        vatRateIndividual: formData.vatRateIndividual,
        vatRateProfessional: formData.vatRateProfessional,
      },
    });
  };

  const calculateBasePrice = () => {
    return formData.displacementPrice + formData.securityPrice + formData.repairPrice;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Gestion des services
          </CardTitle>
          <CardDescription>
            Modifier les noms, prix et activer/désactiver les services. Le prix de base est la somme des 3 composantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Déplacement</TableHead>
                <TableHead className="text-right">Mise en sécurité</TableHead>
                <TableHead className="text-right">Dépannage</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services?.map((service) => {
                const total = service.displacementPrice + service.securityPrice + service.repairPrice;
                return (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {service.displacementPrice > 0 ? `${service.displacementPrice.toFixed(2)} €` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {service.securityPrice > 0 ? `${service.securityPrice.toFixed(2)} €` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {service.repairPrice > 0 ? `${service.repairPrice.toFixed(2)} €` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {total.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: service.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le service</DialogTitle>
            <DialogDescription>
              Modifiez les informations et les prix du service.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du service</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="displacement">Déplacement (€ HT)</Label>
                <Input
                  id="displacement"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.displacementPrice}
                  onChange={(e) => setFormData({ ...formData, displacementPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="security">Mise en sécurité (€ HT)</Label>
                <Input
                  id="security"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.securityPrice}
                  onChange={(e) => setFormData({ ...formData, securityPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="repair">Dépannage (€ HT)</Label>
                <Input
                  id="repair"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.repairPrice}
                  onChange={(e) => setFormData({ ...formData, repairPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">Prix de base total</p>
              <p className="text-2xl font-bold">{calculateBasePrice().toFixed(2)} € HT</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vatIndividual">TVA particulier (%)</Label>
                <Input
                  id="vatIndividual"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.vatRateIndividual}
                  onChange={(e) => setFormData({ ...formData, vatRateIndividual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="vatProfessional">TVA professionnel (%)</Label>
                <Input
                  id="vatProfessional"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.vatRateProfessional}
                  onChange={(e) => setFormData({ ...formData, vatRateProfessional: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
