import { supabase } from '@/integrations/supabase/client';
import type { IPartnersService } from '@/services/interfaces/partners-enriched.interface';

class SupabasePartnersService implements IPartnersService {
  async getPartnerApplication(userId: string) {
    try {
      const { data } = await supabase
        .from('partner_applications')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return data;
    } catch (error) {
      console.error('Error fetching partner application:', error);
      return null;
    }
  }

  async searchPartners(query?: string) {
    try {
      let q = supabase
        .from('partner_applications')
        .select('*');

      if (query) {
        q = q.or(`company_name.ilike.%${query}%,skills.ilike.%${query}%`);
      }

      const { data } = await q;
      return data || [];
    } catch (error) {
      console.error('Error searching partners:', error);
      return [];
    }
  }
}

export const supabasePartnersService = new SupabasePartnersService();

