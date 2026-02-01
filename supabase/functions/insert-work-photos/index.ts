import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkPhotoInsert {
  intervention_id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  uploaded_by: string;
  description?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { photos } = await req.json() as { photos: WorkPhotoInsert[] };

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      console.error('[insert-work-photos] Invalid request: photos array is required');
      return new Response(
        JSON.stringify({ error: 'photos array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each photo
    for (const photo of photos) {
      if (!photo.intervention_id || !photo.photo_url || !photo.photo_type || !photo.uploaded_by) {
        console.error('[insert-work-photos] Invalid photo data:', photo);
        return new Response(
          JSON.stringify({ error: 'Each photo must have intervention_id, photo_url, photo_type, and uploaded_by' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[insert-work-photos] Inserting photos:', photos.length);

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Prepare data for insert
    const insertData = photos.map(photo => ({
      intervention_id: photo.intervention_id,
      photo_url: photo.photo_url,
      photo_type: photo.photo_type,
      uploaded_by: photo.uploaded_by,
      description: photo.description || null,
    }));

    const { data, error } = await supabaseAdmin
      .from('intervention_work_photos')
      .insert(insertData)
      .select();

    if (error) {
      console.error('[insert-work-photos] Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[insert-work-photos] Success, inserted:', data?.length);

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[insert-work-photos] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
