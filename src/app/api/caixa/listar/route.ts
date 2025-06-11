import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ sucesso: false, mensagem: 'Usuário não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let whereClause: any = {};

  if (status) {
    if (status === 'aberto') {
      whereClause.status = 'Aberto'; // Status 'Aberto' com 'A' maiúsculo
    } else {
      whereClause.status = status;
    }
  }

  if (session.user.cargo === 'operador_caixa') {
    whereClause.abertoPorUsuarioId = session.user.id; // Correto: campo do schema Prisma
  }
  // Log for debugging the query being executed
  console.log('Executing caixa query with whereClause:', JSON.stringify(whereClause));
  console.log('User session info:', session.user);
  
  try {
    const caixas = await prisma.caixaDiario.findMany({
      where: whereClause,
      include: {
        abertoPorUsuario: { // Relação correta para o usuário que abriu
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        fechadoPorUsuario: { // Relação correta para o usuário que fechou
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        revisadoPorUsuario: { // Relação correta para o usuário que revisou/conferiu
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        transacoesFechamento: true, // Relação para transações de fechamento
        movimentacoesCaixa: true,   // Relação para movimentações de caixa
      },
      orderBy: {
        dataAbertura: 'desc', // Campo correto para ordenação
      },
    });    const caixasFormatados = caixas.map((caixa: any) => {
      let valorTotalFechamento = 0;
      if (caixa.transacoesFechamento && Array.isArray(caixa.transacoesFechamento)) {
        valorTotalFechamento = caixa.transacoesFechamento.reduce((total: number, transacao: any) => {
          return total + Number(transacao.valor);
        }, 0);
      }

      const formatDecimal = (value: any): string | null => 
        value ? value.toString() : null;
      
      const formatDate = (value: Date | null | undefined): string | null =>
        value ? value.toISOString() : null;

      return {
        // Campos diretos de CaixaDiario (convertidos conforme necessário)
        id: caixa.id,
        data_movimento: formatDate(caixa.dataMovimento),
        dataMovimento: formatDate(caixa.dataMovimento), // Campo duplicado para compatibilidade
        valor_inicial: formatDecimal(caixa.valorInicial),
        valorInicial: formatDecimal(caixa.valorInicial), // Campo duplicado para compatibilidade
        status: caixa.status,
        aberto_por_usuario_id: caixa.abertoPorUsuarioId,
        abertoPorUsuarioId: caixa.abertoPorUsuarioId, // Campo duplicado para compatibilidade
        data_abertura: formatDate(caixa.dataAbertura),
        dataAbertura: formatDate(caixa.dataAbertura), // Campo duplicado para compatibilidade
        fechado_por_usuario_id: caixa.fechadoPorUsuarioId,
        fechadoPorUsuarioId: caixa.fechadoPorUsuarioId, // Campo duplicado para compatibilidade
        data_fechamento: formatDate(caixa.dataFechamento),
        dataFechamento: formatDate(caixa.dataFechamento), // Campo duplicado para compatibilidade
        revisado_por_usuario_id: caixa.revisadoPorUsuarioId,
        revisadoPorUsuarioId: caixa.revisadoPorUsuarioId, // Campo duplicado para compatibilidade
        data_revisao: formatDate(caixa.dataRevisao),
        dataRevisao: formatDate(caixa.dataRevisao), // Campo duplicado para compatibilidade
        motivo_rejeicao: caixa.motivoRejeicao,
        motivoRejeicao: caixa.motivoRejeicao, // Campo duplicado para compatibilidade
        valor_sistema_w6: formatDecimal(caixa.valorSistemaW6),
        valorSistemaW6: formatDecimal(caixa.valorSistemaW6), // Campo duplicado para compatibilidade

        // Dados de relações (convertidos conforme necessário)
        aberto_por: caixa.abertoPorUsuario ? {
            id: caixa.abertoPorUsuario.id,
            nome: caixa.abertoPorUsuario.nome,
            email: caixa.abertoPorUsuario.email,
        } : null,
        abertoPorUsuario: caixa.abertoPorUsuario ? { // Campo duplicado para compatibilidade
            id: caixa.abertoPorUsuario.id,
            nome: caixa.abertoPorUsuario.nome,
            email: caixa.abertoPorUsuario.email,
        } : null,
        fechado_por: caixa.fechadoPorUsuario ? {
            id: caixa.fechadoPorUsuario.id,
            nome: caixa.fechadoPorUsuario.nome,
            email: caixa.fechadoPorUsuario.email,
        } : null,
        revisado_por: caixa.revisadoPorUsuario ? {
            id: caixa.revisadoPorUsuario.id,
            nome: caixa.revisadoPorUsuario.nome,
            email: caixa.revisadoPorUsuario.email,
        } : null,          // Campos duplicados para compatibilidade - snake_case
        transacoes: caixa.transacoesFechamento?.map((t: any) => ({
          id: t.id,
          caixa_diario_id: t.caixaDiarioId,
          caixaDiarioId: t.caixaDiarioId, // Campo duplicado para compatibilidade
          tipo_pagamento: t.tipoPagamento,
          tipoPagamento: t.tipoPagamento, // Campo duplicado para compatibilidade
          valor: formatDecimal(t.valor),
        })) || [],

        // Campos duplicados para compatibilidade - camelCase
        transacoesFechamento: caixa.transacoesFechamento?.map((t: any) => ({
          id: t.id,
          caixa_diario_id: t.caixaDiarioId,
          caixaDiarioId: t.caixaDiarioId,
          tipo_pagamento: t.tipoPagamento,
          tipoPagamento: t.tipoPagamento,
          valor: formatDecimal(t.valor),
        })) || [],

        // Campos duplicados para compatibilidade - snake_case
        movimentacoes: caixa.movimentacoesCaixa?.map((m: any) => ({
          id: m.id,
          caixa_diario_id: m.caixaDiarioId,
          caixaDiarioId: m.caixaDiarioId, // Campo duplicado para compatibilidade
          tipo: m.tipo,
          valor: formatDecimal(m.valor),
          descricao: m.descricao,
          status: m.status,
          solicitante_id: m.solicitanteId,
          solicitanteId: m.solicitanteId, // Campo duplicado para compatibilidade
          data_solicitacao: formatDate(m.dataSolicitacao),
          dataSolicitacao: formatDate(m.dataSolicitacao), // Campo duplicado para compatibilidade
          aprovador_id: m.aprovadorId,
          aprovadorId: m.aprovadorId, // Campo duplicado para compatibilidade
          data_decisao: formatDate(m.dataDecisao),
          dataDecisao: formatDate(m.dataDecisao), // Campo duplicado para compatibilidade
        })) || [],

        // Campos duplicados para compatibilidade - camelCase
        movimentacoesCaixa: caixa.movimentacoesCaixa?.map((m: any) => ({
          id: m.id,
          caixa_diario_id: m.caixaDiarioId,
          caixaDiarioId: m.caixaDiarioId,
          tipo: m.tipo,
          valor: formatDecimal(m.valor),
          descricao: m.descricao,
          status: m.status,
          solicitante_id: m.solicitanteId,
          solicitanteId: m.solicitanteId,
          data_solicitacao: formatDate(m.dataSolicitacao),
          dataSolicitacao: formatDate(m.dataSolicitacao),
          aprovador_id: m.aprovadorId,
          aprovadorId: m.aprovadorId,
          data_decisao: formatDate(m.dataDecisao),
          dataDecisao: formatDate(m.dataDecisao),
        })) || [],
        
        valor_total_fechamento: valorTotalFechamento.toString(),
      };
    });    console.log('Found caixas:', caixas.length, caixas);
    console.log('Formatted caixas:', caixasFormatados);
    return NextResponse.json({ sucesso: true, caixas: caixasFormatados });
  } catch (error) {
    console.error('Erro ao listar caixas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ sucesso: false, mensagem: 'Erro ao buscar caixas', detalhe: errorMessage }, { status: 500 });
  }
}
