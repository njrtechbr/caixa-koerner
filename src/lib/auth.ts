import type { NextAuthOptions, User as NextAuthUser } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './database'
import { verifyPassword } from './security'
import { LoginSchema } from './schemas'

/**
 * Configuração de autenticação NextAuth.js para o Sistema de Controle de Caixa.
 * Utiliza o CredentialsProvider para autenticação baseada em email e senha,
 * integrado com o banco de dados PostgreSQL via Prisma.
 * Inclui gerenciamento de sessão JWT e callbacks para enriquecer o token e a sessão com dados customizados.
 */

// Estende o tipo User padrão do NextAuth para incluir campos específicos da aplicação,
// como `id` do usuário no banco, `cargo` e status do MFA (`isMfaEnabled`).
interface AppUser extends NextAuthUser {
  id: string; // ID do usuário no banco de dados
  cargo: string; // Cargo do usuário (ex: 'operador_caixa', 'admin')
  isMfaEnabled: boolean
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "seu@email.com" },
        password: { label: "Senha", type: "password" }
      },
      // Função principal de autorização. Chamada ao tentar fazer login com credenciais.
      async authorize(credentials) {
        try {
          // 1. Valida os campos de email e senha usando o Zod schema 'LoginSchema'.
          const validatedFields = LoginSchema.safeParse(credentials);
          
          if (!validatedFields.success) {
            // Loga os erros de validação e retorna null se inválido.
            console.log('Dados de login inválidos (schema):', validatedFields.error.flatten().fieldErrors);
            return null
          }

          const { email, password } = validatedFields.data;

          // 2. Busca o usuário no banco de dados pelo email fornecido.
          const usuario = await prisma.usuario.findUnique({
            where: { email },
            select: { // Seleciona apenas os campos necessários.
              id: true,
              nome: true,
              email: true,
              senha: true,
              cargo: true,
              isMfaEnabled: true
            }
          });

          if (!usuario) {
            console.log('Usuário não encontrado no banco:', email);
            return null; // Usuário não existe.
          }

          // 3. Verifica se a senha fornecida corresponde à senha hashada no banco.
          const senhaValida = await verifyPassword(password, usuario.senha);
          
          if (!senhaValida) {
            console.log('Senha incorreta para usuário:', email);
            return null; // Senha incorreta.
          }

          // 4. Se tudo estiver correto, retorna o objeto do usuário para o NextAuth.
          // Este objeto será usado para popular o token JWT.
          return {
            id: usuario.id, // ID do banco de dados
            name: usuario.nome, // Nome do usuário
            email: usuario.email,
            cargo: usuario.cargo,
            isMfaEnabled: usuario.isMfaEnabled
          } as AppUser

        } catch (error) {
          console.error('Erro durante autenticação para o email:', credentials?.email, error)
          return null
        }
      }
    })
  ],
  
  pages: {
    signIn: '/login', // Rota para a página de login customizada.
    // Outras páginas como signOut, error, verifyRequest podem ser customizadas aqui.
    // O redirecionamento para setup de MFA é tratado no middleware.
  },

  callbacks: {
    // Callback para manipulação do token JWT.
    // Chamado sempre que um JWT é criado (login) ou atualizado (acesso à sessão).
    async jwt({ token, user, account }) {
      // Na primeira vez que o usuário faz login (quando `user` e `account` estão presentes),
      // adiciona os campos customizados do `AppUser` (retornado por `authorize`) ao token.
      if (user && account) { // `account` informa o provedor usado (ex: 'credentials')
        const appUser = user as AppUser; // Cast para o tipo estendido `AppUser`.
        
        token.id = appUser.id;
        token.name = appUser.name;
        token.email = appUser.email;
        token.cargo = appUser.cargo;
        token.isMfaEnabled = appUser.isMfaEnabled;
      }
      // O token JWT resultante é retornado e armazenado no cookie.
      return token;
    },
    // Callback para manipulação do objeto de sessão.
    // Chamado sempre que uma sessão é verificada (ex: `useSession`, `getSession`).
    async session({ session, token }) {
      // Adiciona as informações do token (que contém os dados customizados) ao objeto `session.user`.
      // Isso torna os dados customizados (id, cargo, isMfaEnabled) disponíveis no lado do cliente via `useSession`.
      if (session.user && token) {
        const sessionUser = session.user as AppUser; // Cast para `AppUser` para tipagem correta.
        
        sessionUser.id = token.id as string;
        sessionUser.cargo = token.cargo as string;
        
        // Busca o status mais recente do MFA diretamente do banco de dados.
        // Isso é crucial para garantir que a sessão reflita o estado real do MFA,
        // evitando problemas de cache se o usuário habilitar/desabilitar MFA em outra aba/dispositivo.
        try {
          const usuarioDB = await prisma.usuario.findUnique({
            where: { id: token.id as string },
            select: { isMfaEnabled: true } // Seleciona apenas o campo necessário.
          });
          
          if (usuarioDB) {
            sessionUser.isMfaEnabled = usuarioDB.isMfaEnabled;
            // Atualiza o token também, para que futuras chamadas a `jwt` ou `session` (se o token for persistido)
            // tenham o valor mais recente sem nova consulta ao DB, embora esta consulta seja leve.
            token.isMfaEnabled = usuarioDB.isMfaEnabled;
          } else {
            // Se o usuário não for encontrado no DB (caso raro, pode indicar um problema),
            // mantém o valor do token como fallback.
            sessionUser.isMfaEnabled = token.isMfaEnabled as boolean;
          }
        } catch (error) {
          console.error('Erro ao buscar status MFA atualizado na sessão:', error);
          // Em caso de erro ao buscar no DB, usa o valor do token como fallback.
          sessionUser.isMfaEnabled = token.isMfaEnabled as boolean;
        }
      }
      // Retorna o objeto de sessão modificado.
      return session;
    },

    // Callback de redirecionamento.
    // Controla para onde o usuário é redirecionado após certas ações (ex: login, signOut).
    async redirect({ url, baseUrl }) {
      // Se a URL de redirecionamento é relativa (começa com '/'), prefixa com baseUrl.
      // Isso garante que o redirecionamento ocorra dentro da aplicação.
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Se a URL já é absoluta e pertence à mesma origem da aplicação, permite o redirecionamento.
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Para qualquer outra URL externa, redireciona para a baseUrl (página inicial ou dashboard).
      // Isso previne redirecionamentos para sites externos maliciosos (Open Redirect vulnerability).
      // A lógica de redirecionamento específica (ex: para setup de MFA ou dashboards por cargo)
      // é primariamente tratada no middleware.
      return baseUrl;
    }
  },

  session: {
    strategy: 'jwt', // Define a estratégia de sessão como JWT (JSON Web Tokens).
    maxAge: 8 * 60 * 60, // Define o tempo máximo de vida da sessão em segundos (8 horas).
                         // Equivalente a uma jornada de trabalho típica.
  },

  // Segredo usado para assinar os JWTs e outras operações criptográficas.
  // DEVE ser definido na variável de ambiente `NEXTAUTH_SECRET`.
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Função auxiliar para verificar se o usuário logado (representado pela sessão)
 * possui um cargo específico ou um conjunto de cargos permitidos.
 * Útil para controle de acesso em componentes de UI ou lógica de API.
 * @param session Objeto da sessão do NextAuth.
 * @param cargoRequerido Cargo (string) ou lista de cargos (string[]) requeridos.
 * @returns `true` se o usuário tiver o cargo requerido ou for admin, `false` caso contrário.
 */
