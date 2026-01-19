export type InterventionCategory = 
  | 'locksmith'      // Serrurerie
  | 'plumbing'       // Plomberie
  | 'electricity'    // Électricité
  | 'glazing'        // Vitrerie
  | 'heating'        // Chauffage
  | 'aircon';        // Climatisation

export type InterventionPriority = 'urgent' | 'high' | 'normal' | 'low';

export type InterventionStatus = 
  | 'new'           // Nouveau
  | 'assigned'      // Assigné
  | 'en_route'      // En route
  | 'in_progress'   // En cours
  | 'completed'     // Terminé
  | 'cancelled';    // Annulé

export interface Intervention {
  id: string;
  clientId: string;
  technicianId?: string | null;
  category: InterventionCategory;
  priority: InterventionPriority;
  status: InterventionStatus;
  title: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  estimatedPrice?: number | null;
  finalPrice?: number | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  photos?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  trackingCode?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
}

export interface InterventionFormData {
  category: InterventionCategory;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  priority?: InterventionPriority;
  clientEmail?: string;
  clientPhone?: string;
  photos?: string[];
}

export const CATEGORY_LABELS: Record<InterventionCategory, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

export const CATEGORY_ICONS: Record<InterventionCategory, string> = {
  locksmith: '🔑',
  plumbing: '🔧',
  electricity: '⚡',
  glazing: '🪟',
  heating: '🔥',
  aircon: '❄️',
};

export const STATUS_LABELS: Record<InterventionStatus, string> = {
  new: 'Nouveau',
  assigned: 'Assigné',
  en_route: 'En route',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export const PRIORITY_LABELS: Record<InterventionPriority, string> = {
  urgent: 'Urgent',
  high: 'Haute',
  normal: 'Normale',
  low: 'Basse',
};
