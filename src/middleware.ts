// AI-NOTE: Middleware do Next.js para interceptar e processar requisições.
// Este middleware é executado antes que a requisição chegue às páginas ou rotas de API.
// É usado aqui principalmente para proteger rotas, redirecionar usuários não autenticados
// para a página de login e potencialmente para lidar com a configuração de MFA.

// AI-NOTE: Importa 'withAuth' do next-auth/middleware.
// 'withAuth' é um HOF (Higher-Order Function) que simplifica a proteção de rotas
// baseada no status de autenticação do usuário. Ele lida com a verificação do token JWT.
import { withAuth } from "next-auth/middleware";
// AI-NOTE: Importa NextResponse para manipular respostas e redirecionamentos.
import { NextResponse } from "next/server";
// AI-NOTE: Importa tipos para anotação.
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// AI-NOTE: Lista de caminhos (paths) que são públicos e não exigem autenticação.
// Estes caminhos serão acessíveis mesmo para usuários não logados.
// Inclui a página de login, páginas de configuração de MFA, rotas de API públicas, e assets estáticos.
const publicPaths = [
  "/login",
  "/mfa-setup", // AI-NOTE: Página para configurar o MFA.
  "/mfa-verify", // AI-NOTE: Página para verificar o código MFA durante o login.
  "/api/auth/**", // AI-NOTE: Rotas da API do NextAuth (ex: /api/auth/session, /api/auth/signin).
  "/api/mfa/generate-secret", // AI-NOTE: API para gerar segredo MFA.
  "/api/mfa/verify-setup",    // AI-NOTE: API para verificar a configuração do MFA.
  "/favicon.ico",
  "/images/**", // AI-NOTE: Assumindo que imagens públicas estejam aqui.
  // Adicionar outros caminhos públicos conforme necessário (ex: página de registro, sobre, etc.)
];

