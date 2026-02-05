import type { QuoteLine } from '@/services/quotes/quotes.service';
import type { QuoteModification } from '@/services/quote-modifications/quote-modifications.service';
import type { WorkPhoto } from '@/services/work-photos/work-photos.service';

export type StartStep = 'photos' | 'quote_review' | 'add_items' | 'signature' | 'processing';

export interface StartInterventionState {
  step: StartStep;
  photos: File[];
  previews: string[];
  quoteLines: QuoteLine[];
  pendingItems: QuoteModificationItem[];
  signatureData: string | null;
  isLoading: boolean;
  error: string | null;
  vatRate: number;
  isCompany: boolean;
}

export interface QuoteModificationItem {
  id: string;
  itemType: 'service' | 'equipment' | 'other';
  label: string;
  description: string;
  unitPrice: number;
  quantity: number;
}

export interface StartInterventionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interventionId: string;
  userId: string;
  category: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientId: string | null;
  onSuccess: (photos: WorkPhoto[]) => void;
}
