import { useOptionalAuth } from '@/hooks/useAuth';
import { PendingActionsModal } from './PendingActionsModal';

/**
 * Renders the PendingActionsModal globally for authenticated client users,
 * regardless of which page they are on.
 */
export function GlobalPendingActions() {
  const auth = useOptionalAuth();

  if (!auth?.isAuthenticated || !auth.user || auth.user.role !== 'client') {
    return null;
  }

  return <PendingActionsModal />;
}
