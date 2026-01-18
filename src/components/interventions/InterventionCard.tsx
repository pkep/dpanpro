import { 
  Intervention, 
  CATEGORY_LABELS, 
  CATEGORY_ICONS, 
  STATUS_LABELS, 
  PRIORITY_LABELS 
} from '@/types/intervention.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock } from 'lucide-react';

interface InterventionCardProps {
  intervention: Intervention;
  onClick?: () => void;
}

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'new':
      return 'default';
    case 'assigned':
    case 'en_route':
      return 'secondary';
    case 'in_progress':
      return 'outline';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'text-destructive';
    case 'high':
      return 'text-orange-500';
    case 'normal':
      return 'text-foreground';
    case 'low':
      return 'text-muted-foreground';
    default:
      return 'text-foreground';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function InterventionCard({ intervention, onClick }: InterventionCardProps) {
  const category = intervention.category as keyof typeof CATEGORY_LABELS;
  const status = intervention.status as keyof typeof STATUS_LABELS;
  const priority = intervention.priority as keyof typeof PRIORITY_LABELS;

  return (
    <Card 
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
            <div>
              <CardTitle className="text-base line-clamp-1">
                {intervention.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </p>
            </div>
          </div>
          <Badge variant={getStatusVariant(status)}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {intervention.description}
        </p>
        
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{intervention.city}, {intervention.postalCode}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(intervention.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(intervention.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className={`text-xs font-medium ${getPriorityColor(priority)}`}>
            Priorité: {PRIORITY_LABELS[priority]}
          </span>
          {intervention.scheduledAt && (
            <span className="text-xs text-muted-foreground">
              Prévu: {formatDate(intervention.scheduledAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
