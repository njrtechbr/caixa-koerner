/**
 * Utilitário para bypass de desenvolvimento
 * Simula uma sessão de usuário quando em modo de desenvolvimento
 */

interface MockUser {
  id: string;
  nome: string;
  email: string;
  cargo: 'operador_caixa' | 'supervisor_caixa' | 'supervisor_conferencia' | 'admin';
  isMfaEnabled: boolean;
}

interface MockSession {
  user: MockUser;
  expires: string;
}

export function getDevBypassSession(): MockSession | null {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    return null;
  }
    // Sessão mockada para desenvolvimento - admin com acesso total
  return {
    user: {
      id: 'dev-user-admin',
      nome: 'Administrador Desenvolvimento',
      email: 'admin@dev.local',
      cargo: 'admin',
      isMfaEnabled: true
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
  };
}

export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}
