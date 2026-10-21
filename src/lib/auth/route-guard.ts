import { AppRole } from '@/lib/types';

export interface RouteDecisionInput {
  pathname: string;
  isAuthenticated: boolean;
  role?: AppRole | null;
  isActive?: boolean;
}

export type RouteDecision =
  | { type: 'next' }
  | { type: 'redirect'; destination: string };

export function decideRoute(input: RouteDecisionInput): RouteDecision {
  const { pathname, isAuthenticated, role, isActive } = input;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return { type: 'next' };
  }

  if (!isAuthenticated || !role || isActive === false) {
    if (pathname === '/login') {
      return { type: 'next' };
    }
    return { type: 'redirect', destination: '/login' };
  }

  const roleHome = role === 'admin_ga' ? '/admin/dashboard' : '/vendor/dashboard';

  if (pathname === '/login' || pathname === '/') {
    return { type: 'redirect', destination: roleHome };
  }

  if (role === 'admin_ga') {
    if (pathname.startsWith('/vendor')) {
      return { type: 'redirect', destination: '/admin/dashboard' };
    }
    return { type: 'next' };
  }

  if (role === 'vendor') {
    if (pathname.startsWith('/admin')) {
      return { type: 'redirect', destination: '/vendor/dashboard' };
    }
    return { type: 'next' };
  }

  return { type: 'redirect', destination: '/login' };
}
