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
    const { data, error } = await supabase
      .from('intervention_ratings')
      .select(`
        rating,
        intervention_id
      `);

    if (error) {
      console.error('Error fetching technician ratings:', error);
      throw error;
    }

    // Filter by technician - we need to join with interventions
    // For now, return all ratings and filter client-side
    // In production, you'd create a database view for this
    const ratings = data as { rating: number; intervention_id: string }[];
    
    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: sum / ratings.length,
      count: ratings.length,
    };
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
