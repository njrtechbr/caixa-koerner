import { PrismaClient } from '../generated/prisma'

/**
 * Instância global do Prisma Client para o Sistema de Controle de Caixa
 * Implementa singleton pattern para evitar múltiplas conexões em desenvolvimento
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

/**
 * Tipos de cargo do sistema
 */
export const CARGOS = {
  OPERADOR_CAIXA: 'operador_caixa',
  SUPERVISOR_CAIXA: 'supervisor_caixa', 
  SUPERVISOR_CONFERENCIA: 'supervisor_conferencia',
  ADMIN: 'admin'
} as const

export type CargoUsuario = typeof CARGOS[keyof typeof CARGOS]

/**
 * Status possíveis do caixa diário
 */
export const STATUS_CAIXA = {
  ABERTO: 'Aberto',
  FECHADO_AGUARDANDO_CONFERENCIA: 'Fechado - Aguardando Conferência',
  EM_CONFERENCIA: 'Em Conferência',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  CONFERENCIA_FINAL: 'Conferência Final'
} as const

export type StatusCaixa = typeof STATUS_CAIXA[keyof typeof STATUS_CAIXA]

/**
 * Tipos de pagamento aceitos
 */
export const TIPOS_PAGAMENTO = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  DEBITO: 'Débito',
  MENSALISTA: 'Mensalista',
  OUTROS: 'Outros'
} as const

export type TipoPagamento = typeof TIPOS_PAGAMENTO[keyof typeof TIPOS_PAGAMENTO]

/**
 * Status das movimentações (sangria, entrada, correção)
 */
export const STATUS_MOVIMENTACAO = {
  PENDENTE: 'pendente',
  APROVADO: 'aprovado',
  REPROVADO: 'reprovado'
} as const

export type StatusMovimentacao = typeof STATUS_MOVIMENTACAO[keyof typeof STATUS_MOVIMENTACAO]

/**
 * Tipos de movimentação de caixa
 */
export const TIPOS_MOVIMENTACAO = {
  ENTRADA: 'entrada',
  SANGRIA: 'sangria'
} as const

export type TipoMovimentacao = typeof TIPOS_MOVIMENTACAO[keyof typeof TIPOS_MOVIMENTACAO]

/**
 * Verifica se um usuário tem permissão para uma determinada ação
 */
export function verificarPermissao(cargo: CargoUsuario, acao: string): boolean {
  const permissoes = {
    [CARGOS.OPERADOR_CAIXA]: [
      'abrir_caixa',
      'fechar_caixa',
      'solicitar_sangria',
      'solicitar_entrada',
      'solicitar_correcao',
      'visualizar_proprio_historico'
    ],
    [CARGOS.SUPERVISOR_CAIXA]: [
      'conferir_caixa',
      'aprovar_caixa',
      'rejeitar_caixa',
      'aprovar_sangria',
      'aprovar_entrada',
      'aprovar_correcao',
      'visualizar_todos_caixas'
    ],
    [CARGOS.SUPERVISOR_CONFERENCIA]: [
      'validacao_final',
      'visualizar_painel_consolidado',
      'gerenciar_configuracoes'
    ],
    [CARGOS.ADMIN]: [
      'gerenciar_usuarios',
      'visualizar_tudo',
      'gerenciar_configuracoes',
      'acesso_total'
    ]
  }

  return permissoes[cargo]?.includes(acao) || cargo === CARGOS.ADMIN
}

/**
 * Busca configuração do sistema
 */
export async function buscarConfiguracao(chave: string): Promise<string | null> {
  try {
    const config = await prisma.configuracaoSistema.findUnique({
      where: { chave }
    })
    return config?.valor || null
  } catch (error) {
    console.error(`Erro ao buscar configuração ${chave}:`, error)
    return null
  }
}

/**
 * Atualiza configuração do sistema
 */
export async function atualizarConfiguracao(chave: string, valor: string): Promise<boolean> {
  try {
    await prisma.configuracaoSistema.upsert({
      where: { chave },
      update: { valor },
      create: { chave, valor }
    })
    return true
  } catch (error) {
    console.error(`Erro ao atualizar configuração ${chave}:`, error)
    return false
  }
}

/**
 * Verifica se a conferência cega está habilitada
 */
export async function isConferenciaCegaHabilitada(): Promise<boolean> {
  const valor = await buscarConfiguracao('conferencia_cega_dinheiro_habilitada')
  return valor === 'true'
}

export default prisma
