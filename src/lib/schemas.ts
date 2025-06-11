import * as z from "zod"
import { CARGOS, TIPOS_PAGAMENTO, TIPOS_MOVIMENTACAO } from './database'

/**
 * Schemas de validação para o Sistema de Controle de Caixa - Cartório Koerner
 * Todas as entradas do usuário devem ser validadas usando estes schemas
 */

// ===== SCHEMAS DE AUTENTICAÇÃO =====

export const LoginSchema = z.object({
  email: z.string()
    .email({ message: "Por favor, insira um email válido." })
    .max(255, { message: "Email muito longo." }),
  password: z.string()
    .min(1, { message: "Senha é obrigatória." })
    .max(255, { message: "Senha muito longa." }),
})

export const MfaSetupSchema = z.object({
  mfaCode: z.string()
    .length(6, { message: "O código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "O código deve conter apenas números." }),
})

export const MfaVerifySchema = z.object({
  mfaCode: z.string()
    .length(6, { message: "O código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "O código deve conter apenas números." }),
})

export const BackupCodeSchema = z.object({
  backupCode: z.string()
    .length(8, { message: "Código de recuperação deve ter 8 caracteres." })
    .regex(/^[A-F0-9]{8}$/, { message: "Formato de código inválido." }),
})

// ===== SCHEMAS DE USUÁRIO =====

export const CriarUsuarioSchema = z.object({
  nome: z.string()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres." })
    .max(255, { message: "Nome muito longo." }),
  email: z.string()
    .email({ message: "Email inválido." })
    .max(255, { message: "Email muito longo." }),
  cargo: z.enum([CARGOS.OPERADOR_CAIXA, CARGOS.SUPERVISOR_CAIXA, CARGOS.SUPERVISOR_CONFERENCIA, CARGOS.ADMIN], {
    errorMap: () => ({ message: "Cargo inválido." })
  }),
  senha: z.string()
    .min(8, { message: "Senha deve ter pelo menos 8 caracteres." })
    .max(255, { message: "Senha muito longa." })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]).*$/, {
      message: "Senha deve conter: maiúscula, minúscula, número e símbolo especial."
    }),
})

export const AtualizarUsuarioSchema = z.object({
  id: z.string().uuid({ message: "ID de usuário inválido." }),
  nome: z.string()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres." })
    .max(255, { message: "Nome muito longo." })
    .optional(),
  email: z.string()
    .email({ message: "Email inválido." })
    .max(255, { message: "Email muito longo." })
    .optional(),
  cargo: z.enum([CARGOS.OPERADOR_CAIXA, CARGOS.SUPERVISOR_CAIXA, CARGOS.SUPERVISOR_CONFERENCIA, CARGOS.ADMIN])
    .optional(),
})

export const AlterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, { message: "Senha atual é obrigatória." }),
  novaSenha: z.string()
    .min(8, { message: "Nova senha deve ter pelo menos 8 caracteres." })
    .max(255, { message: "Nova senha muito longa." })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]).*$/, {
      message: "Nova senha deve conter: maiúscula, minúscula, número e símbolo especial."
    }),
  confirmarSenha: z.string(),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "Confirmação de senha não confere.",
  path: ["confirmarSenha"],
})

// ===== SCHEMAS DE CAIXA =====

export const AbrirCaixaSchema = z.object({
  valorInicial: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^\d,-]/g, '').replace(',', '.')
        return parseFloat(cleaned)
      }
      return val
    },
    z.number({ invalid_type_error: "Valor inicial inválido." })
      .min(0, { message: "Valor inicial não pode ser negativo." })
      .max(999999.99, { message: "Valor inicial muito alto." })
  ),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

export const FecharCaixaSchema = z.object({
  transacoes: z.array(z.object({
    tipoPagamento: z.enum([
      TIPOS_PAGAMENTO.DINHEIRO, 
      TIPOS_PAGAMENTO.PIX, 
      TIPOS_PAGAMENTO.DEBITO, 
      TIPOS_PAGAMENTO.MENSALISTA, 
      TIPOS_PAGAMENTO.OUTROS
    ]),
    valor: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          const cleaned = val.replace(/[^\d,-]/g, '').replace(',', '.')
          return parseFloat(cleaned)
        }
        return val
      },
      z.number({ invalid_type_error: "Valor inválido." })
        .min(0, { message: "Valor não pode ser negativo." })
        .max(999999.99, { message: "Valor muito alto." })
    ),
  })).min(1, { message: "Pelo menos uma transação é obrigatória." }),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

// ===== SCHEMAS DE CONFERÊNCIA =====

export const ConferenciaCaixaSchema = z.object({
  caixaId: z.string().uuid({ message: "ID do caixa inválido." }),
  aprovado: z.boolean(),
  valorDinheiroContado: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^\d,-]/g, '').replace(',', '.')
        return parseFloat(cleaned)
      }
      return val
    },
    z.number({ invalid_type_error: "Valor contado inválido." })
      .min(0, { message: "Valor contado não pode ser negativo." })
      .max(999999.99, { message: "Valor contado muito alto." })
  ).optional(),
  motivoRejeicao: z.string()
    .max(500, { message: "Motivo da rejeição muito longo." })
    .optional(),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

