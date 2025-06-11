import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { verifyTOTP, isValidTOTPFormat, isBackupCode, normalizeCode } from './mfa'

/**
 * Utilitários de segurança e criptografia para o Sistema de Controle de Caixa
 * Seguindo as especificações de segurança do documento de requisitos
 */

// Chave de criptografia - deve ser definida nas variáveis de ambiente
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-change-in-production-32chars'

/**
 * Criptografa dados sensíveis usando AES-256-CBC
 * Utilizado principalmente para segredos MFA
 */
export function encryptData(text: string): string {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Retorna IV + dados criptografados separados por ':'
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Erro ao criptografar dados:', error)
    throw new Error('Falha na criptografia')
  }
}

/**
 * Descriptografa dados previamente criptografados
 */
export function decryptData(encryptedData: string): string {
  try {
    const [ivHex, encrypted] = encryptedData.split(':')
    if (!ivHex || !encrypted) {
      throw new Error('Formato de dados criptografados inválido')
    }
    
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error)
    throw new Error('Falha na descriptografia')
  }
}

/**
 * Gera hash seguro para senhas usando bcrypt
 * Rounds = 12 para equilibrar segurança e performance
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 12)
  } catch (error) {
    console.error('Erro ao gerar hash da senha:', error)
    throw new Error('Falha ao processar senha')
  }
}

/**
 * Verifica se uma senha corresponde ao hash armazenado
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Erro ao verificar senha:', error)
    return false
  }
}

/**
 * Gera códigos de recuperação para MFA
 * Retorna array de códigos de uso único
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Gera código de 8 caracteres alfanuméricos
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * Gera hash para códigos de recuperação
 */
export async function hashBackupCode(code: string): Promise<string> {
  return hashPassword(code)
}

/**
 * Verifica código de recuperação
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return verifyPassword(code, hash)
}

/**
 * Gera segredo para TOTP (Time-based One-Time Password)
 * Usado para configuração inicial do MFA
 */
export function generateTOTPSecret(): string {
  // Gera segredo de 32 bytes em base32
  const secret = crypto.randomBytes(32).toString('base64')
  return secret.replace(/[^A-Z2-7]/gi, '').substring(0, 32)
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida força da senha
 * Requisitos: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 símbolo
 */
export function isValidPassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    errors.push('Senha deve conter pelo menos um símbolo especial')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitiza entrada de dados para prevenir XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Gera token seguro para sessões ou operações especiais
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Verifica se um valor monetário é válido
 */
export function isValidMonetaryValue(value: string | number): boolean {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return !isNaN(numValue) && isFinite(numValue) && numValue >= 0
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Converte valor monetário string para número
 */
export function parseCurrency(value: string): number {
  // Remove formatação e converte para número
  const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

/**
 * Verifica código MFA (TOTP ou código de backup)
 */
export async function verifyMFACode(
  code: string, 
  secret: string, 
  backupCodes?: string[]
): Promise<{ isValid: boolean, isBackupCode: boolean }> {
  const normalizedCode = normalizeCode(code)
  
  // Primeiro, tenta verificar como código TOTP
  if (isValidTOTPFormat(normalizedCode)) {
    const isValidTOTP = verifyTOTP(normalizedCode, secret)
    if (isValidTOTP) {
      return { isValid: true, isBackupCode: false }
    }
  }
  
  // Se não é TOTP válido, verifica se é código de backup
  if (isBackupCode(normalizedCode) && backupCodes) {
    for (const backupCodeHash of backupCodes) {
      const isValidBackup = await verifyBackupCode(normalizedCode, backupCodeHash)
      if (isValidBackup) {
        return { isValid: true, isBackupCode: true }
      }
    }
  }
  
  return { isValid: false, isBackupCode: false }
}

/**
 * Valida código MFA antes da verificação completa
 */
export function validateMFACodeFormat(code: string): boolean {
  const normalized = normalizeCode(code)
  return isValidTOTPFormat(normalized) || isBackupCode(normalized)
}
