// Must match DB check constraint: intervention_history_action_check
export type HistoryAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'updated'
  | 'comment';

export interface InterventionHistory {
  id: string;
  interventionId: string;
  userId: string;
  action: HistoryAction;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  createdAt: string;
}

export interface DbInterventionHistory {
  id: string;
  intervention_id: string;
  user_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  created_at: string;
}

export const ACTION_LABELS: Record<HistoryAction, string> = {
  created: 'Création',
  status_changed: 'Changement de statut',
  assigned: 'Assignation',
  updated: 'Mise à jour',
  comment: 'Commentaire',
};
