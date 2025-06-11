import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, STATUS_CAIXA, CARGOS } from '@/lib/database'
import { AbrirCaixaSchema } from '@/lib/schemas'
import { verifyTOTP } from '@/lib/mfa'

/**
 * API para abrir caixa diário
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
        { erro: 'Acesso negado. Apenas operadores de caixa podem abrir caixas.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = AbrirCaixaSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { valorInicial, mfaCode } = validacao.data

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
    }    // Verificar se o usuário tem MFA habilitado e validar código
    if (usuario.isMfaEnabled) {
      if (!usuario.mfaSecret) {
        return NextResponse.json(
          { erro: 'Configuração MFA inválida' },
          { status: 500 }
        )
      }

      // Descriptografar secret e verificar código TOTP
      const { decryptData } = await import('@/lib/security')
      const secret = decryptData(usuario.mfaSecret)
      const isValidMFA = verifyTOTP(mfaCode, secret)
      
      if (!isValidMFA) {
        return NextResponse.json(
          { erro: 'Código MFA inválido' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { erro: 'MFA é obrigatório para esta operação' },
        { status: 403 }
      )
    }    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Verificar se já existe um caixa aberto para este usuário (independente da data)
    const caixaAbertoExistente = await prisma.caixaDiario.findFirst({
      where: {
        abertoPorUsuarioId: session.user.id,
        status: STATUS_CAIXA.ABERTO
      },
      orderBy: {
        dataAbertura: 'desc'
      }
    })

    if (caixaAbertoExistente) {
      return NextResponse.json(
        { 
          erro: 'Você já possui um caixa aberto',
          detalhes: {
            caixaId: caixaAbertoExistente.id,
            dataAbertura: caixaAbertoExistente.dataAbertura,
            valorInicial: caixaAbertoExistente.valorInicial,
            dataMovimento: caixaAbertoExistente.dataMovimento
          }
        },
        { status: 400 }
      )
    }

    // Verificar se já existe um caixa para a data de hoje (fechado ou não)
    const caixaHojeExistente = await prisma.caixaDiario.findFirst({
      where: {
        abertoPorUsuarioId: session.user.id,
        dataMovimento: hoje
      }
    })

    if (caixaHojeExistente) {
      return NextResponse.json(
        { 
          erro: 'Já existe um caixa para a data de hoje',
          detalhes: {
            status: caixaHojeExistente.status,
            dataAbertura: caixaHojeExistente.dataAbertura
          }
        },
        { status: 400 }
      )
    }

    // Buscar o saldo final do dia anterior para este operador
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    const caixaOntem = await prisma.caixaDiario.findFirst({
      where: {
        abertoPorUsuarioId: session.user.id,
        dataMovimento: ontem,
        status: STATUS_CAIXA.APROVADO
      },
      include: {
        transacoesFechamento: true
      },
      orderBy: {
        dataAbertura: 'desc'
      }
    })

    // Criar novo caixa usando transação para garantir atomicidade
    const novoCaixa = await prisma.$transaction(async (tx) => {
      return await tx.caixaDiario.create({
        data: {
          dataMovimento: hoje,
          valorInicial: valorInicial,
          status: STATUS_CAIXA.ABERTO,
          abertoPorUsuarioId: session.user.id,
          dataAbertura: new Date()
        },
        include: {
          abertoPorUsuario: {
            select: {
              nome: true,
              email: true
            }
          }
        }
      })
    })

    // Log da operação
    console.log(`Caixa aberto por ${usuario.nome} (${session.user.id}) - Valor inicial: R$ ${valorInicial}`)

    return NextResponse.json({
      sucesso: true,
      caixa: {
        id: novoCaixa.id,
        dataMovimento: novoCaixa.dataMovimento,
        valorInicial: novoCaixa.valorInicial,
        status: novoCaixa.status,
        operador: novoCaixa.abertoPorUsuario?.nome,
        dataAbertura: novoCaixa.dataAbertura
      },
      saldoAnterior: caixaOntem ? 'Encontrado' : 'Não encontrado'
    })

  } catch (error) {
    console.error('Erro ao abrir caixa:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
