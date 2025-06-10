"use client";

import type { ReactNode } from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

interface SessionProviderWrapperProps {
  children: ReactNode;
}

export function SessionProviderWrapper({ children }: SessionProviderWrapperProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
