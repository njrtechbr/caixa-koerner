"use client";

// AI-NOTE: Componente React para exibir os detalhes de um caixa diário que está aberto.
// Mostra informações como ID do caixa, data de movimento, valor inicial, status,
// dados de quem abriu, e um resumo de transações e movimentações.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // AI-NOTE: Componentes UI para estrutura de cartão.
import { Button } from "@/components/ui/button"; // AI-NOTE: Componente UI para botões.
import { Badge } from "@/components/ui/badge";   // AI-NOTE: Componente UI para emblemas (badges) de status.
import { CalendarDays, DollarSign, Clock, User } from "lucide-react"; // AI-NOTE: Ícones para melhorar a interface.

// AI-NOTE: Interface para os dados detalhados de um caixa diário.
// Esta interface é crucial para a correta exibição dos dados.
// Os campos alternativos (ex: dataMovimento vs data_movimento) indicam uma tentativa de
// lidar com inconsistências nos nomes dos campos vindos da API ou de diferentes partes do sistema.
// Idealmente, a fonte de dados deveria ser consistente.
interface CaixaDiarioDetalhado {
  id: string; // Identificador único do caixa diário.
  data_movimento?: string | null; // Data de referência do movimento (snake_case).
  dataMovimento?: string | null;  // Data de referência do movimento (camelCase - alternativo).
  valor_inicial?: string | null;  // Valor de abertura do caixa (snake_case).
  valorInicial?: string | null;   // Valor de abertura do caixa (camelCase - alternativo).
  status: string;                 // Status atual do caixa (ex: "aberto", "fechado").
  data_abertura?: string | null;  // Data e hora da abertura (snake_case).
  dataAbertura?: string | null;   // Data e hora da abertura (camelCase - alternativo).
  aberto_por_usuario_id?: string | null; // ID do usuário que abriu (snake_case).
  abertoPorUsuarioId?: string | null; // ID do usuário que abriu (camelCase - alternativo).
  aberto_por?: { // Objeto com detalhes do usuário que abriu (snake_case).
    id: string;
    nome: string;
    email: string;
  } | null;
  abertoPorUsuario?: { // Objeto com detalhes do usuário que abriu (camelCase - alternativo).
    id: string;
    nome: string;
    email: string;
  } | null;
  transacoes?: any[]; // Lista de transações (snake_case). AI-NOTE: 'any[]' deve ser substituído por uma interface mais específica (ex: TransacaoDetalhada[]).
  transacoesFechamento?: any[];  // Lista de transações (camelCase - alternativo). AI-NOTE: Idem.
  movimentacoes?: any[]; // Lista de movimentações (snake_case). AI-NOTE: 'any[]' deve ser substituído por MovimentacaoDetalhada[].
  movimentacoesCaixa?: any[];    // Lista de movimentações (camelCase - alternativo). AI-NOTE: Idem.
  valor_total_fechamento?: string; // Valor total apurado no fechamento.
}

// AI-NOTE: Interface para as propriedades (props) do componente DetalhesCaixaAberto.
interface DetalhesCaixaAbertoProps {
  caixa: CaixaDiarioDetalhado; // Objeto contendo os dados do caixa a ser exibido.
  onFecharCaixa: () => void;   // Callback a ser chamado quando o usuário clica no botão "Fechar Caixa".
}

