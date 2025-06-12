import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { direcao } = body; // 'up' ou 'down'

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

    if (direcao === 'up') {
      // Mover para cima - trocar com a forma anterior
      const formaAnterior = await prisma.formaPagamento.findFirst({
        where: {
          ordem: {
            lt: forma.ordem
          }
        },
        orderBy: {
          ordem: 'desc'
        }
      });

      if (formaAnterior) {
        // Trocar as ordens
        await prisma.$transaction([
          prisma.formaPagamento.update({
            where: { id: forma.id },
            data: { ordem: formaAnterior.ordem }
          }),
          prisma.formaPagamento.update({
            where: { id: formaAnterior.id },
            data: { ordem: forma.ordem }
          })
        ]);
      }
    } else if (direcao === 'down') {
      // Mover para baixo - trocar com a próxima forma
      const proximaForma = await prisma.formaPagamento.findFirst({
        where: {
          ordem: {
            gt: forma.ordem
          }
        },
        orderBy: {
          ordem: 'asc'
        }
      });

      if (proximaForma) {
        // Trocar as ordens
        await prisma.$transaction([
          prisma.formaPagamento.update({
            where: { id: forma.id },
            data: { ordem: proximaForma.ordem }
          }),
          prisma.formaPagamento.update({
            where: { id: proximaForma.id },
            data: { ordem: forma.ordem }
          })
        ]);
      }
    } else {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Direção inválida. Use "up" ou "down"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Ordem atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao reordenar forma de pagamento:', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
