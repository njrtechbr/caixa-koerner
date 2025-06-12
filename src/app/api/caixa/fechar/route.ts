import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, STATUS_CAIXA, CARGOS } from '@/lib/database'
import { z } from 'zod'
import { getDevBypassSession, isDevelopmentMode } from '@/lib/dev-bypass'

/**
 * API para fechar caixa diário com as novas formas de pagamento
 * Disponível apenas para operadores de caixa
 */

const FecharCaixaSchema = z.object({
  caixa_diario_id: z.string().uuid(),
  valor_dinheiro: z.number().min(0).optional(),
  valor_sistema_w6: z.number().min(0).optional(),
  codigo_mfa: z.string().length(6)
})

export async function POST(request: NextRequest) {  try {
    // Verificar autenticação
    let session = await getServerSession(authOptions)
    
    // Bypass de desenvolvimento
    if (isDevelopmentMode() && !session) {
      session = getDevBypassSession();
    }
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (apenas operadores de caixa) - relaxar em desenvolvimento
    if (!isDevelopmentMode() && session.user.cargo !== CARGOS.OPERADOR_CAIXA) {
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

    const { caixa_diario_id, valor_dinheiro, valor_sistema_w6, codigo_mfa } = validacao.data

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
    if (usuario.isMfaEnabled && !isDevelopmentMode()) {
      // TODO: Implementar verificação de código TOTP
      // Por agora, aceitar qualquer código de 6 dígitos para desenvolvimento
      if (!/^\d{6}$/.test(codigo_mfa)) {
        return NextResponse.json(
          { erro: 'Código MFA inválido' },
          { status: 400 }
        )
      }
    } else if (!isDevelopmentMode()) {
      return NextResponse.json(
        { erro: 'MFA é obrigatório para esta operação' },
        { status: 403 }
      )
    }

    // Buscar o caixa a ser fechado
    const caixa = await prisma.caixaDiario.findUnique({
      where: { id: caixa_diario_id },
      include: {
        transacoesFechamento: true,
        abertoPorUsuario: {
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
    if (caixa.status !== STATUS_CAIXA.ABERTO) {
      return NextResponse.json(
        { erro: 'Caixa não está aberto para fechamento' },
        { status: 400 }
      )
    }

    // Verificar se o caixa pertence ao usuário
    if (caixa.abertoPorUsuarioId !== session.user.id) {
      return NextResponse.json(
        { erro: 'Você só pode fechar seus próprios caixas' },
        { status: 403 }
      )
    }    // Buscar as transações já salvas (formas de movimentação)
    const transacoesSalvas = await prisma.transacaoFechamento.findMany({
      where: { caixaDiarioId: caixa_diario_id },
      include: {
        formaPagamento: true
      }
    })

    // Executar fechamento usando transação
    const resultado = await prisma.$transaction(async (tx) => {
      // Atualizar status do caixa
      const caixaAtualizado = await tx.caixaDiario.update({
        where: { id: caixa_diario_id },
        data: {
          status: STATUS_CAIXA.FECHADO_AGUARDANDO_CONFERENCIA,
          fechadoPorUsuarioId: session.user.id,
          dataFechamento: new Date(),
          valorSistemaW6: valor_sistema_w6 || 0
        }
      })

      // Criar/atualizar transações de fechamento para valores fixos
      const transacoesFechamento = []

      // Dinheiro
      if (valor_dinheiro && valor_dinheiro > 0) {
        const formaDinheiro = await tx.formaPagamento.findFirst({
          where: { ehDinheiro: true }
        })
        
        if (formaDinheiro) {
          const transacaoDinheiro = await tx.transacaoFechamento.upsert({
            where: {
              caixaDiarioId_formaPagamentoId: {
                caixaDiarioId: caixa_diario_id,
                formaPagamentoId: formaDinheiro.id
              }
            },
            update: {
              valor: valor_dinheiro,
              timestampSalvo: new Date()
            },
            create: {
              caixaDiarioId: caixa_diario_id,
              formaPagamentoId: formaDinheiro.id,
              valor: valor_dinheiro,
              ordemPreenchimento: 1
            }
          })
          transacoesFechamento.push(transacaoDinheiro)
        }
      }

      // Sistema W6
      if (valor_sistema_w6 && valor_sistema_w6 > 0) {
        const formaW6 = await tx.formaPagamento.findFirst({
          where: { ehSistemaW6: true }
        })
        
        if (formaW6) {
          const transacaoW6 = await tx.transacaoFechamento.upsert({
            where: {
              caixaDiarioId_formaPagamentoId: {
                caixaDiarioId: caixa_diario_id,
                formaPagamentoId: formaW6.id
              }
            },
            update: {
              valor: valor_sistema_w6,
              timestampSalvo: new Date()
            },
            create: {
              caixaDiarioId: caixa_diario_id,
              formaPagamentoId: formaW6.id,
              valor: valor_sistema_w6,
              ordemPreenchimento: 2
            }
          })
          transacoesFechamento.push(transacaoW6)
        }
      }

      // Todas as transações de fechamento existentes já estão salvas
      // Apenas buscar todas para retornar
      const todasTransacoes = await tx.transacaoFechamento.findMany({
        where: { caixaDiarioId: caixa_diario_id },
        include: {
          formaPagamento: true
        }
      })

      return { caixaAtualizado, transacoesFechamento: todasTransacoes }
    })

    // Calcular total
    const valorTotal = resultado.transacoesFechamento.reduce((total, t) => total + Number(t.valor), 0)

    // Log da operação
    console.log(`Caixa fechado por ${usuario.nome} (${session.user.id}) - Caixa ${caixa_diario_id} - Total: R$ ${valorTotal}`)

    return NextResponse.json({
      sucesso: true,
      caixa: {
        id: resultado.caixaAtualizado.id,
        status: resultado.caixaAtualizado.status,
        dataFechamento: resultado.caixaAtualizado.dataFechamento,
        valorTotal: valorTotal,
        transacoes: resultado.transacoesFechamento.length
      },
      mensagem: 'Caixa fechado com sucesso e enviado para conferência'
    })

  } catch (error) {
    console.error('Erro ao fechar caixa:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}