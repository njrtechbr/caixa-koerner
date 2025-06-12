"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AbrirCaixaDialog from "./components/abrir-caixa-dialog";
import FecharCaixaDialog from "./components/fechar-caixa-dialog";
import DetalhesCaixaAberto from "./components/detalhes-caixa-aberto";

// Interface para o usuário simplificada, conforme retornado pela API
interface UsuarioSimples {
  id: string;
  nome: string;
  email: string;
}

// Interface para TransacaoFechamento, conforme retornado pela API
interface TransacaoFechamentoDetalhada {
  id: string;
  caixa_diario_id: string;
  tipo_pagamento: string;
  valor: string | null; // Convertido para string
}

// Interface para MovimentacaoCaixa, conforme retornado pela API
interface MovimentacaoCaixaDetalhada {
  id: string;
  caixa_diario_id: string | null;
  tipo: string;
  valor: string | null; // Convertido para string
  descricao: string | null;
  status: string;
  solicitante_id: string | null;
  data_solicitacao: string | null; // Convertido para string (ISO date)
  aprovador_id: string | null;
  data_decisao: string | null; // Convertido para string (ISO date)
}

// Interface para CaixaDiarioDetalhado, alinhada com a resposta da API formatada
interface CaixaDiarioDetalhado {
  id: string;
  data_movimento: string | null; // Convertido para string (ISO date)
  valor_inicial: string | null;  // Convertido para string
  status: string;
  aberto_por_usuario_id: string | null;
  data_abertura: string | null; // Convertido para string (ISO date)
  fechado_por_usuario_id: string | null;
  data_fechamento: string | null; // Convertido para string (ISO date)
  revisado_por_usuario_id: string | null;
  data_revisao: string | null;    // Convertido para string (ISO date)
  motivo_rejeicao: string | null;
  valor_sistema_w6?: string | null; // Exemplo, adicione outros campos W se necessário

  aberto_por: UsuarioSimples | null;
  fechado_por?: UsuarioSimples | null;
  revisado_por?: UsuarioSimples | null;
  
  transacoes: TransacaoFechamentoDetalhada[];
  movimentacoes: MovimentacaoCaixaDetalhada[];
  
  valor_total_fechamento?: string; // Convertido para string
  [key: string]: any; // Permite outros campos que possam ter sido adicionados
}

