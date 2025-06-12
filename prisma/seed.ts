import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // 1. Inserir configurações do sistema
  console.log('📝 Inserindo configurações do sistema...')
  
  await prisma.configuracaoSistema.upsert({
    where: { chave: 'conferencia_cega_dinheiro_habilitada' },
    update: {},
    create: {
      chave: 'conferencia_cega_dinheiro_habilitada',
      valor: 'true'
    }
  })

  await prisma.configuracaoSistema.upsert({
    where: { chave: 'sistema_versao' },
    update: {},
    create: {
      chave: 'sistema_versao',
      valor: '1.0.0'
    }
  })

  await prisma.configuracaoSistema.upsert({
    where: { chave: 'sistema_nome' },
    update: {},
    create: {
      chave: 'sistema_nome',
      valor: 'Sistema de Controle de Caixa - Cartório Koerner'
    }
  })

  // 2. Criar usuário administrador padrão
  console.log('👤 Criando usuário administrador...')
  
  const senhaAdmin = 'Admin@123456'
  const senhaHash = await bcrypt.hash(senhaAdmin, 12)

  await prisma.usuario.upsert({
    where: { email: 'admin@cartoriokoerner.com.br' },
    update: {},
    create: {
      nome: 'Administrador do Sistema',
      email: 'admin@cartoriokoerner.com.br',
      senha: senhaHash,
      cargo: 'admin',
      isMfaEnabled: false
    }
  })

  // 3. Criar usuários de exemplo para desenvolvimento (opcional)
  console.log('👥 Criando usuários de exemplo...')

  const senhaOperador = 'Operador@123'
  const senhaOperadorHash = await bcrypt.hash(senhaOperador, 12)

  await prisma.usuario.upsert({
    where: { email: 'operador@cartoriokoerner.com.br' },
    update: {},
    create: {
      nome: 'João Silva - Operador',
      email: 'operador@cartoriokoerner.com.br',
      senha: senhaOperadorHash,
      cargo: 'operador_caixa',
      isMfaEnabled: false
    }
  })

  const senhaSupervisorCaixa = 'Supervisor@123'
  const senhaSupervisorCaixaHash = await bcrypt.hash(senhaSupervisorCaixa, 12)

  await prisma.usuario.upsert({
    where: { email: 'supervisor.caixa@cartoriokoerner.com.br' },
    update: {},
    create: {
      nome: 'Maria Santos - Supervisora de Caixa',
      email: 'supervisor.caixa@cartoriokoerner.com.br',
      senha: senhaSupervisorCaixaHash,
      cargo: 'supervisor_caixa',
      isMfaEnabled: false
    }
  })

  const senhaSupervisorConferencia = 'SupervisorConf@123'
  const senhaSupervisorConferenciaHash = await bcrypt.hash(senhaSupervisorConferencia, 12)

  await prisma.usuario.upsert({
    where: { email: 'supervisor.conferencia@cartoriokoerner.com.br' },
    update: {},
    create: {
      nome: 'Carlos Oliveira - Supervisor de Conferência',
      email: 'supervisor.conferencia@cartoriokoerner.com.br',
      senha: senhaSupervisorConferenciaHash,
      cargo: 'supervisor_conferencia',
      isMfaEnabled: false
    }
  })
  // 4. Criar usuário adicional para testes
  console.log('👥 Criando usuário adicional para testes...')

  // Segundo operador de caixa
  const senhaOperador2 = 'Operador2@123'
  const senhaOperador2Hash = await bcrypt.hash(senhaOperador2, 12)

  await prisma.usuario.upsert({
    where: { email: 'operador2@cartoriokoerner.com.br' },
    update: {},
    create: {
      nome: 'Ana Costa - Operadora',
      email: 'operador2@cartoriokoerner.com.br',
      senha: senhaOperador2Hash,
      cargo: 'operador_caixa',
      isMfaEnabled: false
    }
  })

  console.log('✅ Usuários criados com sucesso!')

  // 3. Inserir formas de pagamento padrão
  console.log('💳 Inserindo formas de pagamento padrão...')
  
  const formasPagamento = [
    {
      nome: 'Dinheiro',
      codigo: 'dinheiro',
      ordem: 1,
      ehDinheiro: true,
      ehSistemaW6: false,
      ativo: true
    },
    {
      nome: 'PIX',
      codigo: 'pix',
      ordem: 2,
      ehDinheiro: false,
      ehSistemaW6: false,
      ativo: true
    },
    {
      nome: 'Cartão de Débito',
      codigo: 'debito',
      ordem: 3,
      ehDinheiro: false,
      ehSistemaW6: false,
      ativo: true
    },
    {
      nome: 'Cartão de Crédito',
      codigo: 'credito',
      ordem: 4,
      ehDinheiro: false,
      ehSistemaW6: false,
      ativo: true
    },
    {
      nome: 'Mensalista',
      codigo: 'mensalista',
      ordem: 5,
      ehDinheiro: false,
      ehSistemaW6: false,
      ativo: true
    },
    {
      nome: 'Cheque',
      codigo: 'cheque',
      ordem: 6,
      ehDinheiro: false,
      ehSistemaW6: false,
      ativo: true
    },
    {
      nome: 'Outros',
      codigo: 'outros',
      ordem: 7,
      ehDinheiro: false,
      ehSistemaW6: false,
      ativo: true
    },
    {
      nome: 'Sistema W6',
      codigo: 'sistema_w6',
      ordem: 99, // Sempre por último
      ehDinheiro: false,
      ehSistemaW6: true,
      ativo: true
    }
  ]

  for (const forma of formasPagamento) {
    await prisma.formaPagamento.upsert({
      where: { codigo: forma.codigo },
      update: {
        nome: forma.nome,
        ordem: forma.ordem,
        ehDinheiro: forma.ehDinheiro,
        ehSistemaW6: forma.ehSistemaW6,
        ativo: forma.ativo
      },
      create: forma
    })
  }

  console.log('✅ Formas de pagamento criadas com sucesso!')
  console.log('')
  console.log('📋 Usuários criados:')
  console.log('  🔐 Admin: admin@cartoriokoerner.com.br | Senha: Admin@123456')
  console.log('  👤 Operador: operador@cartoriokoerner.com.br | Senha: Operador@123')
  console.log('  👥 Supervisor Caixa: supervisor.caixa@cartoriokoerner.com.br | Senha: Supervisor@123')
  console.log('  👥 Supervisor Conferência: supervisor.conferencia@cartoriokoerner.com.br | Senha: SupervisorConf@123')
  console.log('  👤 Operador 2: operador2@cartoriokoerner.com.br | Senha: Operador2@123')
  console.log('  🔑 Teste MFA: mfa.test@cartoriokoerner.com.br | Senha: MfaTest@123')
  console.log('')
  console.log('⚠️  IMPORTANTE: Altere todas as senhas após o primeiro login!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro durante o seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
