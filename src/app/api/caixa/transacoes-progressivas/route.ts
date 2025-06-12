import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';
import { z } from 'zod';

const SalvarTransacaoSchema = z.object({
  caixa_diario_id: z.string().uuid(),
  forma_pagamento_id: z.string().uuid(),
  valor: z.number().min(0),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = SalvarTransacaoSchema.parse(body);    // Verificar se o usuário tem permissão para este caixa
    const caixa = await prisma.caixaDiario.findFirst({
      where: {
        id: validatedData.caixa_diario_id,
        status: 'Aberto'
      }
    });

    if (!caixa) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Caixa não encontrado ou não está aberto' },
        { status: 404 }
      );
    }

    // Verificar permissões: apenas operadores podem editar seus próprios caixas
    const { CARGOS } = await import('@/lib/database');
    if (session.user.cargo === CARGOS.OPERADOR_CAIXA && caixa.abertoPorUsuarioId !== session.user.id) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Sem permissão para editar este caixa' },
        { status: 403 }
      );
    }

    // Outros cargos (admin, supervisores) não podem editar diretamente
    if (session.user.cargo !== CARGOS.OPERADOR_CAIXA) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Apenas operadores de caixa podem salvar valores' },
        { status: 403 }
      );
    }

    // Verificar se a forma de pagamento existe
    const formaPagamento = await prisma.formaPagamento.findFirst({
      where: {
        id: validatedData.forma_pagamento_id,
        ativo: true
      }
    });

    if (!formaPagamento) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Forma de pagamento não encontrada' },
        { status: 404 }
      );
    }    // Obter a próxima ordem de preenchimento
    const ultimaOrdem = await prisma.transacaoFechamento.findFirst({
      where: { caixaDiarioId: validatedData.caixa_diario_id },
      orderBy: { ordemPreenchimento: 'desc' },
      select: { ordemPreenchimento: true }
    });
    
    const proximaOrdem = ultimaOrdem && ultimaOrdem.ordemPreenchimento ? ultimaOrdem.ordemPreenchimento + 1 : 1;

    // Salvar ou atualizar a transação
    const transacao = await prisma.transacaoFechamento.upsert({
      where: {
        caixaDiarioId_formaPagamentoId: {
          caixaDiarioId: validatedData.caixa_diario_id,
          formaPagamentoId: validatedData.forma_pagamento_id
        }
      },
      update: {
        valor: validatedData.valor,
        timestampSalvo: new Date()
      },
      create: {
        caixaDiarioId: validatedData.caixa_diario_id,
        formaPagamentoId: validatedData.forma_pagamento_id,
        valor: validatedData.valor,
        ordemPreenchimento: proximaOrdem
      },
      include: {
        formaPagamento: {
          select: {
            nome: true,
            codigo: true
          }
        }
      }
    });

    return NextResponse.json({
      sucesso: true,
      transacao: {
        id: transacao.id,
        valor: transacao.valor,
        ordemPreenchimento: transacao.ordemPreenchimento,
        timestampSalvo: transacao.timestampSalvo,
        formaPagamento: transacao.formaPagamento
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Dados inválidos', erros: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao salvar transação progressiva:', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Usuário não autenticado' },
        { status: 401 }
      );
    }    const { searchParams } = new URL(request.url);
    const caixaDiarioId = searchParams.get('caixa_diario_id');

    if (!caixaDiarioId) {
      return NextResponse.json(
        { error: 'ID do caixa é obrigatório' },
        { status: 400 }
      );
    }    // Verificar se o usuário tem permissão para este caixa
    const caixa = await prisma.caixaDiario.findFirst({
      where: {
        id: caixaDiarioId
      }
    });

    if (!caixa) {
      return NextResponse.json(
        { error: 'Caixa não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões: operador só vê seus próprios caixas, supervisores/admin veem todos
    const { CARGOS } = await import('@/lib/database');
    if (session.user.cargo === CARGOS.OPERADOR_CAIXA && caixa.abertoPorUsuarioId !== session.user.id) {
      return NextResponse.json(
        { error: 'Caixa não encontrado ou sem permissão' },
        { status: 403 }
      );
    }// Buscar transações já salvas
    const transacoesSalvas = await prisma.transacaoFechamento.findMany({
      where: {
        caixaDiarioId: caixaDiarioId
      },
      include: {
        formaPagamento: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            ehDinheiro: true,
            ehSistemaW6: true
          }
        }
      },
      orderBy: {
        ordemPreenchimento: 'asc'
      }
    });

    return NextResponse.json({
      transacoes: transacoesSalvas.map(t => ({
        id: t.id,
        forma_pagamento_id: t.formaPagamentoId,
        valor: parseFloat(t.valor.toString()),
        ordem: t.ordemPreenchimento,
        data_criacao: t.timestampSalvo?.toISOString(),
        formaPagamento: {
          id: t.formaPagamento.id,
          nome: t.formaPagamento.nome,
          codigo: t.formaPagamento.codigo,
          eh_dinheiro: t.formaPagamento.ehDinheiro,
          eh_sistema_w6: t.formaPagamento.ehSistemaW6
        }
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar transações salvas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { transacao_id } = body;

    if (!transacao_id) {
      return NextResponse.json(
        { error: 'ID da transação é obrigatório' },
        { status: 400 }
      );
    }    // Verificar se a transação existe
    const transacao = await prisma.transacaoFechamento.findFirst({
      where: {
        id: transacao_id
      },
      include: {
        caixaDiario: true
      }
    });

    if (!transacao) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o caixa está aberto
    if (transacao.caixaDiario.status !== 'Aberto') {
      return NextResponse.json(
        { error: 'Não é possível remover transações de um caixa fechado' },
        { status: 400 }
      );
    }

    // Verificar permissões: apenas operadores podem editar seus próprios caixas
    const { CARGOS } = await import('@/lib/database');
    if (session.user.cargo === CARGOS.OPERADOR_CAIXA && transacao.caixaDiario.abertoPorUsuarioId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para editar este caixa' },
        { status: 403 }
      );
    }

    // Outros cargos (admin, supervisores) não podem editar diretamente
    if (session.user.cargo !== CARGOS.OPERADOR_CAIXA) {
      return NextResponse.json(
        { error: 'Apenas operadores de caixa podem remover valores' },
        { status: 403 }
      );
    }

    // Remover a transação
    await prisma.transacaoFechamento.delete({
      where: {
        id: transacao_id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Transação removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover transação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
