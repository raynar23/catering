import { describe, it, expect } from 'vitest';
import { decideRoute } from './route-guard';

describe('decideRoute', () => {
  it('redirects unauthenticated users to /login on protected routes', () => {
    expect(decideRoute({ pathname: '/admin/dashboard', isAuthenticated: false })).toEqual({
      type: 'redirect',
      destination: '/login',
    });
    expect(decideRoute({ pathname: '/vendor/dashboard', isAuthenticated: false })).toEqual({
      type: 'redirect',
      destination: '/login',
    });
    expect(decideRoute({ pathname: '/', isAuthenticated: false })).toEqual({
      type: 'redirect',
      destination: '/login',
    });
  });

  it('allows unauthenticated users to access /login', () => {
    expect(decideRoute({ pathname: '/login', isAuthenticated: false })).toEqual({
      type: 'next',
    });
  });

  it('redirects authenticated admin_ga from /login or / to /admin/dashboard', () => {
    expect(
      decideRoute({ pathname: '/login', isAuthenticated: true, role: 'admin_ga', isActive: true })
    ).toEqual({
      type: 'redirect',
      destination: '/admin/dashboard',
    });
    expect(
      decideRoute({ pathname: '/', isAuthenticated: true, role: 'admin_ga', isActive: true })
    ).toEqual({
      type: 'redirect',
      destination: '/admin/dashboard',
    });
  });

  it('redirects authenticated vendor from /login or / to /vendor/dashboard', () => {
    expect(
      decideRoute({ pathname: '/login', isAuthenticated: true, role: 'vendor', isActive: true })
    ).toEqual({
      type: 'redirect',
      destination: '/vendor/dashboard',
    });
    expect(
      decideRoute({ pathname: '/', isAuthenticated: true, role: 'vendor', isActive: true })
    ).toEqual({
      type: 'redirect',
      destination: '/vendor/dashboard',
    });
  });

  it('prevents cross-role access: admin_ga entering vendor routes', () => {
    expect(
      decideRoute({
        pathname: '/vendor/dashboard',
        isAuthenticated: true,
        role: 'admin_ga',
        isActive: true,
      })
    ).toEqual({
      type: 'redirect',
      destination: '/admin/dashboard',
    });
  });

  it('prevents cross-role access: vendor entering admin routes', () => {
    expect(
      decideRoute({
        pathname: '/admin/dashboard',
        isAuthenticated: true,
        role: 'vendor',
        isActive: true,
      })
    ).toEqual({
      type: 'redirect',
      destination: '/vendor/dashboard',
    });
  });

  it('allows access to valid role paths', () => {
    expect(
      decideRoute({
        pathname: '/admin/input',
        isAuthenticated: true,
        role: 'admin_ga',
        isActive: true,
      })
    ).toEqual({
      type: 'next',
    });

    expect(
      decideRoute({
        pathname: '/vendor/riwayat',
        isAuthenticated: true,
        role: 'vendor',
        isActive: true,
      })
    ).toEqual({
      type: 'next',
    });
  });

  it('redirects inactive users to /login', () => {
    expect(
      decideRoute({
        pathname: '/admin/dashboard',
        isAuthenticated: true,
        role: 'admin_ga',
        isActive: false,
      })
    ).toEqual({
      type: 'redirect',
      destination: '/login',
    });
  });
});
