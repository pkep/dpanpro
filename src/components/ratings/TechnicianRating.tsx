import { useState, useEffect } from 'react';
import { ratingsService } from '@/services/ratings/ratings.service';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TechnicianRatingProps {
  technicianId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export function TechnicianRating({
  technicianId,
  size = 'sm',
  showCount = true,
  className,
}: TechnicianRatingProps) {
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const data = await ratingsService.getTechnicianAverageRating(technicianId);
        setRating(data);
      } catch (error) {
        console.error('Error fetching technician rating:', error);
      } finally {
        setLoading(false);
      }
    };

    if (technicianId) {
      fetchRating();
    }
  }, [technicianId]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-1 animate-pulse", className)}>
        <div className="h-3 w-3 bg-muted rounded" />
        <div className="h-3 w-8 bg-muted rounded" />
      </div>
    );
  }

  if (!rating || rating.count === 0) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <Star className={cn(
          "text-muted-foreground/50",
          size === 'sm' && 'h-3 w-3',
          size === 'md' && 'h-4 w-4',
          size === 'lg' && 'h-5 w-5'
        )} />
        <span className={cn(
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          Pas de note
        </span>
      </div>
    );
  }

  const starSizeClass = cn(
    size === 'sm' && 'h-3 w-3',
    size === 'md' && 'h-4 w-4',
    size === 'lg' && 'h-5 w-5'
  );

  const textSizeClass = cn(
    size === 'sm' && 'text-xs',
    size === 'md' && 'text-sm',
    size === 'lg' && 'text-base'
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Star className={cn(starSizeClass, "text-yellow-400 fill-yellow-400")} />
      <span className={cn(textSizeClass, "font-medium")}>
        {rating.average.toFixed(1)}
      </span>
      {showCount && (
        <span className={cn(textSizeClass, "text-muted-foreground")}>
          ({rating.count} avis)
        </span>
      )}
    </div>
  );
}

// Static display component that uses pre-fetched data
interface TechnicianRatingDisplayProps {
  average: number;
  count: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export function TechnicianRatingDisplay({
  average,
  count,
  size = 'sm',
  showCount = true,
  className,
}: TechnicianRatingDisplayProps) {
  if (count === 0) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <Star className={cn(
          "text-muted-foreground/50",
          size === 'sm' && 'h-3 w-3',
          size === 'md' && 'h-4 w-4',
          size === 'lg' && 'h-5 w-5'
        )} />
        <span className={cn(
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          -
        </span>
      </div>
    );
  }

  const starSizeClass = cn(
    size === 'sm' && 'h-3 w-3',
    size === 'md' && 'h-4 w-4',
    size === 'lg' && 'h-5 w-5'
  );

  const textSizeClass = cn(
    size === 'sm' && 'text-xs',
    size === 'md' && 'text-sm',
    size === 'lg' && 'text-base'
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Star className={cn(starSizeClass, "text-yellow-400 fill-yellow-400")} />
      <span className={cn(textSizeClass, "font-medium")}>
        {average.toFixed(1)}
      </span>
      {showCount && (
        <span className={cn(textSizeClass, "text-muted-foreground")}>
          ({count})
        </span>
      )}
    </div>
  );
}
