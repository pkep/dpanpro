import { Clock, Check, X, MapPin, Wrench, Navigation, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDispatchAssignment } from '@/hooks/useDispatchAssignment';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';

interface DispatchAssignmentCardProps {
  interventionId?: string;
  interventionTitle?: string;
  interventionCategory?: string;
  interventionAddress?: string;
  interventionCity?: string;
}

const TIMEOUT_SECONDS = 5 * 60; // 5 minutes

export function DispatchAssignmentCard({
  interventionId,
  interventionTitle,
  interventionCategory,
  interventionAddress,
  interventionCity,
}: DispatchAssignmentCardProps) {
  const navigate = useNavigate();
  const {
    pendingAssignment,
    isLoading,
    timeRemaining,
    travelInfo,
    acceptAssignment,
    rejectAssignment,
  } = useDispatchAssignment(interventionId);

  const handleAccept = async () => {
    const acceptedId = await acceptAssignment();
    if (acceptedId) {
      navigate(`/technician/intervention/${acceptedId}`);
    }
  };

  if (!pendingAssignment) return null;

  const progress = timeRemaining !== null 
    ? ((TIMEOUT_SECONDS - timeRemaining) / TIMEOUT_SECONDS) * 100 
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const categoryLabel = interventionCategory 
    ? CATEGORY_LABELS[interventionCategory as keyof typeof CATEGORY_LABELS] 
    : 'Intervention';
  
  const categoryIcon = interventionCategory 
    ? CATEGORY_ICONS[interventionCategory as keyof typeof CATEGORY_ICONS] 
    : '🔧';

  return (
    <Card className="border-primary/50 bg-primary/5 animate-pulse-slow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            Nouvelle mission
          </CardTitle>
          <Badge variant="outline" className="bg-background">
            <Clock className="h-3 w-3 mr-1" />
            {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
          </Badge>
        </div>
        <Progress value={progress} className="h-1 mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-3">
        {interventionTitle && (
          <div className="font-medium">{interventionTitle}</div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          <span>{categoryLabel}</span>
        </div>
        
        {(interventionAddress || interventionCity) && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {interventionAddress}
              {interventionCity && `, ${interventionCity}`}
            </span>
          </div>
        )}

        {/* Distance and travel time info */}
        {travelInfo && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
              <Navigation className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Distance</div>
                <div className="font-semibold">{travelInfo.distanceFormatted}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
              <Timer className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Temps estimé</div>
                <div className="font-semibold">~{travelInfo.estimatedMinutes} min</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="text-center p-2 bg-background rounded-lg">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="font-semibold">{pendingAssignment.score.toFixed(1)}</div>
          </div>
          <div className="text-center p-2 bg-background rounded-lg">
            <div className="text-xs text-muted-foreground">Rang</div>
            <div className="font-semibold">#{pendingAssignment.attemptOrder}</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={rejectAssignment}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Refuser
        </Button>
        <Button
          className="flex-1"
          onClick={handleAccept}
          disabled={isLoading}
        >
          <Check className="h-4 w-4 mr-2" />
          Accepter
        </Button>
      </CardFooter>
    </Card>
  );
}
