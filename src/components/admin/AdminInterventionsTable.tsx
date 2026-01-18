import { useState, useEffect } from 'react';
import { interventionsService } from '@/services/interventions/interventions.service';
import { usersService } from '@/services/users/users.service';
import { ratingsService } from '@/services/ratings/ratings.service';
import type { Intervention, InterventionStatus } from '@/types/intervention.types';
import type { User } from '@/types/auth.types';
import { STATUS_LABELS, CATEGORY_LABELS, CATEGORY_ICONS, PRIORITY_LABELS } from '@/types/intervention.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { AlertCircle, UserPlus, Eye, MapPin, Star } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS: Record<InterventionStatus, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-200',
  assigned: 'bg-purple-500/10 text-purple-600 border-purple-200',
  en_route: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  in_progress: 'bg-orange-500/10 text-orange-600 border-orange-200',
  completed: 'bg-green-500/10 text-green-600 border-green-200',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface AdminInterventionsTableProps {
  onInterventionUpdated?: () => void;
}

export function AdminInterventionsTable({ onInterventionUpdated }: AdminInterventionsTableProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [technicianRatings, setTechnicianRatings] = useState<Map<string, { average: number; count: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [interventionsData, techniciansData, ratingsData] = await Promise.all([
        interventionsService.getInterventions(),
        usersService.getTechnicians(),
        ratingsService.getAllTechniciansRatings(),
      ]);
      setInterventions(interventionsData);
      setTechnicians(techniciansData);
      setTechnicianRatings(ratingsData);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id: string, status: InterventionStatus) => {
    try {
      setUpdatingId(id);
      await interventionsService.updateStatus(id, status);
      await fetchData();
      onInterventionUpdated?.();
      toast.success('Statut mis à jour');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignTechnician = async (interventionId: string, technicianId: string) => {
    try {
      setUpdatingId(interventionId);
      await interventionsService.assignTechnician(interventionId, technicianId);
      await fetchData();
      onInterventionUpdated?.();
      toast.success('Technicien assigné');
    } catch (err) {
      toast.error('Erreur lors de l\'assignation');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getTechnicianName = (technicianId: string | null | undefined) => {
    if (!technicianId) return 'Non assigné';
    const tech = technicians.find((t) => t.id === technicianId);
    return tech ? `${tech.firstName} ${tech.lastName}` : 'Inconnu';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Technicien</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interventions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Aucune intervention trouvée
              </TableCell>
            </TableRow>
          ) : (
            interventions.map((intervention) => (
              <TableRow key={intervention.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(intervention.createdAt), 'dd/MM/yyyy', { locale: fr })}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    {CATEGORY_ICONS[intervention.category]}
                    <span className="text-sm">{CATEGORY_LABELS[intervention.category]}</span>
                  </span>
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {intervention.title}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                  {intervention.city}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {PRIORITY_LABELS[intervention.priority]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={intervention.technicianId || 'unassigned'}
                    onValueChange={(value) => {
                      if (value !== 'unassigned') {
                        handleAssignTechnician(intervention.id, value);
                      }
                    }}
                    disabled={updatingId === intervention.id}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Assigner">
                        {intervention.technicianId ? (
                          getTechnicianName(intervention.technicianId)
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <UserPlus className="h-3 w-3" />
                            Assigner
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => {
                        const rating = technicianRatings.get(tech.id);
                        return (
                          <SelectItem key={tech.id} value={tech.id}>
                            <span className="flex items-center gap-2">
                              <span>{tech.firstName} {tech.lastName}</span>
                              {rating && rating.count > 0 && (
                                <span className="flex items-center gap-0.5 text-xs">
                                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                  {rating.average.toFixed(1)}
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={intervention.status}
                    onValueChange={(value) => handleStatusChange(intervention.id, value as InterventionStatus)}
                    disabled={updatingId === intervention.id}
                  >
                    <SelectTrigger className="w-32">
                      <Badge className={`${STATUS_COLORS[intervention.status]} border`}>
                        {STATUS_LABELS[intervention.status]}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIntervention(intervention)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {CATEGORY_ICONS[intervention.category]}
                          {intervention.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                          <p className="text-sm">{intervention.description || 'Aucune description'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Adresse</h4>
                          <p className="text-sm flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {intervention.address}, {intervention.postalCode} {intervention.city}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Catégorie</h4>
                            <p className="text-sm">{CATEGORY_LABELS[intervention.category]}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Priorité</h4>
                            <Badge variant="outline">{PRIORITY_LABELS[intervention.priority]}</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Statut</h4>
                            <Badge className={`${STATUS_COLORS[intervention.status]} border`}>
                              {STATUS_LABELS[intervention.status]}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Technicien</h4>
                            <p className="text-sm">{getTechnicianName(intervention.technicianId)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>Créée le: {format(new Date(intervention.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
                          {intervention.completedAt && (
                            <div>Terminée le: {format(new Date(intervention.completedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
