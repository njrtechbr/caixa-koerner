import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, CheckSquare, Users } from "lucide-react";
import Link from "next/link";

// Mock data for demonstration
const pendingCashiers = [
  { id: "c1", operator: "João Silva", closeTime: "17:05", status: "Fechado - Aguardando Conferência" },
  { id: "c2", operator: "Maria Oliveira", closeTime: "17:15", status: "Fechado - Aguardando Conferência" },
];

const pendingRequests = [
  { id: "r1", operator: "Ana Costa", type: "Sangria", amount: "R$ 200,00", time: "14:30" },
  { id: "r2", operator: "Pedro Lima", type: "Correção", field: "Dinheiro", time: "10:15" },
];

export default function SupervisorCaixaPage() {
  return (
    <div>
      <PageHeader
        title="Painel do Supervisor de Caixa"
        description="Monitore caixas e aprove solicitações."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Caixas para Conferência</CardTitle>
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <CardDescription>
              {pendingCashiers.length > 0 
                ? `${pendingCashiers.length} caixa(s) aguardando sua conferência.` 
                : "Nenhum caixa pendente de conferência."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingCashiers.length > 0 ? (
              <ul className="space-y-3">
                {pendingCashiers.map(cashier => (
                  <li key={cashier.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div>
                      <p className="font-medium">{cashier.operator}</p>
                      <p className="text-xs text-muted-foreground">Fechado às {cashier.closeTime}</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/supervisor-caixa/conferencia/${cashier.id}`}>Conferir</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Todos os caixas conferidos!</p>
            )}
             <Button asChild className="w-full mt-4" variant="outline">
              <Link href="/supervisor-caixa/conferencia">Ver Todos Pendentes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center justify-between">
              <CardTitle>Solicitações Pendentes</CardTitle>
              <CheckSquare className="h-6 w-6 text-primary" />
            </div>
            <CardDescription>
              {pendingRequests.length > 0 
                ? `${pendingRequests.length} solicitação(ões) aguardando sua aprovação.`
                : "Nenhuma solicitação pendente."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length > 0 ? (
              <ul className="space-y-3">
                {pendingRequests.map(request => (
                  <li key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div>
                      <p className="font-medium">{request.operator} - {request.type} {request.type === "Sangria" ? `(${request.amount})` : ""}</p>
                      <p className="text-xs text-muted-foreground">Solicitado às {request.time}</p>
                    </div>
                     <Button asChild size="sm" variant="secondary">
                      <Link href={`/supervisor-caixa/aprovacoes/${request.id}`}>Analisar</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação para aprovar.</p>
            )}
            <Button asChild className="w-full mt-4" variant="outline">
              <Link href="/supervisor-caixa/aprovacoes">Ver Todas Solicitações</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
