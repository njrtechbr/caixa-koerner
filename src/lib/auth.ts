import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Extend NextAuth User type to include role and mfaEnabled
interface AppUser extends NextAuthUser {
  id: string;
  role?: string | null;
  mfaEnabled?: boolean | null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "seu@email.com" },
        password: { label: "Senha", type: "password" },
        mfaCode: { label: "Código MFA", type: "text", optional: true }
      },
      async authorize(credentials, req) {
        // This is a mock authorization. Replace with actual database lookup and password verification.
        // Also, handle MFA verification here if mfaCode is provided.
        if (credentials?.email === "operador@example.com" && credentials?.password === "password") {
          return { id: "1", name: "Operador Caixa", email: "operador@example.com", role: "operador_caixa", mfaEnabled: true } as AppUser;
        }
        if (credentials?.email === "supervisor@example.com" && credentials?.password === "password") {
          return { id: "2", name: "Supervisor Caixa", email: "supervisor@example.com", role: "supervisor_caixa", mfaEnabled: true } as AppUser;
        }
        if (credentials?.email === "conferencia@example.com" && credentials?.password === "password") {
          return { id: "3", name: "Supervisor Conf.", email: "conferencia@example.com", role: "supervisor_conferencia", mfaEnabled: true } as AppUser;
        }
        if (credentials?.email === "admin@example.com" && credentials?.password === "password") {
          return { id: "4", name: "Admin", email: "admin@example.com", role: "admin", mfaEnabled: false } as AppUser; // MFA not enabled for demo
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Custom error page
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const appUser = user as AppUser;
        token.id = appUser.id;
        token.role = appUser.role;
        token.mfaEnabled = appUser.mfaEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as AppUser;
        sessionUser.id = token.id as string;
        sessionUser.role = token.role as string;
        sessionUser.mfaEnabled = token.mfaEnabled as boolean;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development_only_32_chars", // Use environment variable in production
};
