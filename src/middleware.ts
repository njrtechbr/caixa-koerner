import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

/**
 * Middleware de autenticação e autorização para o Sistema de Controle de Caixa.
 * Este middleware é executado para as rotas definidas no `matcher` (ver final do arquivo).
 * Ele utiliza `next-auth/middleware` para proteger rotas, verificar tokens JWT,
 * e realizar redirecionamentos baseados no estado de autenticação, configuração de MFA e cargo do usuário.
 */

export default withAuth(
  // Função principal do middleware, executada após a verificação do token pelo `withAuth`.
  function middleware(req) {
    const { pathname } = req.nextUrl; // Path da requisição atual.
    const { token } = req.nextauth;   // Token JWT decodificado, disponível após `withAuth`.

    // --- Bypass de Desenvolvimento para Configuração de MFA ---
    // Permite acesso direto à página `/mfa-setup` em ambiente de desenvolvimento,
    // facilitando testes do fluxo de MFA sem necessidade de login completo constante.
    // IMPORTANTE: `process.env.NODE_ENV` deve ser 'production' em produção para desabilitar este bypass.
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment && pathname.startsWith('/mfa-setup')) {
      console.log('[DEV] Acesso permitido a /mfa-setup (Bypass de Desenvolvimento)');
      return NextResponse.next(); // Permite o acesso sem outras verificações.
    }

    // Se não há token (usuário não logado), `withAuth` já terá redirecionado para a página de login
    // configurada em `authOptions.pages.signIn` (ou fará isso se `authorized` abaixo retornar false).
    // Este bloco é uma salvaguarda adicional, embora `withAuth` geralmente cubra isso.
    if (!token) {
      // Este redirecionamento pode ser redundante se `authorized` já trata o caso de token ausente.
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // --- Lógica de Redirecionamento para MFA ---
    const isMfaEnabled = token.isMfaEnabled as boolean; // Status do MFA do usuário (do token).
    const isInMfaSetupPage = pathname.startsWith('/mfa-setup');
    const isInMfaVerifyPage = pathname.startsWith('/mfa-verify');
    const isInLoginPage = pathname.startsWith('/login'); // Para evitar loops de redirecionamento.
    const isMfaApiRoute = pathname.startsWith('/api/mfa'); // API de MFA deve ser acessível durante setup.

    // Se MFA não está habilitado para o usuário, ele deve ser redirecionado para a página de configuração de MFA,
    // a menos que já esteja em uma página permitida (setup, login, verify, ou API de MFA).
    if (!isMfaEnabled && !isInMfaSetupPage && !isInLoginPage && !isInMfaVerifyPage && !isMfaApiRoute) {
      return NextResponse.redirect(new URL('/mfa-setup', req.url));
    }

    // Se MFA já está habilitado, mas o usuário tenta acessar a página de setup de MFA,
    // redireciona para o dashboard principal, pois o setup não é mais necessário.
    if (isMfaEnabled && isInMfaSetupPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // --- Lógica de Controle de Acesso Baseado em Cargo (RBAC) ---
    const cargo = token.cargo as string; // Cargo do usuário (do token).

    // Define o acesso às seções principais da aplicação com base no cargo.
    // Usuários 'admin' têm acesso a todas as seções por padrão nesta lógica.
    if (pathname.startsWith('/operador-caixa') && cargo !== 'operador_caixa' && cargo !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url)); // Redireciona se não autorizado.
    }

    if (pathname.startsWith('/supervisor-caixa') && cargo !== 'supervisor_caixa' && cargo !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (pathname.startsWith('/supervisor-conferencia') && cargo !== 'supervisor_conferencia' && cargo !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (pathname.startsWith('/admin') && cargo !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // --- Redirecionamento do Dashboard Genérico ---
    // Se o usuário acessa `/dashboard`, redireciona para a página inicial específica de seu cargo.
    // Isso cria uma experiência de usuário mais direta.
    if (pathname === '/dashboard') {
      switch (cargo) {
        case 'operador_caixa':
          return NextResponse.redirect(new URL('/operador-caixa', req.url));
        case 'supervisor_caixa':
          return NextResponse.redirect(new URL('/supervisor-caixa', req.url));
        case 'supervisor_conferencia':
          return NextResponse.redirect(new URL('/supervisor-conferencia', req.url));
        case 'admin':
          return NextResponse.redirect(new URL('/admin', req.url));
        default:
          // Se o cargo não for reconhecido ou o usuário não tiver cargo (improvável com token),
          // redireciona para login como medida de segurança.
          return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // Se nenhuma das condições acima resultar em redirecionamento, permite o acesso à rota solicitada.
    return NextResponse.next();
  },
  {
    callbacks: {
      // Callback `authorized` do `withAuth` para determinar se o usuário está autorizado.
      // Executado ANTES da função `middleware` principal.
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // --- Bypass de Desenvolvimento para Configuração de MFA (Callback) ---
        // Permite acesso à rota `/mfa-setup` em desenvolvimento MESMO SEM TOKEN.
        // Isso é necessário porque a função `middleware` acima só é chamada se `authorized` retornar `true`.
        // Se um usuário não autenticado (sem token) tentar acessar `/mfa-setup` em dev,
        // este callback permite, e a função `middleware` acima então também permite (dev bypass).
        const isDevelopment = process.env.NODE_ENV === 'development';
        if (isDevelopment && pathname.startsWith('/mfa-setup')) {
          return true; // Autorizado para /mfa-setup em desenvolvimento, independentemente do token.
        }
        
        // Para todas as outras rotas, ou em ambiente de produção, um token válido é necessário.
        // `!!token` converte o token (ou sua ausência) para um booleano.
        return !!token;
      },
    },
    // TODO: Adicionar aqui a `pages` para redirecionamento de login, se não for globalmente em `authOptions`.
    // pages: { signIn: '/login' } // Se `withAuth` precisar saber a página de login aqui.
  }
);

// Configuração do `matcher` para o middleware.
// Define quais rotas serão interceptadas e processadas por este middleware.
export const config = {
  matcher: [
    // Rotas de interface do usuário autenticadas:
    "/dashboard/:path*",          // Dashboard genérico e suas sub-rotas.
    "/operador-caixa/:path*",     // Seção do Operador de Caixa.
    "/supervisor-caixa/:path*",   // Seção do Supervisor de Caixa.
    "/supervisor-conferencia/:path*", // Seção do Supervisor de Conferência.
    "/admin/:path*",              // Seção de Administração.

    // Rotas de API protegidas:
    "/api/caixa/:path*",          // APIs relacionadas a operações de caixa.
    "/api/movimentacao/:path*",   // APIs de movimentações financeiras.
    "/api/usuarios/:path*",       // APIs de gerenciamento de usuários.
    "/api/configuracoes/:path*",  // APIs de configurações do sistema.
    "/api/validacao-final/:path*",// APIs para validação final.
    // A API `/api/mfa` é intencionalmente protegida aqui, mas o fluxo de setup inicial
    // (sem MFA ainda ativo) ou o bypass de dev precisam ser considerados.
    // O token terá `isMfaEnabled=false` durante o setup.
    "/api/mfa/:path*",

    // Páginas de autenticação e MFA (também precisam ser processadas para redirecionamentos):
    "/mfa-setup",                 // Página de configuração de MFA.
    "/mfa-verify",                // Página de verificação de código MFA.
    // A página de login (`/login`) não está no matcher porque `withAuth`
    // redireciona para ela por padrão quando não autorizado. Se estivesse aqui,
    // poderia causar loops de redirecionamento se a lógica não for cuidadosa.
  ],
};
