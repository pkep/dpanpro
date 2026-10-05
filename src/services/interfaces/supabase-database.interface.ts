import type { Tables } from '@/integrations/supabase/types';

export type DbQuoteLine = Tables<'intervention_quotes'>;
export type DbQuoteModification = Tables<'quote_modifications'>;
export type DbQuoteModificationItem = Tables<'quote_modification_items'>;
