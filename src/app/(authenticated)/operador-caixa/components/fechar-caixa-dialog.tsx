"use client";

// AI-NOTE: Componente React para o diálogo de fechamento de caixa.
// Este componente permite ao operador de caixa informar os valores apurados para cada forma de pagamento
// e registrar observações antes de submeter o fechamento do caixa.
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // AI-NOTE: Componentes UI para construir o diálogo.
import { Input } from "@/components/ui/input"; // AI-NOTE: Componente UI para campos de entrada.
import { Label } from "@/components/ui/label"; // AI-NOTE: Componente UI para rótulos de formulário.
import { toast } from '@/hooks/use-toast'; // AI-NOTE: Hook para exibir notificações (toasts).
// AI-NOTE: A importação de 'TransacaoFechamento' de '@ /lib/schemas' sugere que existe uma definição de esquema
// para transações de fechamento. Isso é bom para consistência de dados.
import { TransacaoFechamento } from '@/lib/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // AI-NOTE: Componente UI para exibir alertas.
import { Terminal } from 'lucide-react'; // AI-NOTE: Ícone para ser usado em alertas.

// AI-NOTE: Interfaces duplicadas de 'OperadorCaixaPage'. Idealmente, deveriam ser importadas de um local compartilhado
// para evitar redundância e garantir consistência. Se não for possível, manter sincronizado.
// Interface para o usuário simplificada
interface UsuarioSimples {
  id: string;
  nome: string;
  email: string;
}

// Interface para TransacaoFechamentoDetalhada
interface TransacaoFechamentoDetalhada {
  id: string;
  caixa_diario_id: string;
  tipo_pagamento: string;
  valor: string | null;
}

// Interface para MovimentacaoCaixaDetalhada
interface MovimentacaoCaixaDetalhada {
  id: string;
  caixa_diario_id: string | null;
  tipo: string;
  valor: string | null;
  descricao: string | null;
  status: string;
  solicitante_id: string | null;
  data_solicitacao: string | null;
  aprovador_id: string | null;
  data_decisao: string | null;
}

// Interface para CaixaDiarioDetalhado, alinhada com a resposta da API formatada
interface CaixaDiarioDetalhado {
  id: string;
  data_movimento: string | null;
  valor_inicial: string | null;
  status: string;
  aberto_por_usuario_id: string | null;
  data_abertura: string | null;
  fechado_por_usuario_id?: string | null;
  data_fechamento?: string | null;
  revisado_por_usuario_id?: string | null;
  data_revisao?: string | null;
  motivo_rejeicao?: string | null;
  valor_total_fechamento?: string | null;
  aberto_por: UsuarioSimples | null;
  fechado_por?: UsuarioSimples | null;
  revisado_por?: UsuarioSimples | null;
  transacoes: TransacaoFechamentoDetalhada[];
  movimentacoes: MovimentacaoCaixaDetalhada[];
  [key: string]: any; // AI-NOTE: Permite extensibilidade, mas usar com cautela.
}

// AI-NOTE: Interface para as propriedades (props) do componente FecharCaixaDialog.
interface FecharCaixaDialogProps {
  isOpen: boolean; // Controla a visibilidade do diálogo.
  onClose: () => void; // Função chamada quando o diálogo deve ser fechado.
  caixaDetalhado: CaixaDiarioDetalhado | null; // Dados do caixa que está sendo fechado. Null se nenhum caixa selecionado.
  onCaixaFechado: () => void; // Callback chamado após o caixa ser fechado com sucesso.
}

