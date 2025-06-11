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
      // User is authenticated - MFA disabled for testing
      router.replace("/dashboard");
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
