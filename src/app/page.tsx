import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/profile';

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.aktif) {
    redirect('/login');
  }
  if (profile.role === 'admin_ga') {
    redirect('/admin/dashboard');
  }
  redirect('/vendor/dashboard');
}
