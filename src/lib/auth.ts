// AI-NOTE: Módulo de autenticação principal da aplicação.
// Este arquivo configura o NextAuth.js, definindo provedores de autenticação, callbacks,
// gerenciamento de sessão, e integração com o Prisma adapter para persistência de dados.
// É crucial para a segurança e funcionamento do sistema de login e controle de acesso.

import NextAuth, { NextAuthOptions, User as NextAuthUser, Session, Profile } from "next-auth";
// AI-NOTE: Adapter para integrar o NextAuth com o Prisma ORM.
// Permite que o NextAuth armazene dados de usuários, sessões, contas, etc., no banco de dados via Prisma.
import { PrismaAdapter } from "@next-auth/prisma-adapter";
// AI-NOTE: Provedor de autenticação de Credenciais.
// Permite o login tradicional com email/senha ou outros identificadores.
import CredentialsProvider from "next-auth/providers/credentials";
// AI-NOTE: Cliente Prisma para interagir com o banco de dados.
import prisma from "./database";
// AI-NOTE: Funções de utilidade para MFA (Multi-Factor Authentication).
import { verifyOtp } from "./mfa";
// AI-NOTE: Funções de utilidade para hashing e verificação de senhas.
import { verifyPassword } from "./security";
// AI-NOTE: Configurações de navegação, potencialmente usadas para redirects.
import { navLinks } from "@/config/nav";

// AI-NOTE: Extensão da interface User do NextAuth para incluir propriedades personalizadas.
// Adiciona 'role' e 'mfaEnabled' ao objeto User padrão do NextAuth.
interface ExtendedUser extends NextAuthUser {
  role?: string | null;
  mfaEnabled?: boolean | null;
}

