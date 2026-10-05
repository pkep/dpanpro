export type InterventionCategory = 
  | 'locksmith'      // Serrurerie
  | 'plumbing'       // Plomberie
  | 'electricity'    // Électricité
  | 'glazing'        // Vitrerie
  | 'heating'        // Chauffage
  | 'aircon';        // Climatisation

export type InterventionPriority = 'urgent' | 'high' | 'normal' | 'low';

export type InterventionStatus = 
  | 'new'                         // Nouveau
  | 'scheduled_assigned'          // Planifiée (assignée) — non bloquant
  | 'assigned'                    // Assigné
  | 'on_route'                    // En route
  | 'arrived'                     // Arrivé sur place
  | 'in_progress'                 // En cours
  | 'completed'                   // Terminé
  | 'cancelled'                   // Annulé
  | 'complete_climbed'            // Transférée (interne)
  | 'complete_climbed_external'   // Transférée (externe)
  | 'cancelled_escalation_declined'; // Annulée (remplacement refusé)

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
  /** Suspension booléenne (V43) : le statut métier est conservé, le technicien est libéré. */
  suspended?: boolean;
  suspendedAt?: string | null;
  suspendedBy?: string | null;
  suspensionReason?: string | null;
  expectedCompletionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  trackingCode?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  quoteSignedAt?: string | null;
  quoteSignatureData?: string | null;
  quotePdfUrl?: string | null;
  questionnaireResultatId?: string | null;
  questionnaireAnswers : string | null;
  prixMin : number | null;
  prixMax : number | null;
  invoiceSignedAt?: string | null;
  invoiceSignatureData?: string | null;

  // ── Escalade (« climb ») ────────────────────────────────────────────────
  parentInterventionId?: string | null;
  escalationType?: 'internal' | 'external' | null;
  billingMode?: 'call_out_fee' | 'full_service' | null;
  serviceStarted?: boolean | null;
  customerConsent?: boolean | null;
  escalationReason?: string | null;
  escalationNotes?: string | null;
  escalationRequestedAt?: string | null;
  escalationCompletedAt?: string | null;
  escalationConsentSignatureData?: string | null;
  escalationConsentSignedAt?: string | null;

  // ── B2B ─────────────────────────────────────────────────────────────────
  billingType?: 'client' | 'b2b';
  b2bPartnerId?: string | null;
  b2bInvoiceId?: string | null;
  clientFirstName?: string | null;
  clientLastName?: string | null;
  /** Référence de commande du système du partenaire B2B. */
  b2bOrderReference?: string | null;
  /** Plafond de prix B2B (TTC) — contrôle avec marge (voir lib/b2bPriceCap). */
  b2bPriceCap?: number | null;
  // Champs enrichis uniquement par la liste admin (outil du tableau)
  b2bCompanyName?: string | null;
  b2bContactFirstName?: string | null;
  b2bContactLastName?: string | null;
  b2bContactPhone?: string | null;
  /** Nombre de photos client (liste admin — `photos` n'est plus transporté). */
  clientPhotosCount?: number;
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
  role ?: 'client' | 'guest';
  scheduledAt?: string | null;
  affiliateCode?: string;
  // ── B2B ──
  billingType?: 'client' | 'b2b';
  b2bPartnerId?: string;
  clientFirstName?: string;
  clientLastName?: string;
  b2bOrderReference?: string;
  /** Plafond de prix B2B (TTC) à la création. */
  b2bPriceCap?: number;
}

export interface InterventionQuestionnaireData {
  questionnaireAnswers?: string[];
  questionnaireResultName?: string;
  prixMin?: number | null;
  prixMax?: number | null;
}

/**
 * Payload d'édition d'une intervention (admin/manager).
 * Un champ absent/undefined est ignoré ; `clearXxx` pour effacer explicitement.
 */
export interface UpdateInterventionPayload {
  status?: InterventionStatus;
  priority?: InterventionPriority;
  scheduledAt?: string | null;
  clearSchedule?: boolean;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  clientPhone?: string;
  clientEmail?: string;
  clientFirstName?: string;
  clientLastName?: string;
  technicianId?: string | null;
  clearTechnician?: boolean;
  prixMin?: number | null;
  prixMax?: number | null;
  questionnaireAnswers?: string[] | null;
  expectedUpdatedAt?: string;
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
  scheduled_assigned: 'Planifiée (assignée)',
  assigned: 'Assigné',
  on_route: 'En route',
  arrived: 'Arrivé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  complete_climbed: 'Transférée (interne)',
  complete_climbed_external: 'Transférée (externe)',
  cancelled_escalation_declined: 'Annulée (remplacement refusé)',
};

