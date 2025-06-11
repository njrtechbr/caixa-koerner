import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * API Route handler para NextAuth.js
 * Configurado para o Sistema de Controle de Caixa - Cartório Koerner
 */

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
