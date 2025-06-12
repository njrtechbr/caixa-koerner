// AI-NOTE: Módulo React que define um componente reutilizável para cabeçalhos de página.
// Este componente é projetado para fornecer uma estrutura consistente para títulos,
// descrições e ações opcionais no topo das páginas da aplicação.
import type { ReactNode } from 'react'; // AI-NOTE: Importa o tipo ReactNode para permitir conteúdo React flexível (strings, elementos, etc.).

// AI-NOTE: Interface para as propriedades (props) do componente PageHeader.
// Define a estrutura de dados que o componente espera receber para sua renderização.
interface PageHeaderProps {
  title: string; // O título principal a ser exibido no cabeçalho. Obrigatório.
  description?: string | ReactNode; // Descrição opcional. Pode ser uma string simples ou um conteúdo React mais complexo.
  actions?: ReactNode; // Conteúdo opcional para ações (ex: botões), alinhado à direita do título.
}

// AI-NOTE: Componente funcional PageHeader.
// Renderiza um cabeçalho de página com base nas props fornecidas.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    // AI-NOTE: Container principal do cabeçalho. 'mb-6' adiciona uma margem inferior para espaçamento.
    <div className="mb-6">
      {/* AI-NOTE: Container para o título e as ações. Utiliza flexbox para alinhamento. */}
      <div className="flex items-center justify-between">
        {/* AI-NOTE: Elemento h1 para o título. Classes de estilização para tamanho, peso da fonte e tracking.
            'font-headline' sugere uma fonte personalizada para títulos. */}
        <h1 className="text-3xl font-bold tracking-tight font-headline">{title}</h1>
        {/* AI-NOTE: Renderiza a seção de ações somente se 'actions' for fornecido.
            'ml-4' adiciona uma margem à esquerda para separar as ações do título. */}
        {actions && <div className="ml-4">{actions}</div>}
      </div>
      {/* AI-NOTE: Renderiza a descrição somente se 'description' for fornecida. */}
      {description && (
        // AI-NOTE: Verifica se a descrição é uma string para renderizá-la em um parágrafo <p>.
        // Caso contrário, assume que é um ReactNode e renderiza diretamente em uma <div>.
        // 'mt-1' adiciona uma margem superior. 'text-muted-foreground' aplica uma cor de texto secundária.
        typeof description === 'string' 
        ? <p className="mt-1 text-muted-foreground">{description}</p>
        : <div className="mt-1 text-muted-foreground">{description}</div>
      )}
    </div>
  );
}
