import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

/**
 * API para atualizar dados da sessão do usuário
 * Usado após mudanças importantes como ativação de MFA
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Buscar dados atualizados do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        isMfaEnabled: true
      }
    })

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    }

    // Retornar dados atualizados para o cliente atualizar a sessão
    return NextResponse.json({
      sucesso: true,
      usuario: {
        id: usuario.id,
        name: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        isMfaEnabled: usuario.isMfaEnabled
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar sessão:', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
