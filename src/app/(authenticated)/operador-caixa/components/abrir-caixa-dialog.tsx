"use client";

// AI-NOTE: Componente React para o diálogo de abertura de caixa.
// Este componente fornece um formulário para o operador de caixa inserir o valor inicial
// e iniciar um novo caixa diário.
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // AI-NOTE: Componentes UI para construir o diálogo.
import { Input } from "@/components/ui/input"; // AI-NOTE: Componente UI para campos de entrada.
import { Label } from "@/components/ui/label"; // AI-NOTE: Componente UI para rótulos de formulário.
import { toast } from '@/hooks/use-toast'; // AI-NOTE: Hook para exibir notificações (toasts).

// AI-NOTE: Interface para as propriedades (props) do componente AbrirCaixaDialog.
interface AbrirCaixaDialogProps {
  isOpen: boolean; // Controla a visibilidade do diálogo.
  onClose: () => void; // Função chamada quando o diálogo deve ser fechado.
  onCaixaAberto: (caixa: any) => void; // Callback chamado após o caixa ser aberto com sucesso, passando os dados do novo caixa. AI-NOTE: O tipo 'any' para 'caixa' poderia ser mais específico se a estrutura exata do 'caixa' retornado pela API fosse definida aqui.
}

// AI-NOTE: Componente funcional AbrirCaixaDialog.
// Responsável por renderizar o formulário de abertura de caixa e interagir com a API.
export default function AbrirCaixaDialog({ isOpen, onClose, onCaixaAberto }: AbrirCaixaDialogProps) {
  // AI-NOTE: Estado para armazenar o valor inicial do caixa inserido pelo usuário.
  const [valorInicial, setValorInicial] = useState('');
  // AI-NOTE: Estado para controlar o indicador de carregamento durante a submissão do formulário.
  const [isLoading, setIsLoading] = useState(false);

  // AI-NOTE: Função para lidar com a submissão do formulário de abertura de caixa.
  // Envia uma requisição POST para a API '/api/caixa/abrir'.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne o comportamento padrão de submissão do formulário (recarregar a página).
    setIsLoading(true); // Ativa o indicador de carregamento.

    try {
      // AI-NOTE: Requisição para a API de abertura de caixa.
      const response = await fetch('/api/caixa/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Indica que o corpo da requisição é JSON.
        },
        // AI-NOTE: Corpo da requisição com o valor inicial.
        // O valor é convertido para float; usa 0 se a conversão falhar ou o valor for vazio.
        // mfaCode está presente, mas vazio; pode ser um resquício ou para uso futuro.
        body: JSON.stringify({
          valorInicial: parseFloat(valorInicial) || 0,
          mfaCode: "" // AI-NOTE: Campo mfaCode incluído, verificar necessidade/uso com a API.
        }),
      });

      const data = await response.json(); // Converte a resposta da API para JSON.

      if (data.sucesso) {
        // Se a API indicar sucesso:
        onCaixaAberto(data.caixa); // Chama o callback onCaixaAberto com os dados do novo caixa.
        setValorInicial('');      // Limpa o campo de valor inicial.
        toast({ // Exibe uma notificação de sucesso.
          title: "Sucesso!",
          description: "Caixa aberto com sucesso.",
        });
        // onClose(); // Considerar chamar onClose() aqui também para fechar o diálogo automaticamente.
      } else {
        // Se a API indicar erro:
        toast({ // Exibe uma notificação de erro.
          title: "Erro",
          description: data.mensagem || "Erro ao abrir caixa.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Em caso de erro na requisição (ex: problema de rede):
      toast({ // Exibe uma notificação de erro de conexão.
        title: "Erro",
        description: "Erro de conexão ao abrir caixa.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Desativa o indicador de carregamento, independentemente do resultado.
    }
  };

  // AI-NOTE: Renderização do diálogo.
  return (
    <Dialog open={isOpen} onOpenChange={onClose}> {/* Controla a abertura/fechamento do diálogo */}
      <DialogContent className="sm:max-w-[425px]"> {/* Conteúdo do diálogo com estilização responsiva */}
        <DialogHeader> {/* Cabeçalho do diálogo */}
          <DialogTitle>Abrir Novo Caixa</DialogTitle>
          <DialogDescription>
            Informe o valor inicial para abrir um novo caixa diário.
          </DialogDescription>
        </DialogHeader>
        {/* Formulário de abertura de caixa */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4"> {/* Layout do conteúdo do formulário */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valorInicial" className="text-right">
                Valor Inicial
              </Label>
              <Input
                id="valorInicial"
                type="number" // Tipo de entrada numérica.
                step="0.01"  // Permite valores decimais com duas casas.
                min="0"      // Valor mínimo permitido.
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)} // Atualiza o estado 'valorInicial' ao digitar.
                className="col-span-3"
                placeholder="0.00" // Texto de exemplo no campo.
                required // Campo obrigatório.
              />
            </div>
          </div>
          <DialogFooter> {/* Rodapé do diálogo */}
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Abrindo..." : "Abrir Caixa"} {/* Texto do botão muda se estiver carregando */}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
