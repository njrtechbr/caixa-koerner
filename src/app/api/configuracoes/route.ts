import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, CARGOS } from '@/lib/database'
import { AtualizarConfiguracaoSchema } from '@/lib/schemas'

/**
 * API para gerenciar configurações do sistema
 * Disponível para admin e supervisor de conferência
 */

// Buscar configurações
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (admin ou supervisor de conferência)
    if (session.user.cargo !== CARGOS.ADMIN && session.user.cargo !== CARGOS.SUPERVISOR_CONFERENCIA) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores e supervisores de conferência podem acessar configurações.' },
        { status: 403 }
      )
    }

    // Buscar todas as configurações
    const configuracoes = await prisma.configuracaoSistema.findMany({
      orderBy: {
        chave: 'asc'
      }
    })

    // Organizar configurações em objeto para facilitar o uso
    const configuracoesOrganizadas = configuracoes.reduce((acc, config) => {
      acc[config.chave] = {
        id: config.id,
        valor: config.valor,
        tipo: inferirTipoValor(config.valor)
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      sucesso: true,
      configuracoes: configuracoesOrganizadas,
      total: configuracoes.length
    })

  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Atualizar configuração
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (admin ou supervisor de conferência)
    if (session.user.cargo !== CARGOS.ADMIN && session.user.cargo !== CARGOS.SUPERVISOR_CONFERENCIA) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores e supervisores de conferência podem modificar configurações.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = AtualizarConfiguracaoSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { chave, valor, mfaCode } = validacao.data

    // Buscar dados do usuário para verificar MFA
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        isMfaEnabled: true,
        mfaSecret: true
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem MFA habilitado e validar código
    if (usuario.isMfaEnabled) {
      // TODO: Implementar verificação de código TOTP
      // Por agora, aceitar qualquer código de 6 dígitos para desenvolvimento
      if (!/^\d{6}$/.test(mfaCode)) {
        return NextResponse.json(
          { erro: 'Código MFA inválido' },
          { status: 400 }
        )
      }
    }

    // Validar configurações críticas
    const configuracoesPermitidas = [
      'conferencia_cega_dinheiro_habilitada',
      'sistema_versao',
      'sistema_nome',
      'tempo_sessao_horas',
      'notificacoes_email_habilitadas'
    ]

    if (!configuracoesPermitidas.includes(chave)) {
      return NextResponse.json(
        { erro: 'Configuração não permitida para alteração' },
        { status: 400 }
      )
    }

    // Validar valores específicos
    if (chave === 'conferencia_cega_dinheiro_habilitada' && !['true', 'false'].includes(valor)) {
      return NextResponse.json(
        { erro: 'Valor deve ser "true" ou "false"' },
        { status: 400 }
      )
    }

    // Atualizar ou criar configuração
    const configuracao = await prisma.configuracaoSistema.upsert({
      where: { chave },
      update: { valor },
      create: { chave, valor }
    })

    // Log da operação
    console.log(`Configuração alterada por ${usuario.nome} (${session.user.id}) - ${chave}: ${valor}`)

    return NextResponse.json({
      sucesso: true,
      configuracao: {
        id: configuracao.id,
        chave: configuracao.chave,
        valor: configuracao.valor,
        tipo: inferirTipoValor(configuracao.valor)
      },
      mensagem: `Configuração "${chave}" atualizada com sucesso`
    })

  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * Função auxiliar para inferir o tipo do valor da configuração
 */
function inferirTipoValor(valor: string): string {
  if (valor === 'true' || valor === 'false') {
    return 'boolean'
  }
  
  if (!isNaN(Number(valor))) {
    return 'number'
  }
  
  if (valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return 'date'
  }
  
  return 'string'
}