// AI-NOTE: Componente funcional DetalhesCaixaAberto.
// Responsável por renderizar as informações de um caixa aberto em um formato legível.
export default function DetalhesCaixaAberto({ caixa, onFecharCaixa }: DetalhesCaixaAbertoProps) {
  // AI-NOTE: Log para depuração, útil durante o desenvolvimento para verificar os dados recebidos.
  // Em produção, idealmente seria removido ou controlado por uma flag de ambiente.
  console.log('DetalhesCaixaAberto received:', caixa);
  
  // AI-NOTE: Função utilitária para formatar strings de data (ISO) para o formato DD/MM/YYYY.
  // Trata casos de string nula/indefinida e erros de formatação.
  const formatarData = (dataString: string | null | undefined) => {
    if (!dataString) return 'N/A'; // Retorna 'N/A' se a data não estiver disponível.
    try {
      return new Date(dataString).toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Error formatting date:', dataString, error); // Loga o erro no console.
      return 'Data inválida'; // Retorna mensagem de erro amigável.
    }
  };
  
  // AI-NOTE: Função utilitária para formatar strings de data/hora (ISO) para o formato DD/MM/YYYY HH:MM:SS.
  // Trata casos de string nula/indefinida e erros de formatação.
  const formatarDataHora = (dataString: string | null | undefined) => {
    if (!dataString) return 'N/A';
    try {
      return new Date(dataString).toLocaleString('pt-BR');
    } catch (error) {
      console.error('Error formatting datetime:', dataString, error);
      return 'Data/hora inválida';
    }
  };

  // AI-NOTE: Função utilitária para formatar valores numéricos (string) como moeda BRL (Real Brasileiro).
  // Trata casos de valor nulo/indefinido e erros de formatação.
  const formatarValor = (valor: string | null | undefined) => {
    if (!valor) return 'R$ 0,00'; // Retorno padrão para valor ausente.
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(parseFloat(valor)); // Converte a string para float antes de formatar.
    } catch (error) {
      console.error('Error formatting value:', valor, error);
      return 'R$ 0,00'; // Retorno padrão em caso de erro.
    }
  };

  // AI-NOTE: Função auxiliar para obter a lista de transações.
  // Prioriza 'caixa.transacoes', depois 'caixa.transacoesFechamento', e retorna um array vazio como fallback.
  // Isso ajuda a lidar com a inconsistência nos nomes dos campos.
  const getTransacoes = () => {
    return caixa.transacoes || caixa.transacoesFechamento || [];
  };

  // AI-NOTE: Função auxiliar para obter a lista de movimentações.
  // Prioriza 'caixa.movimentacoes', depois 'caixa.movimentacoesCaixa', e retorna um array vazio como fallback.
  const getMovimentacoes = () => {
    return caixa.movimentacoes || caixa.movimentacoesCaixa || [];
  };

  // AI-NOTE: Função auxiliar para obter o nome do usuário que abriu o caixa.
  // Tenta obter de 'caixa.aberto_por.nome' ou 'caixa.abertoPorUsuario.nome'.
  // Retorna uma mensagem padrão se o nome não for encontrado.
  const getAberturaPor = () => {
    return caixa.aberto_por?.nome || 
           caixa.abertoPorUsuario?.nome || 
           'Usuário não identificado';
  };

  // AI-NOTE: Renderização do componente. Utiliza Cards para agrupar informações.
  return (
    <div className="space-y-6"> {/* Espaçamento entre os cards */}
      {/* Card principal com os detalhes do caixa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between"> {/* Layout flex para título e badge de status */}
            <div>
              <CardTitle className="flex items-center gap-2"> {/* Título com ícone */}
                <DollarSign className="h-5 w-5" />
                Caixa Aberto
              </CardTitle>
              <CardDescription>
                Caixa ID: {caixa.id} {/* Exibe o ID do caixa */}
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-green-500 text-white"> {/* Badge de Status. AI-NOTE: A cor poderia ser dinâmica baseada no status. */}
              {caixa.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4"> {/* Conteúdo do card com detalhes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Layout responsivo para os detalhes */}
            {/* Detalhe: Data do Movimento */}
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Data do Movimento</p>
                <p className="text-sm text-muted-foreground">
                  {/* Usa o primeiro valor disponível entre 'data_movimento' e 'dataMovimento' */}
                  {formatarData(caixa.data_movimento || caixa.dataMovimento)}
                </p>
              </div>
            </div>
            
            {/* Detalhe: Aberto em (Data/Hora) */}
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Aberto em</p>
                <p className="text-sm text-muted-foreground">
                  {formatarDataHora(caixa.data_abertura || caixa.dataAbertura)}
                </p>
              </div>
            </div>
            
            {/* Detalhe: Valor Inicial */}
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Valor Inicial</p>
                <p className="text-sm text-muted-foreground">
                  {formatarValor(caixa.valor_inicial || caixa.valorInicial)}
                </p>
              </div>
            </div>
            
            {/* Detalhe: Aberto por (Nome do Usuário) */}
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Aberto por</p>
                <p className="text-sm text-muted-foreground">
                  {getAberturaPor()} {/* Usa a função auxiliar para obter o nome */}
                </p>
              </div>
            </div>
          </div>

          {/* Seção com resumo de transações/movimentações e botão para fechar caixa */}
          <div className="pt-4 border-t"> {/* Divisor visual */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  {/* Exibe a contagem de transações e movimentações */}
                  Transações: {getTransacoes().length || 0} | 
                  Movimentações: {getMovimentacoes().length || 0}
                </p>
              </div>
              {/* Botão para acionar o fechamento do caixa */}
              <Button onClick={onFecharCaixa}>
                Fechar Caixa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Transações de Fechamento - renderizada condicionalmente */}
      {/* AI-NOTE: Esta seção parece exibir transações que já ocorreriam num caixa FECHADO,
           o que pode ser confuso se o caixa ainda está ABERTO. Verificar a lógica de negócio.
           Se for para exibir transações já realizadas NO caixa aberto (antes do fechamento final),
           o título "Transações de Fechamento" pode ser inadequado. */}
      {getTransacoes().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transações Registradas</CardTitle>
            {/* AI-NOTE: Sugestão de título: "Transações Registradas no Caixa" ou similar se não forem exclusivamente de fechamento. */}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Mapeia as transações para exibição */}
              {getTransacoes().map((transacao: any, index: number) => (
                // AI-NOTE: Usar 'transacao.id' como chave é preferível a 'index' se o ID for único e estável.
                // A interface 'any' para transacao deve ser substituída por uma mais específica.
                <div key={transacao.id || index} className="flex justify-between items-center p-2 border rounded">
                  {/* Tenta acessar 'tipo_pagamento' ou 'tipoPagamento' */}
                  <span>{transacao.tipo_pagamento || transacao.tipoPagamento}</span>
                  <span>{formatarValor(transacao.valor)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção de Movimentações - renderizada condicionalmente */}
      {getMovimentacoes().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Movimentações do Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Mapeia as movimentações para exibição */}
              {getMovimentacoes().map((movimentacao: any, index: number) => (
                // AI-NOTE: Usar 'movimentacao.id' como chave. Interface 'any' deve ser melhorada.
                <div key={movimentacao.id || index} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">{movimentacao.tipo}</span>
                    {/* Exibe a descrição da movimentação, se existir */}
                    {movimentacao.descricao && (
                      <p className="text-sm text-muted-foreground">{movimentacao.descricao}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div>{formatarValor(movimentacao.valor)}</div>
                    {/* Badge para o status da movimentação. AI-NOTE: Cores do badge poderiam ser dinâmicas. */}
                    <Badge variant={movimentacao.status === 'aprovado' ? 'default' : 'secondary'}>
                      {movimentacao.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}