// AI-NOTE: Componente funcional FecharCaixaDialog.
// Responsável por coletar os valores de fechamento por forma de pagamento e submetê-los à API.
export default function FecharCaixaDialog({
  isOpen,
  onClose,
  caixaDetalhado,
  onCaixaFechado,
}: FecharCaixaDialogProps) {
  // AI-NOTE: Estado para controlar o indicador de carregamento durante a submissão.
  const [isLoading, setIsLoading] = useState(false);
  // AI-NOTE: Estado para armazenar os valores de fechamento informados pelo usuário.
  // É um objeto onde a chave é a forma de pagamento e o valor é o montante (string).
  const [valoresFechamento, setValoresFechamento] = useState<Record<string, string>>({});
  // AI-NOTE: Estado para armazenar observações adicionais sobre o fechamento.
  const [observacoes, setObservacoes] = useState('');
  // AI-NOTE: Estado para armazenar mensagens de erro a serem exibidas no diálogo.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI-NOTE: Lista de formas de pagamento esperadas para o fechamento.
  // Idealmente, isso poderia vir da API ou de configurações globais para maior flexibilidade.
  const formasPagamentoEsperadas = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX'];

  // AI-NOTE: Hook useEffect para inicializar/resetar os 'valoresFechamento' quando 'caixaDetalhado' muda.
  // Preenche os campos com valores de transações existentes (se houver) ou com '0'.
  useEffect(() => {
    if (caixaDetalhado) {
      const initialValores: Record<string, string> = {};
      formasPagamentoEsperadas.forEach(forma => {
        // Tenta encontrar uma transação existente para esta forma de pagamento no caixa atual.
        const transacaoExistente = caixaDetalhado.transacoes.find(t => t.tipo_pagamento === forma);
        initialValores[forma] = transacaoExistente?.valor?.toString() || '0'; // Usa o valor existente ou '0'.
      });
      setValoresFechamento(initialValores);
      setObservacoes(''); // Limpa observações anteriores.
      setErrorMessage(null); // Limpa mensagens de erro anteriores.
    }
  }, [caixaDetalhado, isOpen]); // AI-NOTE: Adicionado isOpen para resetar o form ao reabrir o dialog com o mesmo caixa.

  // AI-NOTE: Handler para atualizar o estado 'valoresFechamento' quando o usuário digita em um campo de valor.
  const handleValorChange = (formaPagamento: string, valor: string) => {
    setValoresFechamento(prev => ({ ...prev, [formaPagamento]: valor }));
  };

  // AI-NOTE: Função para lidar com a submissão do formulário de fechamento de caixa.
  // Envia uma requisição POST para a API '/api/caixa/fechar/[id_do_caixa]'.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne o comportamento padrão de submissão.
    if (!caixaDetalhado) return; // Guarda contra submissão sem dados do caixa.

    setIsLoading(true); // Ativa o indicador de carregamento.
    setErrorMessage(null); // Limpa erros anteriores.

    // AI-NOTE: Mapeia o estado 'valoresFechamento' para o formato esperado pela API (TransacaoFechamento[]).
    // Converte os valores de string para float.
    const transacoesFechamento: TransacaoFechamento[] = Object.entries(valoresFechamento)
      .map(([tipo_pagamento, valorStr]) => ({
        tipo_pagamento,
        valor: parseFloat(valorStr.replace(',', '.')) || 0, // Substitui vírgula por ponto para parseFloat.
      }));

    try {
      // AI-NOTE: Requisição para a API de fechamento de caixa.
      const response = await fetch(`/api/caixa/fechar/${caixaDetalhado.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transacoesFechamento, // Array com os valores por forma de pagamento.
          observacoes,          // Observações do fechamento.
          // mfaCode: "codigo_mfa_se_necessario" // AI-NOTE: Incluir mfaCode se a API exigir.
        }),
      });

      const data = await response.json(); // Converte a resposta da API para JSON.

      if (data.sucesso) {
        // Se a API indicar sucesso:
        toast({
          title: "Sucesso!",
          description: "Caixa fechado com sucesso e enviado para conferência.",
        });
        onCaixaFechado(); // Chama o callback onCaixaFechado.
        onClose();        // Fecha o diálogo.
      } else {
        // Se a API indicar erro:
        setErrorMessage(data.mensagem || "Erro ao fechar caixa. Verifique os valores e tente novamente.");
        toast({
          title: "Erro ao Fechar Caixa",
          description: data.mensagem || "Não foi possível fechar o caixa.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Em caso de erro na requisição (ex: problema de rede):
      console.error("Erro de conexão:", error);
      setErrorMessage("Erro de conexão ao tentar fechar o caixa.");
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Desativa o indicador de carregamento.
    }
  };

  // AI-NOTE: Função para calcular o valor total informado nos campos de fechamento.
  // Usado para exibir um total para o usuário conferir.
  const calcularTotalFechamento = () => {
    return Object.values(valoresFechamento).reduce((acc, valorStr) => {
      const valor = parseFloat(valorStr.replace(',', '.')) || 0; // Garante que vírgulas sejam tratadas.
      return acc + valor;
    }, 0);
  };

  // AI-NOTE: Não renderiza nada se 'caixaDetalhado' for nulo (proteção).
  if (!caixaDetalhado) return null;

  // AI-NOTE: Renderização do diálogo.
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl"> {/* Conteúdo do diálogo com classes responsivas */}
        <DialogHeader> {/* Cabeçalho do diálogo */}
          <DialogTitle>Fechar Caixa</DialogTitle>
          <DialogDescription>
            Informe os valores de fechamento para cada forma de pagamento.
            Caixa ID: {caixaDetalhado.id} {/* Exibe o ID do caixa que está sendo fechado */}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* Área rolável para os campos do formulário, caso sejam muitos */}
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Mapeia as 'formasPagamentoEsperadas' para criar um campo de input para cada uma */}
            {formasPagamentoEsperadas.map((forma) => (
              <div key={forma} className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor={forma} className="text-right">
                  {forma}
                </Label>
                <Input
                  id={forma}
                  type="number" // Tipo de entrada numérica.
                  step="0.01"  // Permite decimais.
                  min="0"      // Valor mínimo.
                  value={valoresFechamento[forma] || '0'} // Valor do estado ou '0'.
                  onChange={(e) => handleValorChange(forma, e.target.value)} // Atualiza o estado.
                  className="col-span-2"
                  placeholder="0.00"
                />
              </div>
            ))}

            {/* Exibição do total informado */}
            <div className="grid grid-cols-3 items-center gap-4 mt-2 pt-2 border-t">
                <Label className="text-right font-semibold">Total Informado</Label>
                <div className="col-span-2 font-semibold text-lg">
                    {/* Formata o total calculado como moeda BRL */}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotalFechamento())}
                </div>
            </div>

            {/* Campo para observações */}
            <div className="grid grid-cols-1 gap-2 mt-2">
              <Label htmlFor="observacoes">Observações (Opcional)</Label>
              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="col-span-3 p-2 border rounded min-h-[80px] focus:ring-ring focus:border-ring" // AI-NOTE: Adicionado estilo de foco.
                placeholder="Adicione observações relevantes sobre o fechamento..."
              />
            </div>

            {/* Exibição de mensagem de erro, se houver */}
            {errorMessage && (
              <Alert variant="destructive" className="mt-4">
                <Terminal className="h-4 w-4" /> {/* Ícone de terminal */}
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="mt-4"> {/* Rodapé do diálogo */}
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Fechando Caixa..." : "Confirmar Fechamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
