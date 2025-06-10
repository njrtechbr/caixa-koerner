"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = (session.user as any).role;
      // Redirect to role-specific page or handle MFA if not fully set up
      if ((session.user as any).mfaEnabled === false && userRole === 'admin') { // Example condition for admin needing MFA setup
         router.replace("/mfa-setup"); // Redirect to MFA setup if not enabled for this role
         return;
      }

      switch (userRole) {
        case "operador_caixa":
          // router.replace("/operador-caixa"); // Or stay on dashboard with specific widgets
          break;
        case "supervisor_caixa":
          // router.replace("/supervisor-caixa");
          break;
        case "supervisor_conferencia":
          // router.replace("/supervisor-conferencia");
          break;
        case "admin":
          // router.replace("/admin");
          break;
        default:
          // Stay on generic dashboard
          break;
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const userName = session?.user?.name || "Usuário";

  return (
    <div>
      <PageHeader
        title={`Bem-vindo, ${userName}!`}
        description="Este é o seu painel principal do CartórioCashFlow."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Informações resumidas e atalhos rápidos para suas tarefas.</p>
            {/* Add role-specific widgets or summaries here */}
          </CardContent>
        </Card>
        {/* Add more generic or role-specific cards */}
      </div>
    </div>
  );
}
