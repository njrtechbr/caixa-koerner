import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, STATUS_CAIXA, CARGOS } from '@/lib/database'
import { FecharCaixaSchema } from '@/lib/schemas'
import { verifyTOTP } from '@/lib/mfa'
import { decryptData } from '@/lib/security'

/**
 * API Route para fechar um caixa diário.
 * Apenas usuários com o cargo de 'operador_caixa' podem acessar esta funcionalidade.
 * Requer autenticação e verificação de MFA se habilitado para o usuário.
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação e obter sessão do usuário.
    // Utiliza `getServerSession` com as `authOptions` para validar o token JWT da requisição.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ erro: 'Não autenticado. Acesso negado.' }, { status: 401 });
    }

    // 2. Verificar permissão: apenas 'operador_caixa' pode fechar caixa.
    // O cargo do usuário é obtido da sessão (do token JWT).
    if (session.user.cargo !== CARGOS.OPERADOR_CAIXA) {
      return NextResponse.json({ erro: 'Acesso negado. Apenas operadores de caixa podem fechar caixas.' }, { status: 403 });
    }

    // 3. Validar dados da requisição.
    // O corpo da requisição (JSON) deve seguir o schema `FecharCaixaSchema`.
    const body = await request.json();
    const validacao = FecharCaixaSchema.safeParse(body);

    if (!validacao.success) {
      // Se a validação falhar, retorna erro 400 com detalhes dos campos inválidos.
      return NextResponse.json(
        { erro: 'Dados inválidos para fechamento de caixa.', detalhes: validacao.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { transacoes, mfaCode } = validacao.data; // Dados validados.

    // 4. Buscar dados do usuário, incluindo segredo MFA se habilitado.
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, nome: true, isMfaEnabled: true, mfaSecret: true }
    });

    if (!usuario) {
      // Caso raro, pois o usuário foi autenticado. Pode indicar inconsistência de dados.
      return NextResponse.json({ erro: 'Usuário da sessão não encontrado no banco.' }, { status: 404 });
    }

    // 5. Verificar código MFA se o MFA estiver habilitado para o usuário.
    if (usuario.isMfaEnabled) {
      if (!usuario.mfaSecret) {
        // Erro crítico: MFA habilitado mas sem segredo no banco. Indica problema de integridade de dados.
        console.error(`MFA habilitado para usuário ${usuario.id} mas mfaSecret está ausente.`);
        return NextResponse.json({ erro: 'Configuração de MFA do usuário está inválida. Contate o suporte.' }, { status: 500 });
      }
      if (!mfaCode || !/^\d{6}$/.test(mfaCode)) {
        // Código MFA não fornecido ou em formato inválido.
        return NextResponse.json({ erro: 'Código MFA ausente ou em formato inválido (esperado 6 dígitos).' }, { status: 400 });
      }

      // Descriptografa o segredo MFA e verifica o código TOTP.
      const secret = decryptData(usuario.mfaSecret); // `decryptData` lida com possíveis erros de descriptografia.
      const isValidMFA = verifyTOTP(mfaCode, secret);
      if (!isValidMFA) {
        return NextResponse.json({ erro: 'Código MFA inválido. Tente novamente.' }, { status: 400 });
      }
    }
    // else {
      // TODO: Considerar política da empresa: Se MFA é obrigatório para *esta operação específica*
      // mesmo que o usuário não tenha MFA configurado globalmente.
      // Por ora, se `usuario.isMfaEnabled` for false, o MFA não é exigido aqui.
    // }

    // 6. Localizar o caixa diário aberto para o usuário na data atual.
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Normaliza para o início do dia.

    const caixaAberto = await prisma.caixaDiario.findFirst({
      where: {
        abertoPorUsuarioId: session.user.id,
        dataMovimento: hoje, // Caixa correspondente à data de hoje.
        status: STATUS_CAIXA.ABERTO // Apenas caixas com status 'Aberto'.
      }
    });

    if (!caixaAberto) {
      return NextResponse.json({ erro: 'Nenhum caixa aberto encontrado para este usuário na data de hoje.' }, { status: 400 });
    }

    // 7. Calcular o valor total das transações de fechamento.
    const valorTotalTransacoes = transacoes.reduce((total, transacao) => {
      return total + Number(transacao.valor); // Garante que `valor` seja numérico.
    }, 0);

    // 8. Executar o fechamento do caixa e registro das transações em uma transação de banco de dados.
    // Isso garante atomicidade: ou todas as operações são bem-sucedidas, ou nenhuma é aplicada.
    const caixaFechado = await prisma.$transaction(async (tx) => {
      // Atualiza o status do caixa para 'Fechado - Aguardando Conferência'.
      const caixaAtualizado = await tx.caixaDiario.update({
        where: { id: caixaAberto.id },
        data: {
          status: STATUS_CAIXA.FECHADO_AGUARDANDO_CONFERENCIA,
          fechadoPorUsuarioId: session.user.id, // Registra quem fechou.
          dataFechamento: new Date() // Registra data/hora do fechamento.
        }
      });

      // Cria os registros das transações de fechamento associadas a este caixa.
      await tx.transacaoFechamento.createMany({
        data: transacoes.map(transacao => ({
          caixaDiarioId: caixaAberto.id,
          tipoPagamento: transacao.tipoPagamento,
          valor: transacao.valor // `valor` já validado pelo Zod schema.
        }))
      });

      return caixaAtualizado; // Retorna o objeto do caixa atualizado.
    });

    // 9. Retornar resposta de sucesso.
    return NextResponse.json({
      sucesso: true,
      caixa: {
        id: caixaFechado.id,
        status: caixaFechado.status,
        dataFechamento: caixaFechado.dataFechamento,
        valorTotalDeclarado: valorTotalTransacoes, // Nome mais claro para o total.
        totalTransacoes: transacoes.length
      },
      mensagem: 'Caixa fechado com sucesso e enviado para conferência.'
    });

  } catch (error) {
    // Tratamento de erros inesperados ou exceções lançadas (ex: falha na descriptografia, erro de DB).
    console.error('Erro crítico ao fechar caixa:', error);
    // Retorna um erro genérico 500 para o cliente, evitando vazar detalhes.
    return NextResponse.json(
      { erro: 'Ocorreu um erro interno no servidor ao tentar fechar o caixa.' },
      { status: 500 }
    );
  }
}
