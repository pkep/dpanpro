import type { InterventionStatus } from '@/types/intervention.types';
import { STATUS_LABELS } from '@/types/intervention.types';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_ORDER: InterventionStatus[] = [
  'new',
  'assigned',
  'en_route',
  'in_progress',
  'completed',
];

interface StatusTimelineProps {
  currentStatus: InterventionStatus;
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  // Handle cancelled status separately
  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20">
          <Circle className="h-4 w-4 text-destructive fill-destructive" />
          <span className="text-sm font-medium text-destructive">
            {STATUS_LABELS.cancelled}
          </span>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
        
        {/* Progress line */}
        <div 
          className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${(currentIndex / (STATUS_ORDER.length - 1)) * 100}%` }}
        />

        {STATUS_ORDER.map((status, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div 
              key={status} 
              className="relative flex flex-col items-center z-10"
            >
              {/* Circle/Icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isPast && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110",
                  isFuture && "bg-muted border-2 border-border text-muted-foreground"
                )}
              >
                {isPast ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs text-center whitespace-nowrap transition-all duration-300",
                  isPast && "text-muted-foreground",
                  isCurrent && "text-primary font-semibold",
                  isFuture && "text-muted-foreground/60"
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