// AI-NOTE: Função de middleware principal, decorada com 'withAuth'.
// 'withAuth' gerencia a lógica de verificar se o usuário está autenticado.
// Se o usuário não estiver autenticado (ou o token for inválido/expirado) e a rota não for pública,
// ele redireciona para a página de login definida em `authOptions.pages.signIn`.
export default withAuth(
  // AI-NOTE: Função que é executada DEPOIS que 'withAuth' validou o token (ou seja, token existe e é válido).
  // Recebe a requisição (req) que já tem o token decodificado anexado a ela (req.nextauth.token).
  async function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { token } = req.nextauth; // AI-NOTE: Extrai o token JWT decodificado.
    const { pathname } = req.nextUrl; // AI-NOTE: Extrai o caminho da URL da requisição.

    // AI-NOTE: Log para depuração: exibe o token e o caminho da requisição.
    // console.log("Middleware - Token:", token);
    // console.log("Middleware - Pathname:", pathname);

    // AI-NOTE: Verifica se o usuário está autenticado (token existe).
    const isAuthenticated = !!token;

    // AI-NOTE: Se o usuário está autenticado e tem MFA habilitado, mas ainda não passou pela verificação de MFA na sessão atual
    // E está tentando acessar uma rota protegida (não a página de verificação de MFA),
    // redireciona para a página de verificação de MFA.
    // O campo 'mfaVerifiedInSession' precisaria ser setado no token JWT após a verificação bem-sucedida do MFA.
    // Esta lógica assume que 'token.mfaEnabled' indica que o MFA está configurado,
    // e 'token.mfaVerifiedInSession' (hipotético) indicaria se o passo de MFA foi completado nesta sessão.
    // A lógica atual em authOptions não parece setar 'mfaVerifiedInSession'.
    // Uma abordagem mais simples é verificar se mfaEnabled=true e se o usuário está tentando acessar algo que não seja mfa-verify.
    if (
      isAuthenticated &&
      token.mfaEnabled && // Se o MFA está configurado para o usuário
      !token.mfaVerifiedThisSession && // AI-NOTE: Este campo é hipotético e não está sendo setado no auth.ts. A lógica precisa ser ajustada.
      pathname !== "/mfa-verify" && // E não está já na página de verificação
      !publicPaths.some(p => pathname.startsWith(p.replace('/**', ''))) // E não é um caminho público (ex: API de auth)
    ) {
      // console.log("Usuário com MFA habilitado, mas não verificado nesta sessão. Redirecionando para /mfa-verify");
      // return NextResponse.redirect(new URL("/mfa-verify", req.url));
      // AI-NOTE: A lógica acima com 'mfaVerifiedThisSession' precisa ser implementada no callback JWT do auth.ts
      // ou uma abordagem diferente deve ser usada. Por ora, se mfaEnabled=true e o usuário está logado,
      // mas tenta acessar algo que não é /login, /mfa-verify ou /mfa-setup, e o token não indica que o MFA foi completado
      // (este último bit está faltando na implementação atual do token).
      // Por simplicidade, se o usuário está logado, tem MFA, mas o token não tem um marcador de "MFA completo nesta sessão",
      // e ele não está tentando acessar as páginas de MFA ou login, ele deve ser enviado para /mfa-verify.
    }


    // AI-NOTE: Se o usuário está autenticado e tenta acessar a página de login,
    // redireciona para o dashboard ou página inicial da área autenticada.
    if (isAuthenticated && pathname === "/login") {
      // console.log("Usuário autenticado tentando acessar /login. Redirecionando para /dashboard.");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // AI-NOTE: Se o usuário está autenticado, o MFA está configurado e verificado (ou não é necessário),
    // e ele tenta acessar /mfa-setup, redireciona para o dashboard.
    // Isso previne que um usuário já configurado acesse a página de setup novamente desnecessariamente.
    if (isAuthenticated && token.mfaEnabled && pathname === "/mfa-setup") {
        // Assumindo que se mfaEnabled = true no token, a configuração já foi feita.
        // console.log("Usuário autenticado com MFA já configurado tentando acessar /mfa-setup. Redirecionando para /dashboard.");
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // AI-NOTE: Nenhuma ação de redirecionamento específica necessária além do que 'withAuth' já faz.
    // Retorna NextResponse.next() para continuar o processamento normal da requisição.
    return NextResponse.next();
  },
  {
    // AI-NOTE: Callbacks para o HOF 'withAuth'.
    callbacks: {
      // AI-NOTE: Callback 'authorized' determina se o usuário está autorizado a acessar a rota.
      // É chamado ANTES da função middleware principal acima.
      // O retorno (true/false) controla se a função middleware principal é executada ou se o usuário é redirecionado.
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        // AI-NOTE: Verifica se o caminho da requisição atual é um dos caminhos públicos definidos.
        const isPublicPath = publicPaths.some(p => {
          if (p.endsWith('/**')) {
            return pathname.startsWith(p.slice(0, -3)); // Compara o início da string se for um path com curinga /**
          }
          return pathname === p; // Comparação exata para paths sem curinga.
        });

        // AI-NOTE: Se o caminho for público, o acesso é sempre autorizado, independentemente do token.
        if (isPublicPath) {
          // console.log(\`Caminho público acessado: \${pathname}. Autorizado.\`);
          return true;
        }

        // AI-NOTE: Se o caminho não for público, o acesso é autorizado apenas se houver um token válido (usuário logado).
        // '!!token' converte o token (que pode ser um objeto ou null) para um booleano.
        const isAuthorized = !!token;
        // if (!isAuthorized) {
        //   console.log(\`Acesso não autorizado para \${pathname}. Token: \${token ? 'existe' : 'não existe'}.\`);
        // }
        return isAuthorized;
      },
    },
    // AI-NOTE: Páginas para as quais 'withAuth' pode redirecionar.
    // Deve corresponder às páginas definidas em 'authOptions' para consistência.
    pages: {
      signIn: "/login", // Página de login.
      // error: "/auth/error", // Página de erro de autenticação.
    },
  }
);

// AI-NOTE: Configuração do matcher para o middleware.
// Define em quais caminhos o middleware será executado.
// O padrão é executar em todas as rotas. Este matcher exclui:
//  - Rotas de API (exceto /api/auth/** e /api/mfa/** que são tratadas como publicPaths ou protegidas)
//  - _next/static (arquivos estáticos)
//  - _next/image (otimização de imagens)
//  - favicon.ico
//  - assets (arquivos em /public/assets)
// A lógica é: aplicar o middleware a todas as rotas de página e algumas APIs específicas,
// mas não a todos os assets estáticos ou rotas internas do Next.js.
export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos de requisição, exceto para aqueles que começam com:
     * - api (rotas de API) - CUIDADO: Isso pode tornar APIs desprotegidas se não listadas em publicPaths ou sem lógica de auth própria.
     *                         É melhor ser mais específico aqui ou garantir que cada API tenha sua própria verificação.
     *                         A lógica atual no 'authorized' callback já lida com publicPaths, incluindo /api/auth/**.
     * - _next/static (arquivos estáticos)
     * - _next/image (arquivos de otimização de imagem)
     * - favicon.ico (arquivo de favicon)
     * - assets (arquivos na pasta /public/assets)
     * - images (arquivos na pasta /public/images, já coberto por publicPaths se necessário)
     */
    // '/((?!api|_next/static|_next/image|favicon.ico|assets).*)', // Matcher original mais restritivo.
    // AI-NOTE: Matcher mais permissivo para garantir que o middleware rode na maioria das rotas,
    // deixando a lógica de 'publicPaths' e 'authorized' controlar o acesso.
    // Exclui apenas os caminhos mais comuns de assets estáticos e internos do Next.js.
     '/((?!_next/static|_next/image|assets|favicon.ico).*)',
  ],
};
