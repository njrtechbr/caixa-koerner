import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Archive, Upload, FileText } from "lucide-react";
import Link from "next/link";

export default function OperadorCaixaPage() {
  return (
    <div>
      <PageHeader
        title="Painel do Operador de Caixa"
        description="Gerencie suas atividades diárias de caixa."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abrir Caixa</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Inicie um novo dia de trabalho.</p>
            <Button asChild className="w-full">
              <Link href="/operador-caixa/abrir-caixa">Abrir Novo Caixa</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fechar Caixa</CardTitle>
            <Archive className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Finalize e declare os valores do caixa atual.</p>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/operador-caixa/fechar-caixa">Fechar Caixa Atual</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações</CardTitle>
            <Upload className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Peça sangrias, entradas ou correções.</p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/operador-caixa/solicitacoes">Fazer Solicitação</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Caixas</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Visualize o histórico dos seus caixas.</p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/operador-caixa/meus-caixas">Ver Histórico</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Status do Caixa Atual</CardTitle>
            <CardDescription>Informações sobre o seu caixa aberto.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for current cash status */}
            <p className="text-muted-foreground">Nenhum caixa aberto no momento.</p>
            {/* Or display details: Data Abertura, Saldo Inicial, etc. */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
