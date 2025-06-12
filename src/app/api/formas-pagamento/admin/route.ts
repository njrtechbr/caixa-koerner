import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Buscar todas as formas de pagamento (incluindo inativas), ordenadas
    const formasPagamento = await prisma.formaPagamento.findMany({
      orderBy: {
        ordem: 'asc'
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
      formasPagamento
    });

  } catch (error) {
    console.error('Erro ao buscar formas de pagamento (admin):', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

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
    const { nome, codigo, ativo, eh_dinheiro, eh_sistema_w6 } = body;

    // Validações
    if (!nome || !codigo) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Nome e código são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma forma com o mesmo código
    const formaExistente = await prisma.formaPagamento.findUnique({
      where: { codigo }
    });

    if (formaExistente) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Já existe uma forma de pagamento com este código' },
        { status: 400 }
      );
    }

    // Buscar a maior ordem atual para colocar a nova forma no final
    const ultimaForma = await prisma.formaPagamento.findFirst({
      orderBy: { ordem: 'desc' },
      select: { ordem: true }
    });

    const novaOrdem = (ultimaForma?.ordem || 0) + 1;

    // Criar nova forma de pagamento
    const novaForma = await prisma.formaPagamento.create({
      data: {
        nome,
        codigo,
        ordem: novaOrdem,
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
      forma: novaForma,
      mensagem: 'Forma de pagamento criada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar forma de pagamento:', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
