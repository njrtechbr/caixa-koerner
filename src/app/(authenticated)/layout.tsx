// AI-NOTE: Componente de layout para seções autenticadas da aplicação.
// Este componente define a estrutura visual comum para páginas que exigem que o usuário esteja logado,
// como a barra lateral de navegação, o cabeçalho principal e o conteúdo da página.
"use client"; // AI-NOTE: Diretiva do Next.js que indica que este é um Componente Cliente, permitindo o uso de hooks como useState e useEffect.

import { SessionProviderWrapper } from "@/components/providers/session-provider-wrapper"; // AI-NOTE: Wrapper para o SessionProvider do NextAuth, facilita o acesso aos dados da sessão.
import { DashboardLayout } from "@/components/layout/dashboard-layout"; // AI-NOTE: Componente principal que define a estrutura do layout do dashboard (sidebar, header, main content).
import { SidebarNav } from "@/components/layout/sidebar-nav"; // AI-NOTE: Componente para a navegação na barra lateral.
import { UserNav } from "@/components/layout/user-nav"; // AI-NOTE: Componente para o menu do usuário no cabeçalho.
import { navLinks, नीचेNavLinks } from "@/config/nav"; // AI-NOTE: Importa as configurações dos links de navegação. 'नीचेNavLinks' parece ser um nome incomum (Hindi para 'links abaixo'), verificar se é intencional ou um erro de digitação/copypaste.
import { Toaster } from "@/components/ui/toaster"; // AI-NOTE: Componente para exibir notificações (toasts) globalmente.
import { usePathname } from "next/navigation"; // AI-NOTE: Hook do Next.js para obter o caminho da URL atual.
import { useEffect, useState } from "react"; // AI-NOTE: Hooks do React para efeitos colaterais e estado local.
import { Loader2 } from "lucide-react"; // AI-NOTE: Ícone de carregamento.

// AI-NOTE: Componente funcional AuthenticatedLayout.
// Envolve o conteúdo das páginas autenticadas com o layout do dashboard.
export default function AuthenticatedLayout({
  children, // AI-NOTE: Prop especial do React que representa os componentes filhos aninhados dentro deste layout.
}: {
  children: React.ReactNode; // AI-NOTE: Tipo para 'children', permitindo qualquer conteúdo React válido.
}) {
  // AI-NOTE: Estado para controlar a exibição de um indicador de carregamento global para a navegação.
  const [isLoading, setIsLoading] = useState(false);
  // AI-NOTE: Obtém o caminho da URL atual.
  const pathname = usePathname();

  // AI-NOTE: Hook useEffect para simular um carregamento ao mudar de rota.
  // Isso pode ser usado para dar feedback visual durante transições de página.
  useEffect(() => {
    setIsLoading(true); // Ativa o carregamento ao iniciar a mudança de rota.
    const timer = setTimeout(() => {
      setIsLoading(false); // Desativa o carregamento após um pequeno atraso (300ms).
                           // AI-NOTE: O uso de setTimeout aqui é para simular um carregamento. Em aplicações reais,
                           // o estado de carregamento geralmente estaria atrelado a promessas de busca de dados
                           // ou outras operações assíncronas.
    }, 300);

    // AI-NOTE: Função de limpeza do useEffect.
    // Cancela o timer se o componente for desmontado ou se o 'pathname' mudar novamente antes do timer completar.
    return () => clearTimeout(timer);
  }, [pathname]); // AI-NOTE: O efeito é re-executado sempre que o 'pathname' (URL) muda.

  // AI-NOTE: Renderização do layout.
  return (
    // AI-NOTE: Provedor de sessão para disponibilizar informações de autenticação aos componentes filhos.
    <SessionProviderWrapper>
      {/* AI-NOTE: Componente DashboardLayout que estrutura a página com sidebar, header e área de conteúdo principal. */}
      <DashboardLayout
        // AI-NOTE: Passa o componente SidebarNav como prop para a navegação principal na barra lateral.
        // 'navLinks' e 'नीचेNavLinks' são passados para configurar os itens do menu.
        // A nomenclatura 'नीचेNavLinks' deve ser revisada para algo mais descritivo em português ou inglês,
        // a menos que haja um motivo específico para o uso do Hindi.
        sidebarNav={<SidebarNav navLinks={navLinks} نیچےNavLinks={नीचेNavLinks} />}
        // AI-NOTE: Passa o componente UserNav para a seção do usuário no cabeçalho.
        userNav={<UserNav />}
      >
        {/* AI-NOTE: Área de conteúdo principal onde as páginas filhas serão renderizadas. */}
        <main className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
          {/* AI-NOTE: Condicional para exibir um indicador de carregamento ou o conteúdo da página. */}
          {isLoading ? (
            // AI-NOTE: Exibe um spinner de carregamento centralizado se 'isLoading' for true.
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-200px)]"> {/* AI-NOTE: min-h para garantir altura mínima */}
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : (
            // AI-NOTE: Renderiza os componentes filhos (o conteúdo da página atual) se 'isLoading' for false.
            children
          )}
        </main>
        {/* AI-NOTE: Toaster para exibir notificações (toasts) em qualquer lugar da aplicação autenticada. */}
        <Toaster />
      </DashboardLayout>
    </SessionProviderWrapper>
  );
}
