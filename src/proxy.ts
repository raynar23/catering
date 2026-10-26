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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, aktif')
      .eq('id', user.id)
      .single();

    if (profile) {
      role = profile.role as AppRole;
      isActive = profile.aktif;
    }
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
