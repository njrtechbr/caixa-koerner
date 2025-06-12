// AI-NOTE: Módulo de utilitários para Multi-Factor Authentication (MFA).
// Este arquivo contém funções para gerar segredos MFA, gerar QR Codes para configuração de OTP (One-Time Password),
// e verificar códigos OTP fornecidos pelo usuário. Utiliza a biblioteca 'otplib' e 'qrcode'.

import { authenticator } from 'otplib'; // AI-NOTE: Importa o objeto 'authenticator' da biblioteca 'otplib' para gerar e verificar OTPs.
import qrcode from 'qrcode'; // AI-NOTE: Importa a biblioteca 'qrcode' para gerar QR Codes a partir de strings.

// AI-NOTE: Função para gerar um novo segredo MFA (chave secreta).
// Este segredo é usado pelo aplicativo autenticador (ex: Google Authenticator, Authy) para gerar códigos OTP.
// Retorna:
//   Uma string contendo o segredo MFA gerado (em base32).
export const generateMfaSecret = () => {
  // AI-NOTE: A função 'authenticator.generateSecret()' cria um segredo criptograficamente seguro.
  return authenticator.generateSecret();
};

// AI-NOTE: Função para gerar um Data URL de um QR Code para um URI de configuração OTP.
// Este QR Code pode ser escaneado por aplicativos autenticadores para adicionar a conta.
// Parâmetros:
//   email: O email do usuário, usado para identificar a conta no aplicativo autenticador.
//   secret: O segredo MFA gerado para o usuário.
//   issuer: (Opcional) O nome da aplicação ou organização, exibido no aplicativo autenticador. Padrão: "Seu App".
// Retorna:
//   Uma Promise que resolve para uma string contendo o Data URL da imagem do QR Code (ex: "data:image/png;base64,...").
export const generateOtpQrCode = async (email: string, secret: string, issuer: string = "Koerner Auditores") => {
  // AI-NOTE: Cria o URI no formato otpauth://totp/ISSUER:EMAIL?secret=SECRET&issuer=ISSUER
  // Este é o formato padrão para configuração de TOTP (Time-based One-Time Password).
  // O 'issuer' é incluído duas vezes (antes do email e como parâmetro) para compatibilidade com diferentes autenticadores.
  // O email é encodado para garantir que caracteres especiais não quebrem o URI.
  const otpAuthUrl = authenticator.keyuri(email, issuer, secret);
  
  try {
    // AI-NOTE: Gera o QR Code como um Data URL a partir do otpAuthUrl.
    const qrCodeImage = await qrcode.toDataURL(otpAuthUrl);
    return qrCodeImage;
  } catch (err) {
    // AI-NOTE: Em caso de erro na geração do QR Code, loga o erro e lança uma exceção.
    console.error('Erro ao gerar QR Code OTP:', err);
    throw new Error('Não foi possível gerar o QR Code para configuração do MFA.');
  }
};

// AI-NOTE: Função para verificar um código OTP (token) fornecido pelo usuário contra o segredo MFA.
// Parâmetros:
//   secret: O segredo MFA armazenado para o usuário.
//   token: O código OTP de 6 dígitos fornecido pelo usuário.
// Retorna:
//   Um booleano: true se o token for válido, false caso contrário.
export const verifyOtp = (secret: string, token: string): boolean => {
  try {
    // AI-NOTE: 'authenticator.check()' verifica se o token é válido para o segredo fornecido,
    // considerando a janela de tempo padrão para TOTPs.
    // É importante garantir que o servidor e o dispositivo do usuário estejam com os horários sincronizados.
    const isValid = authenticator.check(token, secret);
    return isValid;
  } catch (error) {
    // AI-NOTE: Em caso de erro durante a verificação (ex: token mal formatado, embora otplib deva lidar com isso),
    // loga o erro e retorna false.
    console.error("Erro ao verificar OTP:", error);
    return false;
  }
};

// AI-NOTE: Considerações Adicionais sobre MFA:
// 1. Armazenamento Seguro do Segredo: O 'mfaSecret' deve ser armazenado de forma criptografada no banco de dados,
//    ou, no mínimo, com acesso restrito. Se comprometido, a segurança do MFA é anulada.
// 2. Códigos de Recuperação: Implementar um sistema de códigos de recuperação é crucial para o caso de o usuário
//    perder acesso ao seu dispositivo autenticador. Estes códigos devem ser de uso único e armazenados de forma segura.
// 3. Sincronização de Tempo: A validade do TOTP depende da sincronia de tempo entre o servidor e o dispositivo do usuário.
//    Pequenas diferenças são geralmente toleradas pela janela de validação do 'otplib', mas grandes dessincronias podem causar falhas.
// 4. Bloqueio de Tentativas: Considerar implementar um bloqueio temporário após múltiplas tentativas falhas de verificação de OTP
//    para prevenir ataques de força bruta contra os códigos OTP.
// 5. Interface do Usuário: A interface para configuração e uso do MFA deve ser clara e fornecer instruções adequadas.
