import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { historyService } from '@/services/history/history.service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface AddCommentFormProps {
  interventionId: string;
  onCommentAdded?: () => void;
}

export function AddCommentForm({ interventionId, onCommentAdded }: AddCommentFormProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !comment.trim()) return;

    try {
      setSubmitting(true);
      await historyService.addHistoryEntry({
        interventionId,
        userId: user.id,
        action: 'comment',
        comment: comment.trim(),
      });
      setComment('');
      toast.success('Commentaire ajouté');
      onCommentAdded?.();
    } catch (err) {
      toast.error('Erreur lors de l\'ajout du commentaire');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Ajouter un commentaire..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        disabled={submitting}
      />
      <Button 
        type="submit" 
        disabled={!comment.trim() || submitting}
        className="w-full sm:w-auto"
      >
        <Send className="h-4 w-4 mr-2" />
        Envoyer
      </Button>
    </form>
  );
}
