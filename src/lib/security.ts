import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { verifyTOTP, isValidTOTPFormat, isBackupCode, normalizeCode } from './mfa'

/**
 * Utilitários de segurança e criptografia para o Sistema de Controle de Caixa.
 * Implementa funções para hashing de senhas, criptografia de dados sensíveis (como segredos MFA),
 * geração de códigos de backup, e outras funcionalidades de segurança.
 * É crucial que `ENCRYPTION_KEY` seja configurada de forma segura no ambiente de produção.
 */

// Chave de criptografia principal - DEVE ser definida nas variáveis de ambiente em produção.
// Esta chave é usada para derivar chaves de criptografia para dados sensíveis.
// Exemplo de como gerar uma chave segura: `openssl rand -hex 32`
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-change-in-production-32chars' // Chave padrão APENAS para desenvolvimento.

// ###################################################################################
// IMPORTANT: Data Migration for Existing MFA Secrets
//
// The encryption functions below have been updated (as of YYYY-MM-DD)
// to use a unique random salt per encrypted item, stored alongside the IV and ciphertext.
// Previously, a static salt ('salt') was used in scryptSync for key derivation.
//
// EXISTING MFA SECRETS IN THE DATABASE that were encrypted with the old method
// WILL NOT BE DECRYPTABLE by the updated `decryptData` function.
//
// A migration strategy is required for these existing secrets:
// 1. Option 1 (Recommended for Security): Force users with existing MFA to re-setup
//    MFA. This ensures all secrets are encrypted with the new, more secure method.
//    This would involve:
//      a. Identifying users with `mfaSecret` encrypted with the old method.
//      b. Clearing their `mfaSecret` and `isMfaEnabled` flags.
//      c. Notifying them to set up MFA again.
// 2. Option 2 (Complex, Less Secure): Implement a background re-encryption job.
//    This would involve:
//      a. Temporarily keeping the old `decryptDataStaticSalt` function.
//      b. Reading each old secret, decrypting it with `decryptDataStaticSalt`.
//      c. Re-encrypting it with the new `encryptData` function.
//      d. Updating the database entry. This must be done carefully to avoid data loss.
//    This approach is more complex and carries risks if not implemented perfectly.
//
// New MFA setups will automatically use the updated, more secure encryption.
// ###################################################################################

/**
 * Criptografa dados sensíveis (ex: segredos MFA) usando AES-256-CBC.
 * Utiliza um salt aleatório único para cada operação de criptografia para derivar a chave de criptografia via scrypt,
 * e um IV (vetor de inicialização) aleatório único para cada cifragem.
 * O formato de saída é "salt_hex:iv_hex:ciphertext_hex".
 * @param text O texto plano a ser criptografado.
 * @returns String concatenada contendo salt, IV e texto cifrado, todos em formato hexadecimal.
 */
export function encryptData(text: string): string {
  try {
    const salt = crypto.randomBytes(16) // Salt aleatório para derivação da chave (16 bytes).
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32) // Deriva uma chave de 32 bytes (256 bits) usando scrypt.
    const iv = crypto.randomBytes(16) // IV aleatório para AES-CBC (16 bytes).
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Erro ao criptografar dados:', error)
    throw new Error('Falha na criptografia')
  }
}

/**
 * Descriptografa dados previamente criptografados com `encryptData`.
 * Espera o formato "salt_hex:iv_hex:ciphertext_hex".
 * @param encryptedText A string criptografada contendo salt, IV e texto cifrado.
 * @returns O texto plano original descriptografado.
 * @throws Error se o formato for inválido, se salt/IV tiverem comprimento incorreto, ou se a descriptografia falhar (ex: chave incorreta, dados corrompidos).
 */
export function decryptData(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de dados criptografados inválido. Esperado: "salt:iv:ciphertext".');
    }
    
    const [saltHex, ivHex, encryptedHex] = parts;
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    if (salt.length !== 16) {
        throw new Error('Comprimento inválido para o salt. Esperado: 16 bytes.');
    }
    if (iv.length !== 16) {
        throw new Error('Comprimento inválido para o IV. Esperado: 16 bytes.');
    }
    
    // Deriva a chave usando o mesmo ENCRYPTION_KEY e o salt extraído.
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted); // Processa o buffer criptografado.
    decrypted = Buffer.concat([decrypted, decipher.final()]); // Concatena o restante.

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    // Relança o erro para ser tratado pelo chamador, ou lança um erro mais específico.
    // Evita vazar detalhes internos da falha, mas permite depuração via logs.
    if (error instanceof Error &&
        (error.message.startsWith('Formato de dados criptografados inválido') ||
         error.message.startsWith('Comprimento inválido para o salt') ||
         error.message.startsWith('Comprimento inválido para o IV'))) {
      throw error; // Propaga erros de formato/comprimento específicos.
    }
    // Para outros erros (ex: 'bad decrypt' do OpenSSL, que pode indicar chave errada ou dados corrompidos).
    throw new Error('Falha na descriptografia. Verifique a chave de criptografia ou os dados podem estar corrompidos.');
  }
}

// /**
//  * Descriptografa dados previamente criptografados (MÉTODO ANTIGO com salt estático)
//  * MANTENHA APENAS SE NECESSÁRIO PARA MIGRAÇÃO DE DADOS.
//  */
// function decryptDataStaticSalt(encryptedData: string): string {
//   try {
//     const [ivHex, encrypted] = encryptedData.split(':')
//     if (!ivHex || !encrypted) {
//       throw new Error('Formato de dados criptografados (antigo) inválido')
//     }

