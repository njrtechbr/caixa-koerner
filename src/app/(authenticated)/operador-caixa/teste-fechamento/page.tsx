"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from '@/hooks/use-toast';
import FecharCaixaDialog from "../components/fechar-caixa-dialog";

interface CaixaAberto {
  id: string;
  data_movimento: string;
  valor_inicial: string;
  status: string;
  data_abertura: string;
  aberto_por: {
    nome: string;
    email: string;
  };
}

export default function TesteFecharCaixaPage() {
  const [caixaAberto, setCaixaAberto] = useState<CaixaAberto | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    buscarCaixaAberto();
  }, []);

  const buscarCaixaAberto = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/caixa/listar?status=aberto');
      const data = await response.json();
      
      if (data.sucesso && data.caixas && data.caixas.length > 0) {
        setCaixaAberto(data.caixas[0]);
      } else {
        setCaixaAberto(null);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao buscar caixa aberto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaixaFechado = () => {
    setCaixaAberto(null);
    setIsDialogOpen(false);
    buscarCaixaAberto();
  };

  const formatarValor = (valor: string | number) => {
    const numero = typeof valor === 'number' ? valor : parseFloat(valor);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numero);
  };

  const formatarDataHora = (dataString: string) => {
    return new Date(dataString).toLocaleString('pt-BR');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Teste - Sistema de Fechamento Aprimorado"
        description="Demonstração do novo sistema de fechamento de caixa com formas de pagamento customizáveis"
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : caixaAberto ? (
        <Card>
          <CardHeader>
            <CardTitle>Caixa Aberto Encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">ID do Caixa</p>
                <p className="text-sm text-muted-foreground">{caixaAberto.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant="default">{caixaAberto.status}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Valor Inicial</p>
                <p className="text-sm text-muted-foreground">{formatarValor(caixaAberto.valor_inicial)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Aberto em</p>
                <p className="text-sm text-muted-foreground">{formatarDataHora(caixaAberto.data_abertura)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium">Aberto por</p>
                <p className="text-sm text-muted-foreground">{caixaAberto.aberto_por.nome}</p>
              </div>
            </div>
            
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="w-full mt-4"
            >
              Testar Fechamento Aprimorado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum Caixa Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Não há caixas abertos no momento. Abra um novo caixa para testar o sistema de fechamento.
            </p>
            <Button onClick={buscarCaixaAberto} variant="outline">
              Atualizar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de fechamento aprimorado */}
      {caixaAberto && (
        <FecharCaixaDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          caixaParaFechar={caixaAberto}
          onCaixaFechado={handleCaixaFechado}
        />
      )}
    </div>
  );
}
