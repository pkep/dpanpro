import { supabase } from '@/integrations/supabase/client';

export interface Rating {
  id: string;
  interventionId: string;
  clientId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRating {
  id: string;
  intervention_id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

class RatingsService {
  async getRating(interventionId: string): Promise<Rating | null> {
    const { data, error } = await supabase
      .from('intervention_ratings')
      .select('*')
      .eq('intervention_id', interventionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching rating:', error);
      throw error;
    }

    return data ? this.mapToRating(data as DbRating) : null;
  }

  async createRating(
    interventionId: string,
    clientId: string,
    rating: number,
    comment?: string
  ): Promise<Rating> {
    const { data, error } = await supabase
      .from('intervention_ratings')
      .insert({
        intervention_id: interventionId,
        client_id: clientId,
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating rating:', error);
      throw error;
    }

    return this.mapToRating(data as DbRating);
  }

  async updateRating(
    ratingId: string,
    rating: number,
    comment?: string
  ): Promise<Rating> {
    const { data, error } = await supabase
      .from('intervention_ratings')
      .update({
        rating,
        comment: comment || null,
      })
      .eq('id', ratingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating rating:', error);
      throw error;
    }

    return this.mapToRating(data as DbRating);
  }

  async getTechnicianAverageRating(technicianId: string): Promise<{ average: number; count: number }> {
    // First get all interventions for this technician
    const { data: interventions, error: interventionsError } = await supabase
      .from('interventions')
      .select('id')
      .eq('technician_id', technicianId)
      .eq('status', 'completed');

    if (interventionsError) {
      console.error('Error fetching technician interventions:', interventionsError);
      throw interventionsError;
    }

    if (!interventions || interventions.length === 0) {
      return { average: 0, count: 0 };
    }

    const interventionIds = interventions.map(i => i.id);

    // Get all ratings for those interventions
    const { data: ratings, error: ratingsError } = await supabase
      .from('intervention_ratings')
      .select('rating')
      .in('intervention_id', interventionIds);

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      throw ratingsError;
    }

    if (!ratings || ratings.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / ratings.length) * 10) / 10,
      count: ratings.length,
    };
  }

  async getAllTechniciansRatings(): Promise<Map<string, { average: number; count: number }>> {
    // Get all completed interventions with their technician IDs
    const { data: interventions, error: interventionsError } = await supabase
      .from('interventions')
      .select('id, technician_id')
      .eq('status', 'completed')
      .not('technician_id', 'is', null);

    if (interventionsError) {
      console.error('Error fetching interventions:', interventionsError);
      throw interventionsError;
    }

    if (!interventions || interventions.length === 0) {
      return new Map();
    }

    const interventionIds = interventions.map(i => i.id);

    // Get all ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('intervention_ratings')
      .select('rating, intervention_id')
      .in('intervention_id', interventionIds);

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      throw ratingsError;
    }

    // Map intervention_id to technician_id
    const interventionToTechnician = new Map<string, string>();
    interventions.forEach(i => {
      if (i.technician_id) {
        interventionToTechnician.set(i.id, i.technician_id);
      }
    });

    // Calculate average per technician
    const technicianRatings = new Map<string, number[]>();
    
    ratings?.forEach(r => {
      const techId = interventionToTechnician.get(r.intervention_id);
      if (techId) {
        const existing = technicianRatings.get(techId) || [];
        existing.push(r.rating);
        technicianRatings.set(techId, existing);
      }
    });

    const result = new Map<string, { average: number; count: number }>();
    technicianRatings.forEach((ratings, techId) => {
      const sum = ratings.reduce((acc, r) => acc + r, 0);
      result.set(techId, {
        average: Math.round((sum / ratings.length) * 10) / 10,
        count: ratings.length,
      });
    });

    return result;
  }

  private mapToRating(data: DbRating): Rating {
    return {
      id: data.id,
      interventionId: data.intervention_id,
      clientId: data.client_id,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const ratingsService = new RatingsService();
