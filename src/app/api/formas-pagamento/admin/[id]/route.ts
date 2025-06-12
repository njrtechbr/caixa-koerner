import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { nome, codigo, ativo, eh_dinheiro, eh_sistema_w6 } = body;

    // Validações
    if (!nome || !codigo) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Nome e código são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a forma existe
    const formaExistente = await prisma.formaPagamento.findUnique({
      where: { id }
    });

    if (!formaExistente) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Forma de pagamento não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existe outra forma com o mesmo código
    const outraFormaComCodigo = await prisma.formaPagamento.findFirst({
      where: {
        codigo,
        NOT: { id }
      }
    });

    if (outraFormaComCodigo) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Já existe outra forma de pagamento com este código' },
        { status: 400 }
      );
    }

    // Atualizar forma de pagamento
    const formaAtualizada = await prisma.formaPagamento.update({
      where: { id },
      data: {
        nome,
        codigo,
        ativo: ativo ?? true,
        ehDinheiro: eh_dinheiro ?? false,
        ehSistemaW6: eh_sistema_w6 ?? false
      },
      select: {
        id: true,
        nome: true,
        codigo: true,
        ordem: true,
        ativo: true,
        ehDinheiro: true,
        ehSistemaW6: true
      }
    });

    return NextResponse.json({
      sucesso: true,
      forma: formaAtualizada,
      mensagem: 'Forma de pagamento atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar forma de pagamento:', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Verificar se a forma existe
    const forma = await prisma.formaPagamento.findUnique({
      where: { id }
    });

    if (!forma) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Forma de pagamento não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se é uma forma protegida (Dinheiro ou Sistema W6)
    if (forma.ehDinheiro || forma.ehSistemaW6) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Esta forma de pagamento não pode ser excluída' },
        { status: 400 }
      );
    }    // Verificar se existem movimentações usando esta forma
    const movimentacoesExistentes = await prisma.transacaoFechamento.findFirst({
      where: { formaPagamentoId: id }
    });    if (movimentacoesExistentes) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Não é possível excluir esta forma de pagamento pois existem transações associadas' },
        { status: 400 }
      );
    }

    // Excluir forma de pagamento
    await prisma.formaPagamento.delete({
      where: { id }
    });

    // Reordenar as formas restantes
    const formasRestantes = await prisma.formaPagamento.findMany({
      orderBy: { ordem: 'asc' }
    });

    // Atualizar a ordem das formas restantes
    for (let i = 0; i < formasRestantes.length; i++) {
      await prisma.formaPagamento.update({
        where: { id: formasRestantes[i].id },
        data: { ordem: i + 1 }
      });
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Forma de pagamento excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir forma de pagamento:', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
