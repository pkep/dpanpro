-- Create table for technician working schedules
CREATE TABLE public.technician_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id, day_of_week)
);

-- Create table for specific day overrides (vacations, special hours)
CREATE TABLE public.technician_schedule_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id, override_date)
);

-- Enable RLS
ALTER TABLE public.technician_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_schedule_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for technician_schedules
CREATE POLICY "Technicians can view all schedules"
ON public.technician_schedules
FOR SELECT
USING (true);

CREATE POLICY "Technicians can manage their own schedule"
ON public.technician_schedules
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for technician_schedule_overrides
CREATE POLICY "Anyone can view schedule overrides"
ON public.technician_schedule_overrides
FOR SELECT
USING (true);

CREATE POLICY "Technicians can manage their own overrides"
ON public.technician_schedule_overrides
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_technician_schedules_updated_at
BEFORE UPDATE ON public.technician_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technician_schedule_overrides_updated_at
BEFORE UPDATE ON public.technician_schedule_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();