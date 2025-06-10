"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Do nothing while loading
    if (session) {
      // User is authenticated
      const user = session.user as any; // Cast to access custom properties
      if (user.mfaEnabled === false && user.role === 'admin') { // Example: admin needs to set up MFA
        router.replace("/mfa-setup");
      } else if (user.mfaEnabled === true && !user.mfaVerifiedThisSession) { // Needs MFA verification
         // This mfaVerifiedThisSession logic would be more complex, potentially managed via JWT or session state
         // For now, if MFA is enabled, we assume they need to verify if not directly from login.
         // A better flow is: login -> mfa-verify (if enabled) -> dashboard
         // So, if they land here and MFA is enabled but not verified, redirect.
         // This scenario is less likely if middleware handles /mfa-verify redirection properly after login.
         // Typically, /dashboard would be protected and force /mfa-verify if needed.
        router.replace("/dashboard"); // Or mfa-verify if not already handled
      }
      else {
        router.replace("/dashboard");
      }
    } else {
      // User is not authenticated
      router.replace("/login");
    }
  }, [session, status, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </main>
  );
}