/**
 * Entrée d'historique de changement de statut d'une intervention
 * (table intervention_history_status).
 */
export interface InterventionStatusHistoryEntry {
  id: string;
  interventionId: string;
  status: string;
  changedAt: string;
}

export const PRIORITY_LABELS: Record<InterventionPriority, string> = {
  urgent: 'Urgent',
  high: 'Haute',
  normal: 'Normale',
  low: 'Basse',
};

// ============================================================
// ✅ OPTIMIZED VIEW MODELS - Pour les helpers
// ============================================================

/**
 * Réponse optimisée pour le geo-filtering PUR (calculs de distance uniquement)
 * Contient SEULEMENT les champs pour haversine + map
 * 📉 Réduction: -95% (0,05 Mo vs 1,02 Mo)
 */
export interface InterventionGeoView {
  id: string;
  status: InterventionStatus;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Réponse pour le dashboard technician (LeftSectionTech)
 * Combine geo-filtering + affichage UI complet
 * Contient champs pour: affichage liste + calculs de distance + actions
 * 📉 Réduction: -80% (0,2 Mo vs 1,02 Mo)
 */
export interface InterventionTechDashboardView {
  id: string;
  status: InterventionStatus;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  title: string;
  category: InterventionCategory;
  city: string;
  postalCode: string;
  estimatedPrice: number | null;
  address: string;
  clientPhone: string;
  trackingCode: string;
  description: string;
}

/**
 * Réponse optimisée pour le dashboard technician (InterventionTech)
 * Utilisé par HeaderTechnician et InterventionTable
 * Combine tous les champs nécessaires pour recherche + tableau + filtrage
 * 📉 Réduction: -80% (0,2 Mo vs 1,02 Mo)
 */
export interface InterventionTechnicianView {
  id: string;
  title: string;
  category: InterventionCategory;
  status: InterventionStatus;
  city: string | null;
  createdAt: string;
  finalPrice: number | null;
  estimatedPrice: number | null;
  trackingCode: string | null;
  technicianId: string | null;
}

/**
 * Réponse optimisée pour la liste admin (AdminInterventionsPage)
 * Contient SEULEMENT les champs affichés dans le tableau
 * 📉 Réduction: -80% (0,2 Mo vs 1,02 Mo)
 */
export interface InterventionAdminView {
  id: string;
  title: string;
  category: InterventionCategory;
  address: string;
  city: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  clientId: string;
  trackingCode: string;
  technicianId: string | null;
  status: InterventionStatus;
  /** Suspension booléenne (V43) — le statut métier reste inchangé. */
  suspended?: boolean;
  priority?: InterventionPriority;
  scheduledAt?: string | null;
  description?: string | null;
  createdAt: string;
  finalPrice: number | null;
  estimatedPrice: number | null;
  prixMin: number | null;
  prixMax: number | null;
  questionnaireAnswers: string | string[] | null;
  photos: string[] | null;
  /** Nombre de photos client (la liste admin ne transporte plus `photos`). */
  clientPhotosCount?: number;
  b2bPartnerId?: string | null;
  b2bCompanyName?: string | null;
  b2bContactFirstName?: string | null;
  b2bContactLastName?: string | null;
  b2bContactPhone?: string | null;
  clientFirstName?: string | null;
  clientLastName?: string | null;
  clientPhone?: string | null;
}

/**
 * Réponse optimisée pour l'historique client (ClientInterventionsPage)
 * Contient SEULEMENT les champs affichés
 * 📉 Réduction: -92% (0,08 Mo vs 1,02 Mo)
 */
export interface InterventionClientView {
  id: string;
  title: string;
  category: InterventionCategory;
  status: InterventionStatus;
  priority: InterventionPriority;
  city: string;
  createdAt: string;
}

/**
 * Réponse optimisée pour les statistiques (AdminDashboard)
 * Contient SEULEMENT les champs nécessaires pour grouper/compter
 * 📉 Réduction: -97% (0,03 Mo vs 1,02 Mo)
 */
export interface InterventionStatsView {
  id: string;
  status: InterventionStatus;
  createdAt: string;
  category: InterventionCategory;
}

/**
 * Signature du devis pour une intervention
 */
export interface InterventionQuoteSignature {
  id: string;
  quoteSignatureData: string;
  quoteSignedAt: string;
}

/**
 * Signature de la facture pour une intervention
 */
export interface InterventionInvoiceSignature {
  id: string;
  invoiceSignatureData: string;
  invoiceSignedAt: string;
}
