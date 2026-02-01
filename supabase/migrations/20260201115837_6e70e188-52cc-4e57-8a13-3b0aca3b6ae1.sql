-- 1. Update the status constraint to include 'arrived'
ALTER TABLE public.interventions 
DROP CONSTRAINT IF EXISTS interventions_status_check;

ALTER TABLE public.interventions 
ADD CONSTRAINT interventions_status_check 
CHECK (status IN ('new', 'assigned', 'on_route', 'arrived', 'in_progress', 'completed', 'cancelled'));

-- 2. Create table for technician work photos (before/after)
CREATE TABLE public.intervention_work_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervention_work_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Technicians can insert their own photos
CREATE POLICY "Technicians can insert work photos"
ON public.intervention_work_photos
FOR INSERT
WITH CHECK (true);

-- Policy: Technicians can view photos for their interventions, admins/managers can view all
CREATE POLICY "Authorized users can view work photos"
ON public.intervention_work_photos
FOR SELECT
USING (
  -- Technician who uploaded
  uploaded_by = auth.uid()
  OR
  -- Admin or manager
  is_admin_or_manager(auth.uid())
  OR
  -- Technician assigned to intervention
  EXISTS (
    SELECT 1 FROM interventions i 
    WHERE i.id = intervention_work_photos.intervention_id 
    AND i.technician_id = auth.uid()
  )
);

-- Policy: Only uploader or admin can delete
CREATE POLICY "Authorized users can delete work photos"
ON public.intervention_work_photos
FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR
  is_admin_or_manager(auth.uid())
);

-- Create index for faster lookups
CREATE INDEX idx_intervention_work_photos_intervention ON public.intervention_work_photos(intervention_id);
CREATE INDEX idx_intervention_work_photos_type ON public.intervention_work_photos(photo_type);