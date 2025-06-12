import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware de bypass para desenvolvimento.
 * A autenticação está DESABILITADA em desenvolvimento.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  console.log('[DEV BYPASS] Acesso permitido:', pathname);
  
  // Redireciona dashboard genérico para operador-caixa em desenvolvimento
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/operador-caixa', req.url));
  }
  
  // Permite acesso a todas as outras rotas
  return NextResponse.next();
}

// Configuração do matcher para o middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/operador-caixa/:path*",
    "/supervisor-caixa/:path*", 
    "/supervisor-conferencia/:path*",
    "/admin/:path*",
    "/api/caixa/:path*",
    "/api/movimentacao/:path*",
    "/api/usuarios/:path*",
    "/api/configuracoes/:path*",
    "/api/validacao-final/:path*",
    "/api/mfa/:path*",
    "/mfa-setup",
    "/mfa-verify",
  ],
};
