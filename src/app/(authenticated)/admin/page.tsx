import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Painel Administrativo"
        description="Gerencie usuários, configurações e monitoramento do sistema."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerenciar Usuários</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Adicione, edite ou remova usuários e suas funções.</p>
            <Button asChild className="w-full">
              <Link href="/admin/gerenciar-usuarios">Acessar Usuários</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configurações do Sistema</CardTitle>
            <Settings className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Ajuste as configurações globais da aplicação.</p>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/admin/configuracoes">Ajustar Configurações</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs de Auditoria</CardTitle>
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Visualize a trilha de auditoria de ações críticas.</p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/admin/auditoria">Ver Logs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* Additional admin sections can be added here, e.g., system health, reports */}
    </div>
  );
}
