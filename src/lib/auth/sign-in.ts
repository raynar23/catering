import { createClient } from '@/lib/supabase/client';
import { AppRole } from '@/lib/types';

export interface SignInCredentials {
  username: string;
  password: string;
}

export type SignInResult =
  | { ok: true; role: AppRole; redirectTo: string }
  | { ok: false; message: string };

export function usernameToEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return `${trimmed}@tps.co.id`;
}

export async function signIn(credentials: SignInCredentials): Promise<SignInResult> {
  const username = credentials.username.trim();
  const password = credentials.password;

  if (!username || !password) {
    return { ok: false, message: 'Username dan kata sandi wajib diisi.' };
  }

  const email = usernameToEmail(username);
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, message: 'Username atau kata sandi tidak sesuai.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, aktif')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { ok: false, message: 'Profil pengguna tidak ditemukan. Silakan hubungi Administrator General Affairs.' };
  }

  if (!profile.aktif) {
    await supabase.auth.signOut();
    return { ok: false, message: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator General Affairs.' };
  }

  const role = profile.role as AppRole;
  const redirectTo = role === 'admin_ga' ? '/admin/dashboard' : '/vendor/dashboard';

  return {
    ok: true,
    role,
    redirectTo,
  };
}
