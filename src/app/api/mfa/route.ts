import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { setupMFA, verifyTOTP } from '@/lib/mfa'
import { encryptData, hashBackupCode } from '@/lib/security'

/**
 * API para configurar MFA/TOTP
 * Gera QR Code e códigos de backup para um usuário
 */

// Configurar MFA para o usuário
export async function POST(request: NextRequest) {
  try {
    // TEMPORÁRIO: Permitir teste sem autenticação durante desenvolvimento
    const isDev = process.env.NODE_ENV === 'development'
    
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!isDev && !session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Para desenvolvimento, usar um usuário de teste se não houver sessão
    let userId = session?.user?.id
    let userEmail = session?.user?.email || 'test@koerner.com'
    let userName = 'Usuário Teste'

    if (isDev && !session?.user?.id) {
      console.log('🧪 Modo desenvolvimento: usando dados de teste')
      // Gerar dados MFA apenas para teste
      const mfaData = await setupMFA(userEmail)
      
      console.log('✅ QR Code gerado (teste), URL length:', mfaData.qrCodeDataUrl.length)
      console.log('✅ Backup codes gerados (teste):', mfaData.backupCodes.length)

      return NextResponse.json({
        sucesso: true,
        desenvolvimento: true,
        dados: {
          qrCodeDataUrl: mfaData.qrCodeDataUrl,
          backupCodes: mfaData.backupCodes,
          email: userEmail
        },
        mensagem: 'Teste MFA - QR Code gerado para desenvolvimento'
      })
    }    // Buscar dados do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId! },
      select: {
        id: true,
        nome: true,
        email: true,
        isMfaEnabled: true
      }
    })

    console.log('👤 Usuário encontrado:', usuario ? `${usuario.nome} (${usuario.email})` : 'Não encontrado')

    if (!usuario) {
      console.log('❌ Erro: Usuário não encontrado no banco de dados')
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      )
    }    // Se MFA já está habilitado, retornar informação sobre status
    if (usuario.isMfaEnabled) {
      console.log('⚠️ MFA já está habilitado para este usuário')
      return NextResponse.json({
        sucesso: true,
        jaConfigurado: true,
        mensagem: 'MFA já está configurado e ativo para este usuário',
        dados: {
          email: usuario.email,
          nome: usuario.nome
        }
      })
    }

    console.log('🚀 Gerando dados MFA...')
    // Gerar dados MFA
    const mfaData = await setupMFA(usuario.email)
    console.log('✅ QR Code gerado, secret length:', mfaData.secret.length)
    console.log('✅ Backup codes gerados:', mfaData.backupCodes.length)
    
    // Criptografar secret antes de salvar
    const encryptedSecret = encryptData(mfaData.secret)    // Hash dos códigos de backup e salvar na tabela separada
    const backupCodePromises = mfaData.backupCodes.map(async (code) => {
      const hashedCode = await hashBackupCode(code)
      return { usuarioId: session!.user.id, codeHash: hashedCode }
    })
    const backupCodeData = await Promise.all(backupCodePromises)

    // Salvar dados MFA temporariamente (será ativado após verificação)
    await prisma.$transaction(async (tx) => {
      // Atualizar usuário com secret MFA
      await tx.usuario.update({
        where: { id: session!.user.id },
        data: {
          mfaSecret: encryptedSecret
          // isMfaEnabled permanece false até verificação
        }
      })

      // Criar códigos de backup
      await tx.usuarioBackupCode.createMany({
        data: backupCodeData
      })
    })    // Log da operação
    console.log(`✅ Setup MFA iniciado para usuário ${usuario.nome} (${session!.user.id})`)

    return NextResponse.json({
      sucesso: true,
      dados: {
        qrCodeDataUrl: mfaData.qrCodeDataUrl,
        backupCodes: mfaData.backupCodes,
        email: usuario.email
      },
      mensagem: 'QR Code gerado. Configure seu aplicativo autenticador e confirme com um código.'
    })

  } catch (error) {
    console.error('❌ Erro ao configurar MFA:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Ativar MFA após verificação do código
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

    const body = await request.json()
    const { mfaCode } = body

    if (!mfaCode || !/^\d{6}$/.test(mfaCode)) {
      return NextResponse.json(
        { erro: 'Código MFA inválido' },
        { status: 400 }
      )
    }

    // Buscar dados do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        isMfaEnabled: true,
        mfaSecret: true
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    if (usuario.isMfaEnabled) {
      return NextResponse.json(
        { erro: 'MFA já está ativo para este usuário' },
        { status: 400 }
      )
    }

    if (!usuario.mfaSecret) {
      return NextResponse.json(
        { erro: 'MFA não foi configurado. Execute POST primeiro.' },
        { status: 400 }
      )
    }

    // Descriptografar secret e verificar código
    const { decryptData } = await import('@/lib/security')
    const secret = decryptData(usuario.mfaSecret)
    
    const isValidCode = verifyTOTP(mfaCode, secret)
    
    if (!isValidCode) {
      return NextResponse.json(
        { erro: 'Código MFA incorreto' },
        { status: 400 }
      )
    }

    // Ativar MFA
    await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        isMfaEnabled: true
      }
    })

    // Log da operação
    console.log(`MFA ativado para usuário ${usuario.nome} (${session.user.id})`)

    return NextResponse.json({
      sucesso: true,
      mensagem: 'MFA ativado com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao ativar MFA:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Desativar MFA (apenas admin)
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Apenas admin pode desativar MFA de outros usuários
    if (session.user.cargo !== 'admin') {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores podem desativar MFA.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get('userId') || session.user.id

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        isMfaEnabled: true
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    if (!usuario.isMfaEnabled) {
      return NextResponse.json(
        { erro: 'MFA não está ativo para este usuário' },
        { status: 400 }
      )
    }    // Desativar MFA
    await prisma.$transaction(async (tx) => {
      // Remover códigos de backup
      await tx.usuarioBackupCode.deleteMany({
        where: { usuarioId: usuarioId }
      })

      // Atualizar usuário
      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          isMfaEnabled: false,
          mfaSecret: null
        }
      })
    })

    // Log da operação
    console.log(`MFA desativado para usuário ${usuario.nome} (${usuarioId}) por admin ${session.user.name} (${session.user.id})`)

    return NextResponse.json({
      sucesso: true,
      mensagem: `MFA desativado para usuário ${usuario.nome}`
    })

  } catch (error) {
    console.error('Erro ao desativar MFA:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
