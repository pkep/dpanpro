import { useAuth } from '@/hooks/useAuth';
import { PendingActionsModal } from './PendingActionsModal';

/**
 * Renders the PendingActionsModal globally for authenticated client users,
 * regardless of which page they are on.
 */
export function GlobalPendingActions() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user || user.role !== 'client') {
    return null;
  }

  return <PendingActionsModal />;
}
