"use client";

// AI-NOTE: Componente React para a página do Operador de Caixa.
// Este componente gerencia a visualização e interação com caixas diários,
// incluindo abertura, fechamento e listagem de movimentações pendentes.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header"; // AI-NOTE: Componente reutilizável para cabeçalhos de página.
import { toast } from "@/hooks/use-toast"; // AI-NOTE: Hook para exibir notificações (toasts).
import AbrirCaixaDialog from "./components/abrir-caixa-dialog"; // AI-NOTE: Dialog para abrir um novo caixa.
import FecharCaixaDialog from "./components/fechar-caixa-dialog"; // AI-NOTE: Dialog para fechar um caixa existente.
import DetalhesCaixaAberto from "./components/detalhes-caixa-aberto"; // AI-NOTE: Componente para exibir detalhes de um caixa aberto.

// AI-NOTE: Interface para dados simplificados do usuário, conforme retornado pela API.
// Define a estrutura esperada para informações básicas do usuário.
interface UsuarioSimples {
  id: string;
  nome: string;
  email: string;
}

// AI-NOTE: Interface para TransacaoFechamentoDetalhada, conforme retornado pela API.
// Representa uma transação individual registrada durante o fechamento do caixa.
interface TransacaoFechamentoDetalhada {
  id: string;
  caixa_diario_id: string; // ID do caixa diário ao qual esta transação pertence.
  tipo_pagamento: string;  // Forma de pagamento (ex: Dinheiro, Cartão de Crédito).
  valor: string | null;    // Valor da transação, formatado como string. Pode ser nulo.
}

// AI-NOTE: Interface para MovimentacaoCaixaDetalhada, conforme retornado pela API.
// Descreve uma movimentação de caixa (entrada ou saída), como sangrias ou suprimentos.
interface MovimentacaoCaixaDetalhada {
  id: string;
  caixa_diario_id: string | null; // ID do caixa diário associado, se houver.
  tipo: string;                   // Tipo de movimentação (ex: SANGRIA, SUPRIMENTO).
  valor: string | null;           // Valor da movimentação, formatado como string.
  descricao: string | null;       // Descrição opcional da movimentação.
  status: string;                 // Status da movimentação (ex: pendente, aprovado, rejeitado).
  solicitante_id: string | null;  // ID do usuário que solicitou a movimentação.
  data_solicitacao: string | null; // Data da solicitação (ISO date string).
  aprovador_id: string | null;    // ID do usuário que aprovou/rejeitou a movimentação.
  data_decisao: string | null;    // Data da decisão (ISO date string).
}

// AI-NOTE: Interface para CaixaDiarioDetalhado, alinhada com a resposta da API formatada.
// Agrega todas as informações de um caixa diário, incluindo transações e movimentações.
interface CaixaDiarioDetalhado {
  id: string;
  data_movimento: string | null;    // Data de referência do movimento do caixa (ISO date string).
  valor_inicial: string | null;     // Valor de abertura do caixa, formatado como string.
  status: string;                   // Status atual do caixa (ex: aberto, fechado, conferido).
  aberto_por_usuario_id: string | null; // ID do usuário que abriu o caixa.
  data_abertura: string | null;     // Data de abertura do caixa (ISO date string).
  fechado_por_usuario_id: string | null; // ID do usuário que fechou o caixa.
  data_fechamento: string | null;   // Data de fechamento do caixa (ISO date string).
  revisado_por_usuario_id: string | null; // ID do usuário que revisou o caixa.
  data_revisao: string | null;      // Data da revisão do caixa (ISO date string).
  motivo_rejeicao: string | null;   // Motivo da rejeição, se aplicável.
  valor_sistema_w6?: string | null; // Exemplo de campo legado, pode haver outros. AI-NOTE: Campo para integração com sistema W6.

  aberto_por: UsuarioSimples | null;      // Objeto com dados do usuário que abriu o caixa.
  fechado_por?: UsuarioSimples | null;     // Objeto com dados do usuário que fechou o caixa.
  revisado_por?: UsuarioSimples | null;    // Objeto com dados do usuário que revisou o caixa.
  
