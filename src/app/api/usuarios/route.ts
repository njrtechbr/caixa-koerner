import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, CARGOS } from '@/lib/database'
import { CriarUsuarioSchema, AtualizarUsuarioSchema } from '@/lib/schemas'
import { hashPassword, generateBackupCodes, hashBackupCode } from '@/lib/security'

/**
 * API para gerenciar usuários
 * Disponível apenas para administradores
 */

// Criar novo usuário
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (apenas admin)
    if (session.user.cargo !== CARGOS.ADMIN) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores podem criar usuários.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = CriarUsuarioSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { nome, email, cargo, senha } = validacao.data

    // Verificar se o email já existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { erro: 'Já existe um usuário com este email' },
        { status: 400 }
      )
    }

    // Gerar hash da senha
    const senhaHash = await hashPassword(senha)

    // Gerar códigos de recuperação
    const backupCodes = generateBackupCodes()
    const backupCodesHash = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    )

    // Criar usuário usando transação
    const novoUsuario = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const usuario = await tx.usuario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          cargo,
          isMfaEnabled: false
        },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          isMfaEnabled: true,
          createdAt: true
        }
      })

      // Criar códigos de recuperação
      await tx.usuarioBackupCode.createMany({
        data: backupCodesHash.map(hash => ({
          usuarioId: usuario.id,
          codeHash: hash
        }))
      })

      return usuario
    })

    return NextResponse.json({
      sucesso: true,
      usuario: novoUsuario,
      backupCodes: backupCodes, // Enviar códigos apenas na criação
      mensagem: 'Usuário criado com sucesso. Códigos de recuperação gerados.'
    })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Listar usuários
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (apenas admin)
    if (session.user.cargo !== CARGOS.ADMIN) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores podem listar usuários.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cargo = searchParams.get('cargo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let whereClause: any = {}
    
    if (cargo) {
      whereClause.cargo = cargo
    }

    // Buscar usuários com paginação
    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where: whereClause,
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          isMfaEnabled: true,
          createdAt: true,
          _count: {
            select: {
              caixasAbertos: true,
              caixasFechados: true,
              movimentacoesSolicitadas: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      
      prisma.usuario.count({
        where: whereClause
      })
    ])

    // Formatar dados para resposta
    const usuariosFormatados = usuarios.map(usuario => ({
      ...usuario,
      estatisticas: {
        caixasAbertos: usuario._count.caixasAbertos,
        caixasFechados: usuario._count.caixasFechados,
        movimentacoesSolicitadas: usuario._count.movimentacoesSolicitadas
      },
      _count: undefined
    }))

    return NextResponse.json({
      sucesso: true,
      usuarios: usuariosFormatados,
      paginacao: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (apenas admin)
    if (session.user.cargo !== CARGOS.ADMIN) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores podem atualizar usuários.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validacao = AtualizarUsuarioSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { id, nome, email, cargo } = validacao.data

    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!usuarioExistente) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Se o email está sendo alterado, verificar se não existe outro usuário com o mesmo email
    if (email && email !== usuarioExistente.email) {
      const emailEmUso = await prisma.usuario.findUnique({
        where: { email }
      })

      if (emailEmUso) {
        return NextResponse.json(
          { erro: 'Já existe um usuário com este email' },
          { status: 400 }
        )
      }
    }

    // Atualizar usuário
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(email && { email }),
        ...(cargo && { cargo })
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        isMfaEnabled: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      sucesso: true,
      usuario: usuarioAtualizado,
      mensagem: 'Usuário atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
