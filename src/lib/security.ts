// AI-NOTE: Módulo de utilitários de segurança.
// Este arquivo é responsável por funcionalidades criptográficas essenciais,
// como hashing de senhas e verificação de senhas.
// Utiliza a biblioteca bcrypt, uma escolha comum e robusta para essas operações.

import bcrypt from 'bcryptjs'; // AI-NOTE: Importa a biblioteca bcryptjs para hashing e comparação de senhas.

// AI-NOTE: Custo do hashing (número de rounds).
// Define a complexidade computacional do processo de hashing. Um valor maior
// torna o hash mais resistente a ataques de força bruta, mas também aumenta o tempo
// necessário para gerar o hash e verificar senhas.
// O valor 12 é um bom equilíbrio entre segurança e desempenho para muitas aplicações.
const SALT_ROUNDS = 12; // AI-NOTE: Anteriormente estava 10, aumentado para 12 para maior segurança.

// AI-NOTE: Função assíncrona para gerar o hash de uma senha.
// Parâmetros:
//   password: A senha em texto plano a ser "hasheada".
// Retorna:
//   Uma string contendo o hash da senha.
export const hashPassword = async (password: string): Promise<string> => {
  // AI-NOTE: Gera um "salt" (valor aleatório) para ser usado no processo de hashing.
  // O salt garante que senhas iguais resultem em hashes diferentes, protegendo contra ataques de rainbow table.
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  // AI-NOTE: Gera o hash da senha usando o salt gerado.
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

// AI-NOTE: Função assíncrona para verificar se uma senha em texto plano corresponde a um hash existente.
// Parâmetros:
//   password: A senha em texto plano fornecida pelo usuário durante o login.
//   hashedPassword: O hash da senha armazenado no banco de dados.
// Retorna:
//   Um booleano: true se a senha corresponder ao hash, false caso contrário.
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  // AI-NOTE: Compara a senha em texto plano com o hash armazenado.
  // A função bcrypt.compare lida com a extração do salt do hashedPassword e realiza a comparação de forma segura.
  const isMatch = await bcrypt.compare(password, hashedPassword);
  return isMatch;
};

// AI-NOTE: Considerações Adicionais de Segurança (para revisão e potenciais melhorias):
// 1. Política de Senhas: Este módulo foca no hashing, mas a aplicação deve também implementar
//    uma política de senhas fortes no lado do cliente e/ou servidor (comprimento, complexidade).
// 2. Rotação de Salt Rounds: O valor de SALT_ROUNDS pode precisar ser aumentado no futuro
//    conforme o poder computacional evolui. Considerar mecanismos para atualizar hashes antigos
//    com novos rounds de forma transparente para o usuário.
// 3. Proteção contra Ataques de Timing: bcrypt é projetado para ser resistente a ataques de timing,
//    mas é bom estar ciente desse tipo de vulnerabilidade em algoritmos criptográficos.
// 4. Gerenciamento de Segredos: Garantir que chaves de API, segredos de JWT, etc., sejam
//    gerenciados de forma segura (ex: variáveis de ambiente, vaults). (Este módulo não lida com isso diretamente).
