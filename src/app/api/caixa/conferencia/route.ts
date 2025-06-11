import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, STATUS_CAIXA, CARGOS, isConferenciaCegaHabilitada } from '@/lib/database'
import { ConferenciaCaixaSchema } from '@/lib/schemas'

/**
 * API para conferência de caixa
 * Disponível apenas para supervisores de caixa
 */

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

    // Verificar permissão (apenas supervisores de caixa)
    if (session.user.cargo !== CARGOS.SUPERVISOR_CAIXA) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas supervisores de caixa podem fazer conferência.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = ConferenciaCaixaSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { caixaId, aprovado, valorDinheiroContado, motivoRejeicao, mfaCode } = validacao.data

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

    // Buscar o caixa a ser conferido
    const caixa = await prisma.caixaDiario.findUnique({
      where: { id: caixaId },
      include: {
        transacoesFechamento: true,
        abertoPorUsuario: {
          select: {
            nome: true,
            email: true
          }
        },
        fechadoPorUsuario: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    })

    if (!caixa) {
      return NextResponse.json(
        { erro: 'Caixa não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o caixa está no status correto
    if (caixa.status !== STATUS_CAIXA.FECHADO_AGUARDANDO_CONFERENCIA) {
      return NextResponse.json(
        { erro: 'Caixa não está aguardando conferência' },
        { status: 400 }
      )
    }

    // Verificar se conferência cega está habilitada
    const conferenciaCega = await isConferenciaCegaHabilitada()

    // Se conferência cega está habilitada e o caixa foi aprovado, valorDinheiroContado é obrigatório
    if (conferenciaCega && aprovado && valorDinheiroContado === undefined) {
      return NextResponse.json(
        { erro: 'Valor do dinheiro contado é obrigatório na conferência cega' },
        { status: 400 }
      )
    }

    // Se rejeitado, motivo é obrigatório
    if (!aprovado && !motivoRejeicao) {
      return NextResponse.json(
        { erro: 'Motivo da rejeição é obrigatório' },
        { status: 400 }
      )
    }

    // Executar conferência usando transação
    const resultado = await prisma.$transaction(async (tx) => {
      // Atualizar status do caixa
      const caixaAtualizado = await tx.caixaDiario.update({
        where: { id: caixaId },
        data: {
          status: aprovado ? STATUS_CAIXA.APROVADO : STATUS_CAIXA.REPROVADO,
          revisadoPorUsuarioId: session.user.id,
          dataRevisao: new Date(),
          motivoRejeicao: !aprovado ? motivoRejeicao : null
        }
      })

      // Se conferência cega está habilitada e foi aprovado, registrar valor contado
      let conferenciaSupervisor = null
      if (conferenciaCega && aprovado && valorDinheiroContado !== undefined) {
        conferenciaSupervisor = await tx.conferenciaSupervisorCaixa.create({
          data: {
            caixaDiarioId: caixaId,
            supervisorId: session.user.id,
            timestampConferencia: new Date(),
            valorDinheiroContado: valorDinheiroContado
          }
        })
      }

      return { caixaAtualizado, conferenciaSupervisor }
    })

    // Calcular diferenças se houver conferência cega
    let diferencas = null
    if (conferenciaCega && aprovado && valorDinheiroContado !== undefined) {
      const valorDinheiroDeclarado = caixa.transacoesFechamento
        .filter(t => t.tipoPagamento === 'Dinheiro')
        .reduce((total, t) => total + Number(t.valor), 0)
      
      diferencas = {
        valorDeclarado: valorDinheiroDeclarado,
        valorContado: valorDinheiroContado,
        diferenca: Number(valorDinheiroContado) - valorDinheiroDeclarado
      }
    }

    // Log da operação
    console.log(`Conferência realizada por ${usuario.nome} (${session.user.id}) - Caixa ${caixaId} ${aprovado ? 'APROVADO' : 'REPROVADO'}`)

    return NextResponse.json({
      sucesso: true,
      resultado: aprovado ? 'aprovado' : 'reprovado',
      caixa: {
        id: resultado.caixaAtualizado.id,
        status: resultado.caixaAtualizado.status,
        dataRevisao: resultado.caixaAtualizado.dataRevisao,
        motivoRejeicao: resultado.caixaAtualizado.motivoRejeicao
      },
      conferenciaCega: conferenciaCega,
      diferencas: diferencas,
      mensagem: aprovado 
        ? 'Caixa aprovado com sucesso' 
        : 'Caixa reprovado. Operador será notificado.'
    })

  } catch (error) {
    console.error('Erro na conferência do caixa:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
