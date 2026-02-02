import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { storageService } from '@/services/storage/storage.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TechnicianPhotoUpload } from './TechnicianPhotoUpload';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET_NAME = 'technician-photos';

interface RequiredPhotosModalProps {
  open: boolean;
  onComplete: () => void;
}

export function RequiredPhotosModal({ open, onComplete }: RequiredPhotosModalProps) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchCurrentPhotos();
    }
  }, [user, open]);

  const fetchCurrentPhotos = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url, company_logo_url')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setAvatarUrl(data.avatar_url);
        setLogoUrl(data.company_logo_url);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadPhoto = async (file: File, type: 'avatar' | 'logo'): Promise<string> => {
    if (!user) throw new Error('Non authentifié');

    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const url = await uploadPhoto(file, 'avatar');
      
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', user?.id);

      if (error) throw error;
      
      setAvatarUrl(url);
      toast.success('Photo de profil mise à jour');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error(err.message || 'Erreur lors de l\'upload');
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const url = await uploadPhoto(file, 'logo');
      
      const { error } = await supabase
        .from('users')
        .update({ company_logo_url: url })
        .eq('id', user?.id);

      if (error) throw error;
      
      setLogoUrl(url);
      toast.success('Logo de l\'entreprise mis à jour');
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      toast.error(err.message || 'Erreur lors de l\'upload');
    }
  };

  const handleContinue = () => {
    if (!avatarUrl) {
      toast.error('Veuillez ajouter votre photo de profil');
      return;
    }
    onComplete();
  };

  const canContinue = !!avatarUrl;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complétez votre profil</DialogTitle>
          <DialogDescription>
            Pour pouvoir recevoir des interventions, vous devez ajouter votre photo de profil.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                Votre photo sera visible par les clients lors des interventions.
              </AlertDescription>
            </Alert>

            <div className="grid gap-8 sm:grid-cols-2">
              <TechnicianPhotoUpload
                currentUrl={avatarUrl}
                onUpload={handleAvatarUpload}
                label="Photo de profil"
                description="Votre visage clairement visible"
                isRequired
                shape="circle"
              />

              <TechnicianPhotoUpload
                currentUrl={logoUrl}
                onUpload={handleLogoUpload}
                label="Logo entreprise"
                description="Optionnel"
                shape="square"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleContinue}
                disabled={!canContinue || isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
