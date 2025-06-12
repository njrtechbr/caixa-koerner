// AI-NOTE: Módulo de configuração e instanciação do cliente Prisma.
// Este arquivo é central para a interação da aplicação com o banco de dados.
// Ele garante que haja uma única instância do PrismaClient, o que é uma prática recomendada
// para evitar a exaustão de conexões com o banco de dados em ambientes de desenvolvimento com hot-reloading.

import { PrismaClient } from "@prisma/client"; // AI-NOTE: Importa o PrismaClient do pacote @prisma/client.

// AI-NOTE: Declara uma variável global 'prisma' do tipo PrismaClient ou undefined.
// O uso de 'globalThis' é uma forma de declarar variáveis globais de forma segura em diferentes ambientes JavaScript (Node.js, browser).
// Isso é específico para o padrão de instanciação única do Prisma em desenvolvimento.
declare global {
  var prisma: PrismaClient | undefined;
}

// AI-NOTE: Instancia o PrismaClient.
// A lógica aqui diferencia entre ambiente de produção e desenvolvimento:
// - Em produção: cria uma nova instância do PrismaClient diretamente.
// - Em desenvolvimento: verifica se já existe uma instância em 'globalThis.prisma'.
//   Se não existir, cria uma nova e a armazena em 'globalThis.prisma'.
//   Isso previne que o Next.js hot-reloading crie múltiplas instâncias do PrismaClient,
//   o que poderia levar a avisos de excesso de conexões.
const prisma = globalThis.prisma || new PrismaClient({
  // AI-NOTE: Opções de log para o PrismaClient.
  // Pode ser configurado para logar queries, informações, avisos e erros.
  // Exemplo: log: ["query", "info", "warn", "error"]
  // No código atual, está vazio, o que significa que usará os padrões do Prisma (geralmente log de erros).
  // Para desenvolvimento, logar queries ('query') pode ser muito útil para depuração.
  log: [],
});

// AI-NOTE: Se estiver em ambiente de desenvolvimento, atribui a instância do PrismaClient à variável global.
// Isso garante que a mesma instância seja reutilizada nas recargas de módulos (hot-reloading).
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// AI-NOTE: Exporta a instância única do PrismaClient.
// Esta instância deve ser importada por todos os outros módulos da aplicação
// que precisam interagir com o banco de dados.
export default prisma;
