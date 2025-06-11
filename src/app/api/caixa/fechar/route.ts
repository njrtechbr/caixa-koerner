import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, STATUS_CAIXA, CARGOS } from '@/lib/database'
import { FecharCaixaSchema } from '@/lib/schemas'
import { verifyTOTP } from '@/lib/mfa'
import { decryptData } from '@/lib/security'

/**
 * API para fechar caixa diário
 * Disponível apenas para operadores de caixa
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

    // Verificar permissão (apenas operadores de caixa)
    if (session.user.cargo !== CARGOS.OPERADOR_CAIXA) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas operadores de caixa podem fechar caixas.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = FecharCaixaSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { transacoes, mfaCode } = validacao.data

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
      if (!usuario.mfaSecret) {
        // This case should ideally not happen if MFA is enabled
        console.error(`MFA enabled for user ${usuario.id} but mfaSecret is missing.`);
        return NextResponse.json(
          { erro: 'Configuração MFA inválida para o usuário.' },
          { status: 500 }
        );
      }
      if (!mfaCode || !/^\d{6}$/.test(mfaCode)) {
        return NextResponse.json(
          { erro: 'Formato do código MFA inválido.' },
          { status: 400 }
        );
      }
      const secret = decryptData(usuario.mfaSecret);
      const isValidMFA = verifyTOTP(mfaCode, secret);
      if (!isValidMFA) {
        return NextResponse.json(
          { erro: 'Código MFA inválido.' },
          { status: 400 }
        );
      }
    } else {
      // If MFA is not enabled for the user, but the operation still requires it by policy (e.g. for all financial operations)
      // This part depends on application policy. Assuming for now that if user.isMfaEnabled is false, we don't check.
      // However, if company policy dictates all 'fechar caixa' needs MFA, this needs adjustment.
      // For now, matching existing logic where if `isMfaEnabled` is false, it's skipped.
      // Consider adding a check here if all 'fechar caixa' must have MFA regardless of user's general MFA status.
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Buscar o caixa aberto para hoje
    const caixaAberto = await prisma.caixaDiario.findFirst({
      where: {
        abertoPorUsuarioId: session.user.id,
        dataMovimento: hoje,
        status: STATUS_CAIXA.ABERTO
      }
    })

    if (!caixaAberto) {
      return NextResponse.json(
        { erro: 'Não há caixa aberto para fechar hoje' },
        { status: 400 }
      )
    }

    // Calcular valor total das transações
    const valorTotal = transacoes.reduce((total, transacao) => {
      return total + Number(transacao.valor)
    }, 0)

    // Fechar caixa usando transação para garantir atomicidade
    const caixaFechado = await prisma.$transaction(async (tx) => {
      // Atualizar status do caixa
      const caixaAtualizado = await tx.caixaDiario.update({
        where: { id: caixaAberto.id },
        data: {
          status: STATUS_CAIXA.FECHADO_AGUARDANDO_CONFERENCIA,
          fechadoPorUsuarioId: session.user.id,
          dataFechamento: new Date()
        }
      })

      // Inserir transações de fechamento
      await tx.transacaoFechamento.createMany({
        data: transacoes.map(transacao => ({
          caixaDiarioId: caixaAberto.id,
          tipoPagamento: transacao.tipoPagamento,
          valor: transacao.valor
        }))
      })

      return caixaAtualizado
    })

    return NextResponse.json({
      sucesso: true,
      caixa: {
        id: caixaFechado.id,
        status: caixaFechado.status,
        dataFechamento: caixaFechado.dataFechamento,
        valorTotal: valorTotal,
        totalTransacoes: transacoes.length
      },
      mensagem: 'Caixa fechado com sucesso. Aguardando conferência.'
    })

  } catch (error) {
    console.error('Erro ao fechar caixa:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
