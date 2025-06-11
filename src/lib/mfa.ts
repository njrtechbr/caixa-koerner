import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { randomBytes } from 'crypto'

/**
 * Biblioteca para autenticação de dois fatores (MFA/TOTP)
 * Sistema de Controle de Caixa - Cartório Koerner
 */

export interface MfaSetupData {
  secret: string
  qrCodeDataUrl: string
  backupCodes: string[]
}

/**
 * Gera um novo secret para TOTP
 */
export function generateSecret(): string {
  return authenticator.generateSecret()
}

/**
 * Gera códigos de backup seguros
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Gera 4 bytes (8 caracteres hex) para cada código
    const code = randomBytes(4).toString('hex').toUpperCase()
    // Formata como XXXX-YYYY
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`
    codes.push(formattedCode)
  }
  
  return codes
}

/**
 * Gera QR Code para configuração do TOTP
 */
export async function generateQRCode(
  secret: string,
  email: string,
  issuer: string = 'Cartório Koerner'
): Promise<string> {
  const otpAuthUrl = authenticator.keyuri(email, issuer, secret)
  return await QRCode.toDataURL(otpAuthUrl)
}

/**
 * Verifica um código TOTP
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch (error) {
    console.error('Erro ao verificar TOTP:', error)
    return false
  }
}

/**
 * Configura TOTP para um usuário
 */
export async function setupMFA(email: string): Promise<MfaSetupData> {
  const secret = generateSecret()
  const qrCodeDataUrl = await generateQRCode(secret, email)
  const backupCodes = generateBackupCodes()
  
  return {
    secret,
    qrCodeDataUrl,
    backupCodes
  }
}

/**
 * Verifica se um código é um código de backup válido
 */
export function isBackupCode(code: string): boolean {
  // Códigos de backup seguem o padrão XXXX-YYYY (8 caracteres + hífen)
  const backupCodePattern = /^[A-F0-9]{4}-[A-F0-9]{4}$/
  return backupCodePattern.test(code.toUpperCase())
}

/**
 * Normaliza código de entrada (remove espaços, converte para maiúscula)
 */
export function normalizeCode(code: string): string {
  return code.replace(/\s/g, '').toUpperCase()
}

/**
 * Valida formato de código TOTP (6 dígitos)
 */
export function isValidTOTPFormat(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/**
 * Gera um token de desenvolvimento para testes
 */
export function generateDevToken(secret: string): string {
  return authenticator.generate(secret)
}
