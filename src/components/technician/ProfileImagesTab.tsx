import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TechnicianPhotoUpload } from './TechnicianPhotoUpload';
import { AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET_NAME = 'technician-photos';

export function ProfileImagesTab() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCurrentPhotos();
    }
  }, [user]);

  const fetchCurrentPhotos = async () => {
    if (!user) return;
    
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

  const handleAvatarDelete = async () => {
    toast.error('La photo de profil est obligatoire et ne peut pas être supprimée');
  };

  const handleLogoDelete = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ company_logo_url: null })
        .eq('id', user?.id);

      if (error) throw error;
      
      setLogoUrl(null);
      toast.success('Logo supprimé');
    } catch (err: any) {
      console.error('Error deleting logo:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Images du profil</CardTitle>
        <CardDescription>
          Gérez votre photo de profil et le logo de votre entreprise
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Votre photo de profil est visible par les clients lors des interventions. 
            Assurez-vous qu'elle soit professionnelle et que votre visage soit clairement visible.
          </AlertDescription>
        </Alert>

        {!avatarUrl && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Photo de profil manquante !</strong> Vous devez ajouter votre photo pour pouvoir recevoir des interventions.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 sm:grid-cols-2 py-4">
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
            onDelete={logoUrl ? handleLogoDelete : undefined}
            label="Logo entreprise"
            description="Optionnel - visible sur les devis"
            shape="square"
          />
        </div>
      </CardContent>
    </Card>
  );
}
