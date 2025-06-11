import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, CARGOS, STATUS_MOVIMENTACAO } from '@/lib/database'
import { AprovarMovimentacaoSchema } from '@/lib/schemas'

/**
 * API para aprovar/reprovar movimentações (sangria/entrada)
 * Disponível apenas para supervisores de caixa e admin
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

    // Verificar permissão (apenas supervisores de caixa e admin)
    if (session.user.cargo !== CARGOS.SUPERVISOR_CAIXA && session.user.cargo !== CARGOS.ADMIN) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas supervisores de caixa podem aprovar movimentações.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = AprovarMovimentacaoSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { movimentacaoId, aprovado, motivoRejeicao, mfaCode } = validacao.data    // Buscar dados do usuário para verificar MFA
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        isMfaEnabled: true,
        mfaSecret: true,
        backupCodes: {
          where: { isUsed: false },
          select: { id: true, codeHash: true }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      )
    }    // Verificar se o usuário tem MFA habilitado e validar código
    if (usuario.isMfaEnabled) {
      if (!mfaCode) {
        return NextResponse.json(
          { erro: 'Código MFA é obrigatório' },
          { status: 400 }
        )
      }

      // Verificar código MFA
      const { verifyMFACode } = await import('@/lib/security')
      const { decryptData } = await import('@/lib/security')
      
      const secret = decryptData(usuario.mfaSecret!)
      const backupCodes = usuario.backupCodes.map(bc => bc.codeHash)
      
      const { isValid, isBackupCode } = await verifyMFACode(mfaCode, secret, backupCodes)
      
      if (!isValid) {
        return NextResponse.json(
          { erro: 'Código MFA inválido' },
          { status: 400 }
        )
      }

      // Se foi usado código de backup, marcar como usado
      if (isBackupCode) {
        const { verifyBackupCode } = await import('@/lib/security')
        
        for (const backupCode of usuario.backupCodes) {
          if (await verifyBackupCode(mfaCode, backupCode.codeHash)) {
            await prisma.usuarioBackupCode.update({
              where: { id: backupCode.id },
              data: { isUsed: true }
            })
            break
          }
        }
      }
    }

    // Buscar a movimentação
    const movimentacao = await prisma.movimentacaoCaixa.findUnique({
      where: { id: movimentacaoId },
      include: {
        solicitante: {
          select: {
            nome: true,
            email: true
          }
        },
        caixaDiario: {
          select: {
            dataMovimento: true,
            status: true
          }
        }
      }
    })

    if (!movimentacao) {
      return NextResponse.json(
        { erro: 'Movimentação não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a movimentação está pendente
    if (movimentacao.status !== STATUS_MOVIMENTACAO.PENDENTE) {
      return NextResponse.json(
        { erro: 'Esta movimentação já foi processada' },
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

    // Atualizar status da movimentação
    const movimentacaoAtualizada = await prisma.movimentacaoCaixa.update({
      where: { id: movimentacaoId },
      data: {
        status: aprovado ? STATUS_MOVIMENTACAO.APROVADO : STATUS_MOVIMENTACAO.REPROVADO,
        aprovadorId: session.user.id,
        dataDecisao: new Date()
      }
    })

    // Se foi reprovada, adicionar motivo na descrição (se não existir campo específico)
    if (!aprovado && motivoRejeicao) {
      await prisma.movimentacaoCaixa.update({
        where: { id: movimentacaoId },
        data: {
          descricao: `${movimentacao.descricao} | REJEITADO: ${motivoRejeicao}`
        }
      })
    }

    // Log da operação
    const acao = aprovado ? 'APROVADA' : 'REPROVADA'
    console.log(`Movimentação ${acao} por ${usuario.nome} (${session.user.id}) - Movimentação ID: ${movimentacaoId}`)

    return NextResponse.json({
      sucesso: true,
      resultado: aprovado ? 'aprovado' : 'reprovado',
      movimentacao: {
        id: movimentacaoAtualizada.id,
        tipo: movimentacaoAtualizada.tipo,
        valor: movimentacaoAtualizada.valor,
        status: movimentacaoAtualizada.status,
        dataDecisao: movimentacaoAtualizada.dataDecisao,
        solicitante: movimentacao.solicitante?.nome
      },
      mensagem: aprovado 
        ? `${movimentacao.tipo} aprovada com sucesso` 
        : `${movimentacao.tipo} reprovada: ${motivoRejeicao}`
    })

  } catch (error) {
    console.error('Erro ao aprovar/reprovar movimentação:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
