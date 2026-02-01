import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  phoneNumber: string;
  isLoading: boolean;
}

export function useSiteSettings(): SiteSettings {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['phone_number']);

        if (error) throw error;

        data?.forEach((setting) => {
          if (setting.setting_key === 'phone_number') {
            setPhoneNumber(setting.setting_value);
          }
        });
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { phoneNumber, isLoading };
}
