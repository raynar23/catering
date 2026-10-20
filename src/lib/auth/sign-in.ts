// Temporary sign-in implementation returning error to preview states, will be replaced with Supabase Auth in Phase 3.

export interface SignInCredentials {
  username: string;
  password: string;
}

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

export async function signIn(credentials: SignInCredentials): Promise<SignInResult> {
  // Simulate network latency for review
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (!credentials.username.trim() || !credentials.password) {
    return { ok: false, message: "Username atau password tidak sesuai." };
  }

  // Temporary stub always returns invalid credentials until Phase 3
  return {
    ok: false,
    message: "Username atau password tidak sesuai.",
  };
}
