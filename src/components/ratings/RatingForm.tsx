import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ratingsService, Rating } from '@/services/ratings/ratings.service';
import { StarRating } from './StarRating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, CheckCircle, Edit2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RatingFormProps {
  interventionId: string;
  clientId: string;
  interventionStatus: string;
  isClient: boolean;
}

export function RatingForm({ 
  interventionId, 
  clientId, 
  interventionStatus,
  isClient,
}: RatingFormProps) {
  const { user } = useAuth();
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const canRate = isClient && user?.id === clientId && interventionStatus === 'completed';

  useEffect(() => {
    const fetchRating = async () => {
      try {
        setLoading(true);
        const data = await ratingsService.getRating(interventionId);
        if (data) {
          setExistingRating(data);
          setRating(data.rating);
          setComment(data.comment || '');
        }
      } catch (error) {
        console.error('Error fetching rating:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [interventionId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    try {
      setSubmitting(true);
      
      if (existingRating) {
        const updated = await ratingsService.updateRating(
          existingRating.id,
          rating,
          comment
        );
        setExistingRating(updated);
        toast.success('Avis mis à jour avec succès');
      } else {
        const created = await ratingsService.createRating(
          interventionId,
          clientId,
          rating,
          comment
        );
        setExistingRating(created);
        toast.success('Merci pour votre avis !');
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Erreur lors de l\'envoi de l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show existing rating (read-only for non-clients or already rated)
  if (existingRating && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Avis client
          </CardTitle>
          <CardDescription>
            Noté le {format(new Date(existingRating.createdAt), 'dd MMMM yyyy', { locale: fr })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <StarRating value={existingRating.rating} readonly size="md" />
            <Badge variant="secondary" className="text-sm">
              {existingRating.rating}/5
            </Badge>
          </div>
          
          {existingRating.comment && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="italic">"{existingRating.comment}"</span>
              </p>
            </div>
          )}

          {canRate && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="w-full"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Modifier mon avis
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show form for rating (only for clients on completed interventions)
  if (canRate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5" />
            {existingRating ? 'Modifier votre avis' : 'Évaluez cette intervention'}
          </CardTitle>
          <CardDescription>
            Votre avis nous aide à améliorer notre service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <div className="flex items-center gap-3">
              <StarRating value={rating} onChange={setRating} size="lg" />
              {rating > 0 && (
                <span className="text-lg font-semibold">{rating}/5</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Commentaire (optionnel)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500 caractères
            </p>
          </div>

          <div className="flex gap-2">
            {isEditing && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  if (existingRating) {
                    setRating(existingRating.rating);
                    setComment(existingRating.comment || '');
                  }
                }}
                disabled={submitting}
              >
                Annuler
              </Button>
            )}
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || rating === 0}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {existingRating ? 'Mettre à jour' : 'Envoyer mon avis'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show message for non-completed interventions
  if (isClient && interventionStatus !== 'completed') {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              Vous pourrez noter cette intervention une fois qu'elle sera terminée.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No rating exists and user can't rate
  if (!existingRating) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun avis pour cette intervention</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