// AI-NOTE: Opções de configuração para o NextAuth.js.
// Define como o NextAuth deve se comportar, quais provedores usar, como gerenciar sessões, etc.
export const authOptions: NextAuthOptions = {
  // AI-NOTE: Adaptador Prisma para persistir dados de autenticação.
  adapter: PrismaAdapter(prisma),
  // AI-NOTE: Lista de provedores de autenticação. Aqui, apenas CredentialsProvider está configurado.
  providers: [
    CredentialsProvider({
      // AI-NOTE: Nome do provedor, usado na UI de login se gerada automaticamente.
      name: "Credentials",
      // AI-NOTE: Objeto 'credentials' define os campos que o formulário de login deve ter.
      credentials: {
        email: { label: "Email", type: "email", placeholder: "seuemail@exemplo.com" },
        password: { label: "Senha", type: "password" },
        mfaCode: { label: "Código MFA", type: "text" }, // AI-NOTE: Campo para o código MFA.
      },
      // AI-NOTE: Função 'authorize' é o coração do CredentialsProvider.
      // É chamada quando o usuário tenta fazer login com credenciais.
      // Valida as credenciais e retorna o objeto do usuário se for bem-sucedido, ou null/false caso contrário.
      async authorize(credentials, req) {
        // AI-NOTE: Validação básica para garantir que email e senha foram fornecidos.
        if (!credentials?.email || !credentials?.password) {
          console.log("Credenciais incompletas recebidas:", credentials);
          throw new Error("Credenciais inválidas: Email e senha são obrigatórios.");
        }

        // AI-NOTE: Busca o usuário no banco de dados pelo email fornecido.
        // Seleciona explicitamente os campos necessários para evitar buscar dados desnecessários.
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            hashedPassword: true,
            role: true,
            mfaEnabled: true,
            mfaSecret: true
          }
        });

        // AI-NOTE: Verifica se o usuário existe e se a senha fornecida corresponde à senha hashada no banco.
        if (user && user.hashedPassword && (await verifyPassword(credentials.password, user.hashedPassword))) {
          console.log(`Usuário ${user.email} encontrado, senha verificada.`);

          // AI-NOTE: Lógica de verificação de MFA (Multi-Factor Authentication).
          if (user.mfaEnabled) {
            console.log(`MFA habilitado para ${user.email}. Verificando código...`);
            // Se MFA estiver habilitado, o mfaCode é obrigatório.
            if (!credentials.mfaCode) {
              console.log("Código MFA não fornecido para usuário com MFA habilitado.");
              // AI-NOTE: Lançar um erro específico para o frontend tratar e solicitar o código MFA.
              // O objeto de erro pode incluir um código para o frontend identificar a necessidade de MFA.
              throw new Error(JSON.stringify({ error: "mfa_required", message: "Código MFA é obrigatório." }));
            }
            // AI-NOTE: Verifica o código OTP (One-Time Password) fornecido.
            const isMfaValid = await verifyOtp(user.mfaSecret ?? "", credentials.mfaCode);
            if (!isMfaValid) {
              console.log(`Código MFA inválido para ${user.email}.`);
              throw new Error("Código MFA inválido.");
            }
            console.log(`Código MFA verificado com sucesso para ${user.email}.`);
          } else {
            console.log(`MFA não habilitado para ${user.email}. Pulando verificação de código.`);
          }

          // AI-NOTE: Se a autenticação for bem-sucedida (incluindo MFA, se aplicável),
          // retorna um objeto com os dados do usuário que serão armazenados no token JWT e na sessão.
          // Importante: NÃO retorne a senha hashada ou o segredo MFA aqui.
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mfaEnabled: user.mfaEnabled,
          } as ExtendedUser; // AI-NOTE: Cast para ExtendedUser para incluir 'role' e 'mfaEnabled'.
        } else {
          // Se o usuário não for encontrado ou a senha não corresponder.
          console.log(`Falha na autenticação para: ${credentials.email}. Usuário não encontrado ou senha inválida.`);
          return null; // Retorna null para indicar falha na autenticação.
        }
      },
    }),
  ],
  // AI-NOTE: Configurações da sessão.
  session: {
    // AI-NOTE: Estratégia de sessão 'jwt' (JSON Web Tokens).
    // Indica que as sessões serão gerenciadas via JWTs, o que é recomendado para escalabilidade e segurança.
    strategy: "jwt",
    // maxAge: 30 * 24 * 60 * 60, // 30 days AI-NOTE: Opcional: Define o tempo máximo de vida da sessão.
  },
  // AI-NOTE: Callbacks são funções assíncronas que permitem controlar o que acontece em diferentes estágios do processo de autenticação.
  callbacks: {
    // AI-NOTE: Callback 'jwt' é chamado sempre que um JWT é criado (ex: no login) ou atualizado (ex: ao acessar a sessão).
    // O token retornado aqui será criptografado e armazenado em um cookie.
    async jwt({ token, user, account, profile, trigger, session }) {
      // AI-NOTE: 'user' está presente apenas no primeiro login após a autenticação bem-sucedida.
      if (user) {
        const extendedUser = user as ExtendedUser; // Cast para o tipo estendido.
        // AI-NOTE: Adiciona 'id', 'role' e 'mfaEnabled' ao token JWT.
        // Estes dados estarão disponíveis em qualquer lugar onde o token for decodificado (ex: no callback 'session' ou em middleware).
        token.id = extendedUser.id;
        token.role = extendedUser.role;
        token.mfaEnabled = extendedUser.mfaEnabled;
        // token.picture = user.image; // AI-NOTE: Se houver imagem do usuário, pode ser adicionada aqui.
      }

      // AI-NOTE: Lógica para lidar com atualização da sessão (ex: se o usuário atualizar seu perfil).
      // O 'trigger === "update"' ocorre quando a função `update()` da sessão é chamada no lado do cliente.
      if (trigger === "update" && session) {
        console.log("JWT callback: trigger 'update'", session);
        // AI-NOTE: Atualiza o token com os novos dados da sessão, se necessário.
        // Exemplo: se 'name' ou 'mfaEnabled' puderem ser atualizados via `useSession().update()`.
        if (session.name) {
          token.name = session.name;
        }
        if (session.mfaEnabled !== undefined) { // Verifica explicitamente por undefined, pois pode ser false.
            token.mfaEnabled = session.mfaEnabled;
        }
        // Adicionar outros campos que podem ser atualizados na sessão.
      }
      return token; // Retorna o token (possivelmente modificado).
    },
    // AI-NOTE: Callback 'session' é chamado sempre que uma sessão é acessada (ex: via `useSession` ou `getSession`).
    // O token JWT decodificado é passado como parâmetro.
    // O objeto retornado aqui será o que o cliente receberá como dados da sessão.
    async session({ session, token, user: sessionUser }) {
      // AI-NOTE: 'token' contém os dados que foram colocados no JWT pelo callback 'jwt'.
      // Atribui 'id', 'role' e 'mfaEnabled' do token para o objeto 'session.user'.
      // Isso torna esses dados acessíveis no frontend através do hook `useSession`.
      if (token && session.user) {
        const extendedSessionUser = session.user as ExtendedUser; // Cast para o tipo estendido.
        extendedSessionUser.id = token.id as string;
        extendedSessionUser.role = token.role as string | undefined;
        extendedSessionUser.mfaEnabled = token.mfaEnabled as boolean | undefined;
      }
      // console.log("Session callback, final session object:", session); // AI-NOTE: Log para depuração da sessão.
      return session; // Retorna o objeto da sessão modificado.
    },
  },
  // AI-NOTE: URLs para páginas personalizadas de autenticação.
  // Se não especificadas, o NextAuth usará suas páginas padrão.
  pages: {
    signIn: "/login", // Página de login personalizada.
    // signOut: '/auth/signout',
    // error: '/auth/error', // Página para exibir erros de autenticação (ex: falha no login).
    // verifyRequest: '/auth/verify-request', // Página para verificar email (para provedores de Email).
    // newUser: '/auth/new-user' // Página para novos usuários (pode ser um formulário de registro ou boas-vindas).
  },
  // AI-NOTE: Configurações de depuração. Útil em desenvolvimento, deve ser desabilitado em produção.
  debug: process.env.NODE_ENV === "development",
  // AI-NOTE: Segredo usado para assinar e criptografar JWTs e cookies.
  // Deve ser uma string longa e aleatória, armazenada em variáveis de ambiente.
  secret: process.env.NEXTAUTH_SECRET,
};

// AI-NOTE: Exporta o manipulador NextAuth configurado.
// Este manipulador é usado em uma rota de API (ex: '/api/auth/[...nextauth].ts') para lidar com todas as requisições de autenticação.
export default NextAuth(authOptions);