//     const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32) // Static salt 'salt'
//     const iv = Buffer.from(ivHex, 'hex')
//     const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

//     let decrypted = decipher.update(encrypted, 'hex', 'utf8')
//     decrypted += decipher.final('utf8')

//     return decrypted
//   } catch (error) {
//     console.error('Erro ao descriptografar dados (método antigo):', error)
//     throw new Error('Falha na descriptografia (método antigo)')
//   }
// }


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
    return false // Return false on error to prevent login on bcrypt failure
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
  // Reusing hashPassword for backup codes as they also need strong hashing
  return hashPassword(code)
}

/**
 * Verifica código de recuperação
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  // Reusing verifyPassword for backup codes
  return verifyPassword(code, hash)
}

/**
 * Gera segredo para TOTP (Time-based One-Time Password).
 * Este segredo é o que o usuário armazena em seu aplicativo autenticador.
 * @returns Um segredo criptograficamente aleatório, geralmente codificado em Base32 para fácil uso em URIs otpauth.
 */
export function generateTOTPSecret(): string {
  // NIST SP 800-63B recomenda segredos de pelo menos 128 bits (16 bytes).
  // Para Base32, 20 bytes (160 bits) é comum e fornece um bom equilíbrio.
  const secretBytes = crypto.randomBytes(20);

  // IMPORTANTE: A codificação Base32 é o padrão para segredos TOTP em URIs `otpauth://`.
  // Node.js não possui um codificador Base32 nativo no módulo `crypto`.
  // Uma biblioteca como `thirty-two` ou `base32.js` seria usada em um cenário real.
  // Exemplo com `thirty-two`: `import * as base32 from 'thirty-two'; return base32.encode(secretBytes).toString().replace(/=/g, '');`
  // Como placeholder, retornaremos em hexadecimal, mas isso NÃO é o padrão para QR codes TOTP.
  // A lógica de geração de QR Code precisará converter este segredo para Base32 se usar este output.
  console.warn("generateTOTPSecret está retornando HEX como placeholder. Para produção, use Base32.");
  return secretBytes.toString('hex');
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
 * Sanitiza entrada de dados para prevenir XSS (Cross-Site Scripting) básico.
 * Substitui caracteres HTML especiais por suas respectivas entidades HTML.
 * ATENÇÃO: Para proteção XSS robusta, especialmente em aplicações complexas,
 * considere usar bibliotecas dedicadas ou as funcionalidades de escape do seu framework de UI (ex: React JSX).
 * @param input A string de entrada a ser sanitizada.
 * @returns A string sanitizada.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''; // Retorna string vazia se não for string
  return input
    .replace(/&/g, '&amp;') // Deve ser o primeiro para evitar escape duplo de '&' em outras entidades.
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;') // Ou &apos; mas &#x27; é mais recomendado.
    .replace(/\//g, '&#x2F;'); // Ajuda a prevenir quebra de tags em alguns contextos.
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
 * Verifica um código MFA (pode ser um TOTP ou um código de backup).
 * @param code O código MFA fornecido pelo usuário.
 * @param decryptedMfaSecret O segredo MFA do usuário (descriptografado), usado para verificação TOTP.
 * @param backupCodeHashes Lista de hashes de códigos de backup válidos para o usuário.
 * @returns Um objeto indicando se o código é válido e se era um código de backup.
 */
export async function verifyMFACode(
  code: string, 
  decryptedMfaSecret: string,
  backupCodeHashes?: string[]
): Promise<{ isValid: boolean, isBackupCodeUsed: boolean }> {
  const normalizedCode = normalizeCode(code); // Normaliza o código (ex: remove espaços/hifens)
  
  // 1. Tenta verificar como código TOTP
  if (isValidTOTPFormat(normalizedCode)) { // Verifica se o formato parece ser de um TOTP
    // `verifyTOTP` compara o código fornecido com o esperado para o segredo e janela de tempo atuais.
    const isValidTOTP = verifyTOTP(normalizedCode, decryptedMfaSecret);
    if (isValidTOTP) {
      return { isValid: true, isBackupCodeUsed: false };
    }
  }
  
  // 2. Se não for um TOTP válido (ou não tiver o formato), tenta verificar como código de backup
  if (isBackupCode(normalizedCode) && backupCodeHashes && backupCodeHashes.length > 0) {
    for (const backupCodeHash of backupCodeHashes) {
      // `verifyBackupCode` compara o código fornecido com um hash de backup code.
      const isValidBackup = await verifyBackupCode(normalizedCode, backupCodeHash);
      if (isValidBackup) {
        // IMPORTANTE: O chamador desta função é responsável por invalidar este código de backup no banco de dados.
        return { isValid: true, isBackupCodeUsed: true };
      }
    }
  }
  
  // Se nenhuma verificação passou, o código é inválido.
  return { isValid: false, isBackupCodeUsed: false };
}

/**
 * Valida código MFA antes da verificação completa
 */
export function validateMFACodeFormat(code: string): boolean {
  const normalized = normalizeCode(code)
  return isValidTOTPFormat(normalized) || isBackupCode(normalized)
}
