import { NextResponse } from "next/server"

/**
 * Desenvolvimento: Middleware desabilitado
 * Todas as rotas são permitidas em desenvolvimento
 */
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/operador-caixa/:path*",
    "/api/caixa/:path*"
  ],
}
