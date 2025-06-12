import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, STATUS_CAIXA, CARGOS } from '@/lib/database'
import { verifyTOTP } from '@/lib/mfa'
import { decryptData } from '@/lib/security'
import { z } from 'zod'

const FecharCaixaSchema = z.object({
  caixaId: z.string().uuid(),
  mfaCode: z.string().min(6).max(6),
  observacoes: z.string().optional()
});

/**
 * API Route para fechar um caixa diário.
 * Agora funciona com o sistema de transações progressivas.
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado' }, { status: 401 });
    }

    // 2. Verificar permissão
    if (session.user.cargo !== CARGOS.OPERADOR_CAIXA) {
      return NextResponse.json({ sucesso: false, mensagem: 'Acesso negado' }, { status: 403 });
    }

    // 3. Validar dados da requisição
    const body = await request.json();
    const validacao = FecharCaixaSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Dados inválidos', detalhes: validacao.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { caixaId, mfaCode, observacoes } = validacao.data;

    // 4. Buscar dados do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, nome: true, isMfaEnabled: true, mfaSecret: true }
    });

    if (!usuario) {
      return NextResponse.json({ sucesso: false, mensagem: 'Usuário não encontrado' }, { status: 404 });
    }

    // 5. Verificar código MFA se habilitado
    if (usuario.isMfaEnabled) {
      if (!usuario.mfaSecret) {
        console.error(`MFA habilitado para usuário ${usuario.id} mas mfaSecret está ausente.`);
        return NextResponse.json({ sucesso: false, mensagem: 'Configuração de MFA inválida' }, { status: 500 });
      }
      
      if (!mfaCode || !/^\d{6}$/.test(mfaCode)) {
        return NextResponse.json({ sucesso: false, mensagem: 'Código MFA inválido (6 dígitos)' }, { status: 400 });
      }

      const secret = decryptData(usuario.mfaSecret);
      const isValidMFA = verifyTOTP(mfaCode, secret);
      if (!isValidMFA) {
        return NextResponse.json({ sucesso: false, mensagem: 'Código MFA incorreto' }, { status: 400 });
      }
    }

    // 6. Verificar se o caixa existe e pertence ao usuário
    const caixa = await prisma.caixaDiario.findFirst({
      where: {
        id: caixaId,
        abertoPorUsuarioId: session.user.id,
        status: STATUS_CAIXA.ABERTO
      },
      include: {
        transacoesFechamento: {
          include: {
            formaPagamento: true
          }
        }
      }
    });

    if (!caixa) {
      return NextResponse.json({ sucesso: false, mensagem: 'Caixa não encontrado ou sem permissão' }, { status: 403 });
    }

    // 7. Verificar se existem transações salvas
    if (caixa.transacoesFechamento.length === 0) {
      return NextResponse.json({ sucesso: false, mensagem: 'Nenhuma transação encontrada para fechamento' }, { status: 400 });
    }

    // 8. Calcular valor total
    const valorTotal = caixa.transacoesFechamento.reduce((total, transacao) => {
      return total + parseFloat(transacao.valor.toString());
    }, 0);

    // 9. Executar fechamento em transação
    const caixaFechado = await prisma.$transaction(async (tx) => {
      // Atualizar status do caixa
      const caixaAtualizado = await tx.caixaDiario.update({
        where: { id: caixaId },
        data: {
          status: STATUS_CAIXA.FECHADO_AGUARDANDO_CONFERENCIA,
          fechadoPorUsuarioId: session.user.id,
          dataFechamento: new Date()
        }
      });

      // Adicionar observações se fornecidas
      if (observacoes) {
        // Aqui poderia ser criado um log ou campo de observações
        console.log(`Observações do fechamento do caixa ${caixaId}: ${observacoes}`);
      }

      return caixaAtualizado;
    });

    return NextResponse.json({
      sucesso: true,
      caixa: {
        id: caixaFechado.id,
        status: caixaFechado.status,
        dataFechamento: caixaFechado.dataFechamento,
        valorTotalDeclarado: valorTotal,
        totalTransacoes: caixa.transacoesFechamento.length
      },
      mensagem: 'Caixa fechado com sucesso e enviado para conferência.'
    });

  } catch (error) {
    console.error('Erro ao fechar caixa:', error);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