export function verificarCargo(session: any, cargoRequerido: string | string[]): boolean {
  // Verifica se a sessão e o cargo do usuário existem.
  if (!session?.user?.cargo) {
    return false;
  }

  const cargosPermitidos = Array.isArray(cargoRequerido) ? cargoRequerido : [cargoRequerido];
  // Permite o acesso se o cargo do usuário estiver na lista de cargos permitidos,
  // ou se o usuário for 'admin' (admin tem acesso a tudo, por convenção neste sistema).
  return cargosPermitidos.includes(session.user.cargo) || session.user.cargo === 'admin';
}

/**
 * Busca dados completos de um usuário pelo ID.
 * Usado para obter informações detalhadas do usuário quando necessário.
 * @param id O ID do usuário a ser buscado.
 * @returns Objeto do usuário com campos selecionados ou `null` se não encontrado ou em caso de erro.
 */
export async function buscarUsuarioCompleto(id: string) {
  try {
    return await prisma.usuario.findUnique({
      where: { id },
      select: { // Seleciona campos específicos para evitar expor dados sensíveis desnecessariamente (como senha).
        id: true,
        nome: true,
        email: true,
        cargo: true,
        isMfaEnabled: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar dados completos do usuário:', error);
    return null; // Retorna null em caso de erro para tratamento pelo chamador.
  }
}
