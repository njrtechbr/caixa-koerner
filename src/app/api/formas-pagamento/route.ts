import { NextResponse } from 'next/server';
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

    // Buscar todas as formas de pagamento ativas, ordenadas
    const formasPagamento = await prisma.formaPagamento.findMany({
      where: {
        ativo: true
      },
      orderBy: {
        ordem: 'asc'
      },
      select: {
        id: true,
        nome: true,
        codigo: true,
        ordem: true,
        ehDinheiro: true,
        ehSistemaW6: true
      }
    });    return NextResponse.json({
      sucesso: true,
      formas: formasPagamento
    });

  } catch (error) {
    console.error('Erro ao buscar formas de pagamento:', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
