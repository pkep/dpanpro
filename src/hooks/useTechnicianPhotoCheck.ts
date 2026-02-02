import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useTechnicianPhotoCheck() {
  const { user } = useAuth();
  const [needsPhoto, setNeedsPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    checkPhoto();
  }, [user]);

  const checkPhoto = async () => {
    if (!user || user.role !== 'technician') {
      setNeedsPhoto(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        const hasPhoto = !!data.avatar_url;
        setAvatarUrl(data.avatar_url);
        setNeedsPhoto(!hasPhoto);
      }
    } catch (err) {
      console.error('Error checking photo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markPhotoComplete = () => {
    setNeedsPhoto(false);
  };

  return {
    needsPhoto,
    isLoading,
    avatarUrl,
    markPhotoComplete,
    recheckPhoto: checkPhoto,
  };
}
