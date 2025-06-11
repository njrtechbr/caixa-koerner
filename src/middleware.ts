import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

/**
 * Middleware de autenticação e autorização para o Sistema de Controle de Caixa
 * Protege rotas baseado em autenticação e cargo do usuário
 */

export default withAuth(  function middleware(req) {
    const { pathname } = req.nextUrl
    const { token } = req.nextauth

    // MODO DESENVOLVIMENTO: Permitir acesso temporário a /mfa-setup sem autenticação completa
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (isDevelopment && pathname.startsWith('/mfa-setup')) {
      return NextResponse.next()
    }    // Se não há token, o withAuth já redirecionará para login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Verificar se MFA é obrigatório e se o usuário tem MFA habilitado
    const isMfaEnabled = token.isMfaEnabled as boolean
    const isInMfaSetup = pathname.startsWith('/mfa-setup')
    const isInMfaVerify = pathname.startsWith('/mfa-verify')
    const isInLogin = pathname.startsWith('/login')
    const isInMfaApi = pathname.startsWith('/api/mfa')

    // Se MFA não está habilitado e não está nas páginas permitidas, redirecionar para setup
    if (!isMfaEnabled && !isInMfaSetup && !isInLogin && !isInMfaVerify && !isInMfaApi) {
      return NextResponse.redirect(new URL('/mfa-setup', req.url))
    }

    // Se MFA está habilitado mas o usuário está na página de setup, redirecionar para dashboard
    if (isMfaEnabled && isInMfaSetup) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Verificar permissões baseadas no cargo
    const cargo = token.cargo as string

    // Verificar acesso às rotas baseado no cargo
    if (pathname.startsWith('/operador-caixa')) {
      if (cargo !== 'operador_caixa' && cargo !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    if (pathname.startsWith('/supervisor-caixa')) {
      if (cargo !== 'supervisor_caixa' && cargo !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    if (pathname.startsWith('/supervisor-conferencia')) {
      if (cargo !== 'supervisor_conferencia' && cargo !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    if (pathname.startsWith('/admin')) {
      if (cargo !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Redirecionamento inteligente do dashboard baseado no cargo
    if (pathname === '/dashboard') {
      if (cargo === 'operador_caixa') {
        return NextResponse.redirect(new URL('/operador-caixa', req.url))
      } else if (cargo === 'supervisor_caixa') {
        return NextResponse.redirect(new URL('/supervisor-caixa', req.url))
      } else if (cargo === 'supervisor_conferencia') {
        return NextResponse.redirect(new URL('/supervisor-conferencia', req.url))
      } else if (cargo === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url))
      } else {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  },  {
    callbacks: {
      authorized: ({ token, req }) => {
        // MODO DESENVOLVIMENTO: Permitir acesso a /mfa-setup sem token
        const isDevelopment = process.env.NODE_ENV === 'development'
        if (isDevelopment && req.nextUrl.pathname.startsWith('/mfa-setup')) {
          return true
        }
        
        // Para outras rotas, exigir token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Proteger todas as rotas autenticadas
    "/dashboard/:path*",
    "/operador-caixa/:path*", 
    "/supervisor-caixa/:path*",
    "/supervisor-conferencia/:path*",
    "/admin/:path*",
    // Proteger APIs
    "/api/caixa/:path*",
    "/api/movimentacao/:path*",
    "/api/usuarios/:path*",
    "/api/configuracoes/:path*",
    "/api/validacao-final/:path*",
    "/api/mfa/:path*",
    // Rota principal do dashboard
    "/dashboard",
    // Páginas MFA
    "/mfa-setup",
    "/mfa-verify",
  ]
}
