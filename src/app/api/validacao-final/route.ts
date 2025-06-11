import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, CARGOS, STATUS_CAIXA, isConferenciaCegaHabilitada } from '@/lib/database'
import { ValidacaoFinalSchema } from '@/lib/schemas'

/**
 * API para validação final diária
 * Disponível apenas para supervisores de conferência
 */

// Realizar validação final do dia
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (apenas supervisor de conferência)
    if (session.user.cargo !== CARGOS.SUPERVISOR_CONFERENCIA) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas supervisores de conferência podem realizar validação final.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = ValidacaoFinalSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { dataConferencia, mfaCode } = validacao.data

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

    const dataConf = new Date(dataConferencia)
    dataConf.setHours(0, 0, 0, 0)

    // Verificar se já existe validação para esta data
    const validacaoExistente = await prisma.conferenciaDiaria.findUnique({
      where: { dataConferencia: dataConf }
    })

    if (validacaoExistente) {
      return NextResponse.json(
        { erro: 'Validação final já foi realizada para esta data' },
        { status: 400 }
      )
    }

    // Buscar todos os caixas aprovados do dia
    const caixasAprovados = await prisma.caixaDiario.findMany({
      where: {
        dataMovimento: dataConf,
        status: STATUS_CAIXA.APROVADO
      },
      include: {
        transacoesFechamento: true,
        conferenciaSupervisorCaixa: true,
        abertoPorUsuario: {
          select: {
            nome: true
          }
        },
        revisadoPorUsuario: {
          select: {
            nome: true
          }
        }
      }
    })

    if (caixasAprovados.length === 0) {
      return NextResponse.json(
        { erro: 'Não há caixas aprovados para validar nesta data' },
        { status: 400 }
      )
    }

    // Calcular totais declarados e conferidos
    const conferenciaCega = await isConferenciaCegaHabilitada()
    
    let valorTotalDeclarado = 0
    let valorTotalConferido = 0

    const resumoCaixas = caixasAprovados.map(caixa => {
      const totalDeclaradoCaixa = caixa.transacoesFechamento.reduce((total, transacao) => {
        return total + Number(transacao.valor)
      }, 0)

      valorTotalDeclarado += totalDeclaradoCaixa

      let totalConferidoCaixa = totalDeclaradoCaixa
      let diferencaDinheiro = 0

      // Se conferência cega estava ativa, usar valor contado para dinheiro
      if (conferenciaCega && caixa.conferenciaSupervisorCaixa) {
        const valorDinheiroDeclarado = caixa.transacoesFechamento
          .filter(t => t.tipoPagamento === 'Dinheiro')
          .reduce((total, t) => total + Number(t.valor), 0)
        
        const valorDinheiroContado = Number(caixa.conferenciaSupervisorCaixa.valorDinheiroContado)
        
        diferencaDinheiro = valorDinheiroContado - valorDinheiroDeclarado
        totalConferidoCaixa = totalDeclaradoCaixa + diferencaDinheiro
      }

      valorTotalConferido += totalConferidoCaixa

      return {
        caixaId: caixa.id,
        operador: caixa.abertoPorUsuario?.nome,
        supervisor: caixa.revisadoPorUsuario?.nome,
        valorDeclarado: totalDeclaradoCaixa,
        valorConferido: totalConferidoCaixa,
        diferencaDinheiro: diferencaDinheiro,
        transacoes: caixa.transacoesFechamento.map(t => ({
          tipo: t.tipoPagamento,
          valor: Number(t.valor)
        }))
      }
    })

    // Criar registro de conferência diária usando transação
    const conferenciaFinal = await prisma.$transaction(async (tx) => {
      // Criar conferência diária
      const conferencia = await tx.conferenciaDiaria.create({
        data: {
          dataConferencia: dataConf,
          valorTotalDeclarado: valorTotalDeclarado,
          valorTotalConferido: valorTotalConferido,
          conferidoPorUsuarioId: session.user.id,
          timestampConferencia: new Date()
        }
      })

      // Atualizar status dos caixas para "conferência final"
      await tx.caixaDiario.updateMany({
        where: {
          dataMovimento: dataConf,
          status: STATUS_CAIXA.APROVADO
        },
        data: {
          status: STATUS_CAIXA.CONFERENCIA_FINAL
        }
      })

      return conferencia
    })

    // Log da operação
    console.log(`Validação final realizada por ${usuario.nome} (${session.user.id}) - Data: ${dataConferencia}`)

    return NextResponse.json({
      sucesso: true,
      validacao: {
        id: conferenciaFinal.id,
        dataConferencia: conferenciaFinal.dataConferencia,
        valorTotalDeclarado: conferenciaFinal.valorTotalDeclarado,
        valorTotalConferido: conferenciaFinal.valorTotalConferido,
        diferenca: Number(conferenciaFinal.valorTotalConferido) - Number(conferenciaFinal.valorTotalDeclarado),
        timestampConferencia: conferenciaFinal.timestampConferencia,
        conferenciaCegaAtiva: conferenciaCega
      },
      resumo: {
        totalCaixas: caixasAprovados.length,
        caixas: resumoCaixas
      },
      mensagem: 'Validação final realizada com sucesso'
    })

  } catch (error) {
    console.error('Erro na validação final:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Buscar painel consolidado para validação
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

    // Verificar permissão (apenas supervisor de conferência)
    if (session.user.cargo !== CARGOS.SUPERVISOR_CONFERENCIA) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas supervisores de conferência podem acessar este painel.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data')
    
    if (!data) {
      return NextResponse.json(
        { erro: 'Data é obrigatória' },
        { status: 400 }
      )
    }

    const dataConsulta = new Date(data)
    dataConsulta.setHours(0, 0, 0, 0)

    // Buscar caixas aprovados do dia
    const caixasAprovados = await prisma.caixaDiario.findMany({
      where: {
        dataMovimento: dataConsulta,
        status: STATUS_CAIXA.APROVADO
      },
      include: {
        transacoesFechamento: true,
        conferenciaSupervisorCaixa: true,
        abertoPorUsuario: {
          select: {
            nome: true,
            email: true
          }
        },
        revisadoPorUsuario: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    })

    // Verificar se já foi validado
    const validacaoExistente = await prisma.conferenciaDiaria.findUnique({
      where: { dataConferencia: dataConsulta },
      include: {
        conferidoPorUsuario: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    })

    const conferenciaCega = await isConferenciaCegaHabilitada()

    return NextResponse.json({
      sucesso: true,
      data: dataConsulta,
      jaValidado: !!validacaoExistente,
      validacao: validacaoExistente ? {
        validadoPor: validacaoExistente.conferidoPorUsuario?.nome,
        timestamp: validacaoExistente.timestampConferencia,
        valorTotalDeclarado: validacaoExistente.valorTotalDeclarado,
        valorTotalConferido: validacaoExistente.valorTotalConferido
      } : null,
      caixas: caixasAprovados.map(caixa => ({
        id: caixa.id,
        operador: caixa.abertoPorUsuario?.nome,
        supervisor: caixa.revisadoPorUsuario?.nome,
        valorInicial: caixa.valorInicial,
        transacoes: caixa.transacoesFechamento.map(t => ({
          tipo: t.tipoPagamento,
          valor: Number(t.valor)
        })),
        conferencia: caixa.conferenciaSupervisorCaixa ? {
          valorDinheiroContado: caixa.conferenciaSupervisorCaixa.valorDinheiroContado,
          timestamp: caixa.conferenciaSupervisorCaixa.timestampConferencia
        } : null
      })),
      configuracoes: {
        conferenciaCegaHabilitada: conferenciaCega
      }
    })

  } catch (error) {
    console.error('Erro ao buscar painel consolidado:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
