import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { decideRoute } from '@/lib/auth/route-guard';
import { AppRole } from '@/lib/types';

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  let role: AppRole | null = null;
  let isActive = false;

  if (user) {
    const cachedRole = request.cookies.get('tps_user_role')?.value;
    if (cachedRole && cachedRole.startsWith(`${user.id}:`)) {
      const parts = cachedRole.split(':');
      role = parts[1] as AppRole;
      isActive = parts[2] === '1';
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, aktif')
        .eq('id', user.id)
        .single();

      if (profile) {
        role = profile.role as AppRole;
        isActive = profile.aktif;
        response.cookies.set('tps_user_role', `${user.id}:${role}:${isActive ? '1' : '0'}`, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 3600 * 8,
        });
      }
    }
  } else if (request.cookies.has('tps_user_role')) {
    response.cookies.delete('tps_user_role');
  }

  const decision = decideRoute({
    pathname,
    isAuthenticated: Boolean(user),
    role,
    isActive,
  });

  if (decision.type === 'redirect') {
    const url = request.nextUrl.clone();
    url.pathname = decision.destination;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
