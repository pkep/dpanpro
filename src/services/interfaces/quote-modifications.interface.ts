export interface QuoteModification {
  id: string;
  interventionId: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'declined';
  totalAdditionalAmount: number;
  clientNotifiedAt: string | null;
  clientRespondedAt: string | null;
  notificationToken: string;
  createdAt: string;
  updatedAt: string;
  items: QuoteModificationItem[];
}

export interface QuoteModificationItem {
  id: string;
  modificationId: string;
  itemType: 'service' | 'equipment' | 'other';
  label: string;
  description: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  createdAt: string;
}

export interface CreateQuoteModificationInput {
  interventionId: string;
  createdBy: string;
  items: {
    itemType: 'service' | 'equipment' | 'other';
    label: string;
    description?: string;
    unitPrice: number;
    quantity: number;
  }[];
}

export interface IQuoteModificationsService {
  createModification(input: CreateQuoteModificationInput): Promise<QuoteModification>;
  getModification(id: string): Promise<QuoteModification | null>;
  getModificationByToken(token: string): Promise<QuoteModification | null>;
  getModificationsByIntervention(interventionId: string): Promise<QuoteModification[]>;
  approveModification(id: string, signatureData?: string): Promise<{ incrementResult?: unknown }>;
  declineModification(id: string, reason?: string): Promise<void>;
  markAsNotified(id: string): Promise<void>;
  getPendingModification(interventionId: string): Promise<QuoteModification | null>;
}