export default function OperadorCaixaPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [caixaAtual, setCaixaAtual] = useState<CaixaDiarioDetalhado | null>(null);
  const [temCaixaAberto, setTemCaixaAberto] = useState(false);
  const [isAbrirCaixaDialogOpen, setIsAbrirCaixaDialogOpen] = useState(false);
  const [isFecharCaixaDialogOpen, setIsFecharCaixaDialogOpen] = useState(false);
  const [movimentacoesPendentes, setMovimentacoesPendentes] = useState<MovimentacaoCaixaDetalhada[]>([]);
  const router = useRouter();
  
  const fetchCaixaAberto = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/caixa/listar?status=aberto');
      const data = await response.json();
      
      if (data.sucesso && data.caixas && data.caixas.length > 0) {
        const caixaData = data.caixas[0];
        
        // Ensure the caixa data has the expected structure with both legacy and new field names
        const formattedCaixa = {
          ...caixaData,
          // Add fields with both naming conventions to ensure component compatibility
          data_movimento: caixaData.data_movimento,
          dataMovimento: caixaData.data_movimento,
          
          valor_inicial: caixaData.valor_inicial,
          valorInicial: caixaData.valor_inicial,
          
          data_abertura: caixaData.data_abertura,
          dataAbertura: caixaData.data_abertura,
          
          aberto_por_usuario_id: caixaData.aberto_por_usuario_id,
          abertoPorUsuarioId: caixaData.aberto_por_usuario_id,
          
          // Make sure aberto_por is available for component consumption
          aberto_por: caixaData.aberto_por || null,
          abertoPorUsuario: caixaData.aberto_por,
          
          // Make sure transacoes is available and is an array
          transacoes: caixaData.transacoes || [],
          transacoesFechamento: caixaData.transacoes,
          
          // Make sure movimentacoes is available and is an array  
          movimentacoes: caixaData.movimentacoes || [],
          movimentacoesCaixa: caixaData.movimentacoes
        };
        
        setCaixaAtual(formattedCaixa);
        setTemCaixaAberto(true);
        
        // Extract movimentações pendentes
        const pendentes = formattedCaixa.movimentacoes?.filter(
          (m: MovimentacaoCaixaDetalhada) => m.status === 'pendente'
        ) || [];
        setMovimentacoesPendentes(pendentes);
      } else {
        setCaixaAtual(null);
        setTemCaixaAberto(false);
        setMovimentacoesPendentes([]);
      }
    } catch (error) {
      console.error('Erro ao buscar caixa:', error);
      toast({
        title: "Erro de Rede",
        description: "Não foi possível conectar ao servidor para verificar o caixa.",
        variant: "destructive",
      });
      setCaixaAtual(null);
      setTemCaixaAberto(false);
      setMovimentacoesPendentes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaixaAberto();
  }, []);

  const handleCaixaAberto = (novoCaixa: CaixaDiarioDetalhado) => {
    setCaixaAtual(novoCaixa);
    setTemCaixaAberto(true);
    setIsAbrirCaixaDialogOpen(false);
    toast({
      title: "Sucesso!",
      description: "Caixa aberto com sucesso.",
    });
    fetchCaixaAberto(); // Recarregar dados atualizados
  };

  const handleCaixaFechado = () => {
    setCaixaAtual(null);
    setTemCaixaAberto(false);
    setIsFecharCaixaDialogOpen(false);
    fetchCaixaAberto(); 
    toast({
      title: "Sucesso!",
      description: "Caixa fechado e enviado para conferência.",
    });
  };

  const formatarValor = (valor: string | null | undefined) => {
    if (!valor) return 'R$ 0,00';
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(parseFloat(valor));
    } catch (error) {
      console.error('Error formatting value:', valor, error);
      return 'R$ 0,00';
    }
  };
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Painel do Operador de Caixa"
        description="Gerencie seus caixas diários e solicitações de movimentação"
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Carregando informações do caixa...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Se não tem caixa aberto, mostrar botões de navegação */}
          {!temCaixaAberto && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Abrir Novo Caixa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Inicie um novo caixa para o dia atual.
                  </p>
                  <Button 
                    onClick={() => setIsAbrirCaixaDialogOpen(true)}
                    className="w-full"
                  >
                    Abrir Novo Caixa
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Caixas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visualize o histórico de seus caixas anteriores.
                  </p>
                  <Button 
                    onClick={() => router.push('/operador-caixa/historico')}
                    className="w-full"
                    variant="outline"
                  >
                    Ver Histórico
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Se tem caixa aberto, mostrar as informações do caixa */}
          {temCaixaAberto && caixaAtual && (
            <DetalhesCaixaAberto 
              caixa={caixaAtual}
              onFecharCaixa={() => setIsFecharCaixaDialogOpen(true)} 
            />
          )}

          {/* Movimentações Pendentes - sempre exibe esta seção */}
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : movimentacoesPendentes.length > 0 ? (
                <div className="space-y-4">
                  {movimentacoesPendentes.map((movimentacao, index) => (
                    <div key={movimentacao.id || index} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">{movimentacao.tipo}</p>
                        {movimentacao.descricao && (
                          <p className="text-sm text-muted-foreground">{movimentacao.descricao}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatarValor(movimentacao.valor)}</p>
                        <Badge variant="secondary">Pendente</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">
                  Você não possui movimentações pendentes no momento.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Diálogos para abrir e fechar caixa */}
          <AbrirCaixaDialog
            isOpen={isAbrirCaixaDialogOpen}
            onClose={() => setIsAbrirCaixaDialogOpen(false)}
            onCaixaAberto={handleCaixaAberto}
          />          {caixaAtual && (
            <FecharCaixaDialog
              isOpen={isFecharCaixaDialogOpen}
              onClose={() => setIsFecharCaixaDialogOpen(false)}
              caixaDetalhado={caixaAtual}
              onCaixaFechado={handleCaixaFechado}
            />
          )}
        </>
      )}
    </div>
  );
}