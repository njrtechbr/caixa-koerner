import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, KeyRound, Settings } from "lucide-react";
import Link from "next/link";

// Mock data
const dailySummary = {
  date: new Date().toLocaleDateString('pt-BR'),
  totalDeclared: 15250.75,
  totalConfirmed: 15245.50,
  difference: -5.25,
  status: "Aguardando Validação Final"
};

export default function SupervisorConferenciaPage() {
  return (
    <div>
      <PageHeader
        title="Painel do Supervisor de Conferência"
        description="Valide o movimento financeiro diário e acesse configurações."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Painel Consolidado do Dia</CardTitle>
            <BarChart3 className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-1">Data: {dailySummary.date}</p>
            <div className="text-2xl font-bold">Status: <span className={dailySummary.difference !==0 ? 'text-destructive' : 'text-accent'}>{dailySummary.status}</span></div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between"><span>Total Declarado:</span> <span className="font-semibold">R$ {dailySummary.totalDeclared.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total Conferido:</span> <span className="font-semibold">R$ {dailySummary.totalConfirmed.toFixed(2)}</span></div>
              <div className={`flex justify-between font-bold ${dailySummary.difference < 0 ? 'text-destructive' : dailySummary.difference > 0 ? 'text-yellow-500' : 'text-accent'}`}>
                <span>Diferença:</span> <span>R$ {dailySummary.difference.toFixed(2)}</span>
              </div>
            </div>
            <Button asChild className="w-full mt-6">
              <Link href="/supervisor-conferencia/painel-consolidado">Ver Detalhes do Dia</Link>
            </Button>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validação Final</CardTitle>
              <KeyRound className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Realize a validação final do movimento financeiro do dia.</p>
              <Button asChild className="w-full" variant="secondary">
                <Link href="/supervisor-conferencia/validacao-final">Validar Movimento</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Configurações</CardTitle>
              <Settings className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Acesse as configurações gerais do sistema.</p>
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/configuracoes">Acessar Configurações</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
