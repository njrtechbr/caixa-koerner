import type { NextAuthOptions, User as NextAuthUser } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './database'
import { verifyPassword } from './security'
import { LoginSchema } from './schemas'

/**
 * Configuração de autenticação NextAuth.js para o Sistema de Controle de Caixa
 * Integrado com PostgreSQL via Prisma
 */

// Estende o tipo User do NextAuth para incluir campos customizados
interface AppUser extends NextAuthUser {
  id: string
  cargo: string
  isMfaEnabled: boolean
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { 
          label: "Email", 
          type: "email", 
          placeholder: "seu@email.com" 
        },
        password: { 
          label: "Senha", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        try {
          // Validação dos dados de entrada
          const validatedFields = LoginSchema.safeParse(credentials)
          
          if (!validatedFields.success) {
            console.log('Dados de login inválidos:', validatedFields.error.flatten().fieldErrors)
            return null
          }

          const { email, password } = validatedFields.data

          // Busca o usuário no banco de dados
          const usuario = await prisma.usuario.findUnique({
            where: { email },
            select: {
              id: true,
              nome: true,
              email: true,
              senha: true,
              cargo: true,
              isMfaEnabled: true
            }
          })

          if (!usuario) {
            console.log('Usuário não encontrado:', email)
            return null
          }

          // Verifica a senha
          const senhaValida = await verifyPassword(password, usuario.senha)
          
          if (!senhaValida) {
            console.log('Senha incorreta para usuário:', email)
            return null
          }

          // Retorna o usuário autenticado
          return {
            id: usuario.id,
            name: usuario.nome,
            email: usuario.email,
            cargo: usuario.cargo,
            isMfaEnabled: usuario.isMfaEnabled
          } as AppUser

        } catch (error) {
          console.error('Erro durante autenticação:', error)
          return null
        }
      }
    })
  ],
  
  pages: {
    signIn: '/login',
    // Redirecionamento customizado baseado no estado do MFA será tratado no middleware
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Primeira vez que o usuário faz login
      if (user && account) {
        const appUser = user as AppUser
        
        token.id = appUser.id
        token.name = appUser.name
        token.email = appUser.email
        token.cargo = appUser.cargo
        token.isMfaEnabled = appUser.isMfaEnabled
      }

      return token
    },    async session({ session, token }) {
      // Adiciona informações do token à sessão
      if (session.user && token) {
        const sessionUser = session.user as AppUser
        
        sessionUser.id = token.id as string
        sessionUser.cargo = token.cargo as string
        
        // Sempre verificar status MFA atualizado no banco para evitar cache
        try {
          const usuario = await prisma.usuario.findUnique({
            where: { id: token.id as string },
            select: { isMfaEnabled: true }
          })
          
          if (usuario) {
            sessionUser.isMfaEnabled = usuario.isMfaEnabled
            // Atualizar o token também para próximas verificações
            token.isMfaEnabled = usuario.isMfaEnabled
          } else {
            sessionUser.isMfaEnabled = token.isMfaEnabled as boolean
          }
        } catch (error) {
          console.error('Erro ao verificar status MFA na sessão:', error)
          sessionUser.isMfaEnabled = token.isMfaEnabled as boolean
        }
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      // Redirecionamento customizado após login
      // Se o usuário não tem MFA configurado, redireciona para setup
      // Caso contrário, vai para o dashboard apropriado
      
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      } else if (new URL(url).origin === baseUrl) {
        return url
      }
      
      return baseUrl
    }
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas (jornada de trabalho)
  },

  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Função auxiliar para verificar se o usuário tem uma função específica
 */
export function verificarCargo(session: any, cargoRequerido: string | string[]): boolean {
  if (!session?.user?.cargo) {
    return false
  }

  const cargos = Array.isArray(cargoRequerido) ? cargoRequerido : [cargoRequerido]
  return cargos.includes(session.user.cargo) || session.user.cargo === 'admin'
}

/**
 * Função para buscar dados completos do usuário
 */
export async function buscarUsuarioCompleto(id: string) {
  try {
    return await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        isMfaEnabled: true,
        createdAt: true
      }
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
}
