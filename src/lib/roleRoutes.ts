import type { User, UserRole } from '@/types/auth.types';

/**
 * Single source of truth: home route for each role.
 * Roles with no dedicated area (guest, payment, unknown) go to the public home
 * to avoid the /dashboard <-> /auth redirect loop.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  manager: '/manager',
  technician: '/technician',
  client: '/dashboard',
  guest: '/',
  payment: '/',
  b2b: '/b2b',
};

export function roleHome(role: UserRole | string | null | undefined): string {
  return (role && (ROLE_HOME as Record<string, string>)[role]) || '/';
}

/**
 * Role-prefixed areas (mirrors ProtectedRoute requiredRole in App.tsx).
 * Used to validate a ?redirect= target before sending a freshly logged-in user there.
 */
const AREA_ROLES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/manager', roles: ['manager', 'admin'] },
  { prefix: '/technician', roles: ['technician', 'admin'] },
  { prefix: '/dashboard', roles: ['client', 'admin'] },
  { prefix: '/intervention/', roles: ['client', 'admin'] },
  { prefix: '/b2b', roles: ['b2b'] },
];

export function isPathAllowedForRole(path: string, role: UserRole | string | null | undefined): boolean {
  const area = AREA_ROLES.find(a => path === a.prefix || path.startsWith(a.prefix + '/') || (a.prefix.endsWith('/') && path.startsWith(a.prefix)));
  if (!area) return true; // public / shared path
  return !!role && area.roles.includes(role as UserRole);
}

/** Path to the intervention detail page appropriate for the user's role. */
export function interventionPathFor(role: UserRole | string | null | undefined, interventionId: string): string {
  switch (role) {
    case 'technician':
      return `/technician/intervention/${interventionId}`;
    case 'admin':
      return '/admin/interventions'; // admin list page has no deep-link route yet
    case 'manager':
      return '/manager';
    case 'b2b':
      return '/b2b/interventions';
    default:
      return `/intervention/${interventionId}`;
  }
}

/** Convenience: dashboard link + label for the current user, or null if none. */
export function dashboardLinkFor(user: User | null | undefined): { to: string; label: string } | null {
  if (!user) return null;
  switch (user.role) {
    case 'admin': return { to: '/admin', label: 'Espace administration' };
    case 'manager': return { to: '/manager', label: 'Espace manager' };
    case 'technician': return { to: '/technician', label: 'Espace technicien' };
    case 'client': return { to: '/dashboard', label: 'Mon tableau de bord' };
    case 'b2b': return { to: '/b2b', label: 'Espace partenaire' };
    default: return null;
  }
}
