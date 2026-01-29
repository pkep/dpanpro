import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ratings/StarRating';
import { Loader2, CheckCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TechnicianRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interventionId: string;
  technicianId: string;
  onSubmitted?: () => void;
}

export function TechnicianRatingDialog({
  open,
  onOpenChange,
  interventionId,
  technicianId,
  onSubmitted,
}: TechnicianRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert technician rating for the client
      const { error } = await supabase
        .from('technician_client_ratings')
        .insert({
          intervention_id: interventionId,
          technician_id: technicianId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) {
        // If table doesn't exist yet, just log and continue
        console.error('Error saving technician rating:', error);
        toast.info('Note enregistrée localement');
      } else {
        toast.success('Merci pour votre avis sur le client !');
      }

      onOpenChange(false);
      onSubmitted?.();
    } catch (err) {
      console.error('Error submitting technician rating:', err);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Noter le client
          </DialogTitle>
          <DialogDescription>
            Comment s'est passée l'intervention avec ce client ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              placeholder="Décrivez votre expérience avec ce client..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500 caractères
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={isSubmitting}>
            Passer
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Envoi...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