  transacoes: TransacaoFechamentoDetalhada[]; // Lista de transações de fechamento.
  movimentacoes: MovimentacaoCaixaDetalhada[];  // Lista de movimentações do caixa.
  
  valor_total_fechamento?: string; // Valor total apurado no fechamento, formatado como string.
  [key: string]: any;             // Permite campos adicionais para flexibilidade. AI-NOTE: Permite extensibilidade da interface.
}

// AI-NOTE: Componente principal da página do Operador de Caixa.
// Gerencia o estado do caixa (aberto/fechado), exibe informações relevantes e permite ações como abrir/fechar caixa.
export default function OperadorCaixaPage() {
  // AI-NOTE: Estado para controlar o carregamento de dados da página.
  const [isLoading, setIsLoading] = useState(true);
  // AI-NOTE: Estado para armazenar os dados do caixa atual que está aberto. Null se nenhum caixa estiver aberto.
  const [caixaAtual, setCaixaAtual] = useState<CaixaDiarioDetalhado | null>(null);
  // AI-NOTE: Estado booleano que indica se existe um caixa aberto para o operador.
  const [temCaixaAberto, setTemCaixaAberto] = useState(false);
  // AI-NOTE: Estado para controlar a visibilidade do diálogo de abrir caixa.
  const [isAbrirCaixaDialogOpen, setIsAbrirCaixaDialogOpen] = useState(false);
  // AI-NOTE: Estado para controlar a visibilidade do diálogo de fechar caixa.
  const [isFecharCaixaDialogOpen, setIsFecharCaixaDialogOpen] = useState(false);
  // AI-NOTE: Estado para armazenar a lista de movimentações de caixa com status 'pendente'.
  const [movimentacoesPendentes, setMovimentacoesPendentes] = useState<MovimentacaoCaixaDetalhada[]>([]);

  // AI-NOTE: Hook do Next.js para manipulação de rotas de navegação.
  const router = useRouter();
  
  // AI-NOTE: Função assíncrona para buscar o caixa atualmente aberto para o operador.
  // Atualiza os estados 'caixaAtual', 'temCaixaAberto' e 'movimentacoesPendentes'.
  const fetchCaixaAberto = async () => {
    setIsLoading(true); // Inicia o indicador de carregamento.
    try {
      // AI-NOTE: Chamada à API para listar caixas com status 'aberto'.
      const response = await fetch('/api/caixa/listar?status=aberto');
      const data = await response.json(); // Converte a resposta para JSON.
      
      if (data.sucesso && data.caixas && data.caixas.length > 0) {
        // Se a chamada foi bem-sucedida e retornou caixas, processa o primeiro caixa da lista.
        const caixaData = data.caixas[0];
        
        // AI-NOTE: Formata os dados do caixa para garantir compatibilidade com os componentes.
        // Isso inclui a duplicação de campos com nomes alternativos (camelCase e snake_case)
        // para acomodar diferentes convenções que podem ser usadas nos componentes filhos.
        const formattedCaixa = {
          ...caixaData,
          // Garante que ambos os formatos de nome de campo (data_movimento e dataMovimento) estejam disponíveis.
          data_movimento: caixaData.data_movimento,
          dataMovimento: caixaData.data_movimento,
          
          valor_inicial: caixaData.valor_inicial,
          valorInicial: caixaData.valor_inicial,
          
          data_abertura: caixaData.data_abertura,
          dataAbertura: caixaData.data_abertura,
          
          aberto_por_usuario_id: caixaData.aberto_por_usuario_id,
          abertoPorUsuarioId: caixaData.aberto_por_usuario_id,
          
          // Garante que 'aberto_por' (e 'abertoPorUsuario') esteja disponível e seja nulo se não existir.
          aberto_por: caixaData.aberto_por || null,
          abertoPorUsuario: caixaData.aberto_por, // Assume-se que 'aberto_por' é o primário.
          
          // Garante que 'transacoes' (e 'transacoesFechamento') seja um array, mesmo que vazio.
          transacoes: caixaData.transacoes || [],
          transacoesFechamento: caixaData.transacoes, // Assume-se que 'transacoes' é o primário.
          
          // Garante que 'movimentacoes' (e 'movimentacoesCaixa') seja um array, mesmo que vazio.
          movimentacoes: caixaData.movimentacoes || [],
          movimentacoesCaixa: caixaData.movimentacoes // Assume-se que 'movimentacoes' é o primário.
        };
        
        setCaixaAtual(formattedCaixa); // Define o caixa atual com os dados formatados.
        setTemCaixaAberto(true);       // Indica que um caixa está aberto.
        
        // AI-NOTE: Filtra as movimentações para obter apenas aquelas com status 'pendente'.
        const pendentes = formattedCaixa.movimentacoes?.filter(
          (m: MovimentacaoCaixaDetalhada) => m.status === 'pendente'
        ) || []; // Garante que 'pendentes' seja um array, mesmo que 'movimentacoes' seja nulo/undefined.
        setMovimentacoesPendentes(pendentes); // Define o estado das movimentações pendentes.

      } else {
        // Se não houver caixa aberto ou a chamada falhar, reseta os estados relacionados.
        setCaixaAtual(null);
        setTemCaixaAberto(false);
        setMovimentacoesPendentes([]);
      }
    } catch (error) {
      // Em caso de erro na chamada (ex: rede), exibe um toast de erro e reseta os estados.
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
      setIsLoading(false); // Finaliza o indicador de carregamento.
    }
  };

  // AI-NOTE: Hook useEffect que chama 'fetchCaixaAberto' uma vez quando o componente é montado.
  // O array de dependências vazio [] garante que o efeito rode apenas na montagem e desmontagem.
  useEffect(() => {
    fetchCaixaAberto();
  }, []);

  // AI-NOTE: Callback executado quando um novo caixa é aberto com sucesso através do AbrirCaixaDialog.
  // Atualiza o estado do caixa atual, indica que um caixa está aberto e fecha o diálogo.
  // Recarrega os dados do caixa para garantir que as informações mais recentes sejam exibidas.
  const handleCaixaAberto = (novoCaixa: CaixaDiarioDetalhado) => {
    setCaixaAtual(novoCaixa);
    setTemCaixaAberto(true);
    setIsAbrirCaixaDialogOpen(false); // Fecha o diálogo de abrir caixa.
    toast({ // Exibe uma notificação de sucesso.
      title: "Sucesso!",
      description: "Caixa aberto com sucesso.",
    });
    fetchCaixaAberto(); // Recarrega os dados para refletir o novo caixa.
  };

  // AI-NOTE: Callback executado quando um caixa é fechado com sucesso através do FecharCaixaDialog.
  // Reseta o estado do caixa atual, indica que não há caixa aberto e fecha o diálogo.
  // Recarrega os dados do caixa (que não deve encontrar um caixa aberto).
  const handleCaixaFechado = () => {
    setCaixaAtual(null);
    setTemCaixaAberto(false);
    setIsFecharCaixaDialogOpen(false); // Fecha o diálogo de fechar caixa.
    fetchCaixaAberto(); // Recarrega os dados (espera-se que não haja caixa aberto).
    toast({ // Exibe uma notificação de sucesso.
      title: "Sucesso!",
      description: "Caixa fechado e enviado para conferência.",
    });
  };

  // AI-NOTE: Função utilitária para formatar valores monetários para o padrão BRL (Real Brasileiro).
  // Recebe um valor (string, null ou undefined) e retorna uma string formatada (ex: "R$ 1.234,56").
  // Retorna "R$ 0,00" se o valor for nulo, indefinido ou inválido.
  const formatarValor = (valor: string | null | undefined) => {
    if (!valor) return 'R$ 0,00'; // Retorno padrão para valor ausente.
    try {
      // Tenta converter o valor para float e formatá-lo.
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(parseFloat(valor));
    } catch (error) {
      // Em caso de erro na formatação, loga o erro e retorna "R$ 0,00".
      console.error('Error formatting value:', valor, error);
      return 'R$ 0,00';
    }
  };

  // AI-NOTE: Renderização do componente OperadorCaixaPage.
  // Inclui cabeçalho, indicador de carregamento, e condicionalmente exibe:
  // - Opções para abrir caixa ou ver histórico (se nenhum caixa estiver aberto).
  // - Detalhes do caixa aberto (se um caixa estiver aberto).
  // - Lista de movimentações pendentes.
  // - Diálogos para abrir e fechar caixa.
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho da página */}
      <PageHeader 
        title="Painel do Operador de Caixa"
        description="Gerencie seus caixas diários e solicitações de movimentação"
      />

      {/* Indicador de Carregamento Global da Página */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center space-y-4">
            {/* Animação de spinner */}
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Carregando informações do caixa...</p>
          </div>
        </div>
      ) : (
        // Conteúdo principal após o carregamento
        <>
          {/* Seção exibida quando NÃO HÁ caixa aberto */}
          {!temCaixaAberto && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card para Abrir Novo Caixa */}
              <Card>
                <CardHeader>
                  <CardTitle>Abrir Novo Caixa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Inicie um novo caixa para o dia atual.
                  </p>
                  <Button 
                    onClick={() => setIsAbrirCaixaDialogOpen(true)} // Abre o diálogo de abrir caixa
                    className="w-full"
                  >
                    Abrir Novo Caixa
                  </Button>
                </CardContent>
              </Card>

              {/* Card para Navegar para o Histórico de Caixas */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Caixas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visualize o histórico de seus caixas anteriores.
                  </p>
                  <Button 
                    onClick={() => router.push('/operador-caixa/historico')} // Navega para a página de histórico
                    className="w-full"
                    variant="outline"
                  >
                    Ver Histórico
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Seção exibida quando HÁ um caixa aberto */}
          {/* O componente DetalhesCaixaAberto é renderizado aqui. */}
          {temCaixaAberto && caixaAtual && (
            <DetalhesCaixaAberto 
              caixa={caixaAtual} // Passa os dados do caixa atual para o componente filho.
              onFecharCaixa={() => setIsFecharCaixaDialogOpen(true)} // Passa a função para abrir o diálogo de fechar caixa.
            />
          )}

          {/* Seção de Movimentações Pendentes - sempre exibida */}
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? ( // Exibe "Carregando..." se os dados ainda estiverem sendo buscados (embora o loading principal já tenha passado)
                <p>Carregando...</p>
              ) : movimentacoesPendentes.length > 0 ? (
                // Se existem movimentações pendentes, mapeia e exibe cada uma.
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
                // Se não há movimentações pendentes, exibe uma mensagem informativa.
                <p className="text-center text-muted-foreground py-6">
                  Você não possui movimentações pendentes no momento.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Diálogos Modais */}
          {/* Diálogo para Abrir Caixa */}
          <AbrirCaixaDialog
            isOpen={isAbrirCaixaDialogOpen} // Controla a visibilidade do diálogo.
            onClose={() => setIsAbrirCaixaDialogOpen(false)} // Função para fechar o diálogo.
            onCaixaAberto={handleCaixaAberto} // Callback para quando o caixa é aberto com sucesso.
          />
          
          {/* Diálogo para Fechar Caixa - renderizado apenas se 'caixaAtual' existir */}
          {caixaAtual && (
            <FecharCaixaDialog
              isOpen={isFecharCaixaDialogOpen} // Controla a visibilidade.
              onClose={() => setIsFecharCaixaDialogOpen(false)} // Função para fechar.
              caixaDetalhado={caixaAtual} // Passa os dados do caixa a ser fechado.
              onCaixaFechado={handleCaixaFechado} // Callback para quando o caixa é fechado.
            />
          )}
        </>
      )}
    </div>
  );
}