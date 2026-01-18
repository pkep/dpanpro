import { useState, useEffect } from 'react';
import { historyService } from '@/services/history/history.service';
import { usersService } from '@/services/users/users.service';
import type { InterventionHistory } from '@/types/history.types';
import type { User } from '@/types/auth.types';
import { ACTION_LABELS } from '@/types/history.types';
import { STATUS_LABELS } from '@/types/intervention.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  UserPlus, 
  RefreshCw, 
  MessageSquare, 
  PlusCircle,
  ArrowRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <PlusCircle className="h-4 w-4" />,
  status_changed: <RefreshCw className="h-4 w-4" />,
  assigned: <UserPlus className="h-4 w-4" />,
  updated: <RefreshCw className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
};

interface InterventionTimelineProps {
  interventionId: string;
  refreshKey?: number;
}

export function InterventionTimeline({ interventionId, refreshKey }: InterventionTimelineProps) {
  const [history, setHistory] = useState<InterventionHistory[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [historyData, usersData] = await Promise.all([
          historyService.getHistoryForIntervention(interventionId),
          usersService.getUsers(),
        ]);
        
        setHistory(historyData);
        
        const usersMap = new Map<string, User>();
        usersData.forEach((user) => usersMap.set(user.id, user));
        setUsers(usersMap);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [interventionId, refreshKey]);

  const getUserName = (userId: string) => {
    const user = users.get(userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur inconnu';
  };

  const formatStatusLabel = (value: string | null) => {
    if (!value) return '';
    return STATUS_LABELS[value as keyof typeof STATUS_LABELS] || value;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      
      <div className="space-y-6">
        {history.map((entry, index) => (
          <div key={entry.id} className="relative flex gap-4 pl-10">
            {/* Timeline dot */}
            <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary">
              {ACTION_ICONS[entry.action] || <Clock className="h-4 w-4" />}
            </div>
            
            <div className="flex-1 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {ACTION_LABELS[entry.action]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    par {getUserName(entry.userId)}
                  </span>
                </div>
                <time className="text-xs text-muted-foreground">
                  {format(new Date(entry.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </time>
              </div>
              
              {/* Action details */}
              {entry.action === 'status_changed' && entry.oldValue && entry.newValue && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{formatStatusLabel(entry.oldValue)}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="default">{formatStatusLabel(entry.newValue)}</Badge>
                </div>
              )}
              
              {entry.action === 'assigned' && entry.newValue && (
                <p className="text-sm">
                  Technicien assigné: <strong>{getUserName(entry.newValue)}</strong>
                </p>
              )}
              
              {entry.comment && (
                <p className="text-sm mt-2 text-muted-foreground italic">
                  "{entry.comment}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