export const ValidacaoFinalSchema = z.object({
  dataConferencia: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida. Use formato YYYY-MM-DD." }),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

// ===== SCHEMAS DE MOVIMENTAÇÃO =====

export const SolicitarMovimentacaoSchema = z.object({
  caixaId: z.string().uuid({ message: "ID do caixa inválido." }),
  tipo: z.enum([TIPOS_MOVIMENTACAO.ENTRADA, TIPOS_MOVIMENTACAO.SANGRIA], {
    errorMap: () => ({ message: "Tipo de movimentação inválido." })
  }),
  valor: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^\d,-]/g, '').replace(',', '.')
        return parseFloat(cleaned)
      }
      return val
    },
    z.number({ invalid_type_error: "Valor inválido." })
      .min(0.01, { message: "Valor deve ser maior que zero." })
      .max(999999.99, { message: "Valor muito alto." })
  ),
  descricao: z.string()
    .min(5, { message: "Descrição deve ter pelo menos 5 caracteres." })
    .max(500, { message: "Descrição muito longa." }),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

export const AprovarMovimentacaoSchema = z.object({
  movimentacaoId: z.string().uuid({ message: "ID da movimentação inválido." }),
  aprovado: z.boolean(),
  motivoRejeicao: z.string()
    .max(500, { message: "Motivo da rejeição muito longo." })
    .optional(),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

// ===== SCHEMAS DE CORREÇÃO =====

export const SolicitarCorrecaoSchema = z.object({
  caixaId: z.string().uuid({ message: "ID do caixa inválido." }),
  campoCorrigir: z.string()
    .min(1, { message: "Campo a corrigir é obrigatório." })
    .max(100, { message: "Nome do campo muito longo." }),
  valorAntigo: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^\d,-]/g, '').replace(',', '.')
        return parseFloat(cleaned)
      }
      return val
    },
    z.number({ invalid_type_error: "Valor antigo inválido." })
      .min(0, { message: "Valor antigo não pode ser negativo." })
      .max(999999.99, { message: "Valor antigo muito alto." })
  ),
  valorNovo: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^\d,-]/g, '').replace(',', '.')
        return parseFloat(cleaned)
      }
      return val
    },
    z.number({ invalid_type_error: "Valor novo inválido." })
      .min(0, { message: "Valor novo não pode ser negativo." })
      .max(999999.99, { message: "Valor novo muito alto." })
  ),
  motivo: z.string()
    .min(10, { message: "Motivo deve ter pelo menos 10 caracteres." })
    .max(500, { message: "Motivo muito longo." }),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

export const AprovarCorrecaoSchema = z.object({
  correcaoId: z.string().uuid({ message: "ID da correção inválido." }),
  aprovado: z.boolean(),
  motivoRejeicao: z.string()
    .max(500, { message: "Motivo da rejeição muito longo." })
    .optional(),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

// ===== SCHEMAS DE CONFIGURAÇÃO =====

export const ConfiguracaoSistemaSchema = z.object({
  conferenciaCegaDinheiroHabilitada: z.boolean(),
  // Adicione outras configurações conforme necessário
})

export const SystemSettingsSchema = z.object({
  conferencia_cega_dinheiro_habilitada: z.boolean({
    required_error: "Configuração de conferência cega é obrigatória.",
  }),
  // Adicione outras configurações do sistema conforme necessário
})

export const AtualizarConfiguracaoSchema = z.object({
  chave: z.string()
    .min(1, { message: "Chave da configuração é obrigatória." })
    .max(100, { message: "Chave muito longa." }),
  valor: z.string()
    .min(1, { message: "Valor da configuração é obrigatório." })
    .max(255, { message: "Valor muito longo." }),
  mfaCode: z.string()
    .length(6, { message: "Código MFA deve ter 6 dígitos." })
    .regex(/^\d{6}$/, { message: "Código MFA deve conter apenas números." }),
})

// ===== TYPES EXPORTADOS =====

export type LoginFormData = z.infer<typeof LoginSchema>
export type MfaSetupFormData = z.infer<typeof MfaSetupSchema>
export type MfaVerifyFormData = z.infer<typeof MfaVerifySchema>
export type CriarUsuarioFormData = z.infer<typeof CriarUsuarioSchema>
export type AbrirCaixaFormData = z.infer<typeof AbrirCaixaSchema>
export type FecharCaixaFormData = z.infer<typeof FecharCaixaSchema>
export type ConferenciaCaixaFormData = z.infer<typeof ConferenciaCaixaSchema>
export type SolicitarMovimentacaoFormData = z.infer<typeof SolicitarMovimentacaoSchema>
export type SolicitarCorrecaoFormData = z.infer<typeof SolicitarCorrecaoSchema>
export type SystemSettingsFormData = z.infer<typeof SystemSettingsSchema>
