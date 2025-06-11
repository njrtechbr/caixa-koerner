import { useSession } from 'next-auth/react'
import { useState, useCallback } from 'react'

/**
 * Hook personalizado para operações de caixa
 * Integra com as APIs do sistema
 */

export function useCaixa() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  // Abrir caixa
  const abrirCaixa = useCallback(async (valorInicial: number, mfaCode: string) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/caixa/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valorInicial, mfaCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao abrir caixa')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  // Fechar caixa
  const fecharCaixa = useCallback(async (transacoes: any[], mfaCode: string) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/caixa/fechar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transacoes, mfaCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao fechar caixa')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  // Listar caixas
  const listarCaixas = useCallback(async (filtros?: {
    status?: string
    data?: string
    page?: number
    limit?: number
  }) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (filtros?.status) params.append('status', filtros.status)
      if (filtros?.data) params.append('data', filtros.data)
      if (filtros?.page) params.append('page', filtros.page.toString())
      if (filtros?.limit) params.append('limit', filtros.limit.toString())

      const response = await fetch(`/api/caixa/listar?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao listar caixas')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  // Conferir caixa (supervisor)
  const conferirCaixa = useCallback(async (
    caixaId: string, 
    aprovado: boolean, 
    valorDinheiroContado?: number,
    motivoRejeicao?: string,
    mfaCode?: string
  ) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/caixa/conferencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          caixaId, 
          aprovado, 
          valorDinheiroContado,
          motivoRejeicao, 
          mfaCode 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro na conferência')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  return {
    loading,
    error,
    clearError,
    abrirCaixa,
    fecharCaixa,
    listarCaixas,
    conferirCaixa,
  }
}

/**
 * Hook para operações de movimentação (sangria/entrada)
 */
export function useMovimentacao() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  // Solicitar movimentação
  const solicitarMovimentacao = useCallback(async (
    caixaId: string,
    tipo: 'entrada' | 'sangria',
    valor: number,
    descricao: string,
    mfaCode: string
  ) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/movimentacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caixaId, tipo, valor, descricao, mfaCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao solicitar movimentação')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  // Listar movimentações
  const listarMovimentacoes = useCallback(async (status?: string) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)

      const response = await fetch(`/api/movimentacao?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao listar movimentações')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  // Aprovar movimentação (supervisor)
  const aprovarMovimentacao = useCallback(async (
    movimentacaoId: string,
    aprovado: boolean,
    motivoRejeicao?: string,
    mfaCode?: string
  ) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/movimentacao/aprovar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movimentacaoId, aprovado, motivoRejeicao, mfaCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao aprovar movimentação')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  return {
    loading,
    error,
    clearError,
    solicitarMovimentacao,
    listarMovimentacoes,
    aprovarMovimentacao,
  }
}

/**
 * Hook para operações administrativas
 */
export function useAdmin() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  // Gerenciar usuários
  const criarUsuario = useCallback(async (dadosUsuario: {
    nome: string
    email: string
    cargo: string
    senha: string
  }) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosUsuario),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao criar usuário')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  // Listar usuários
  const listarUsuarios = useCallback(async (filtros?: {
    cargo?: string
    page?: number
    limit?: number
  }) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (filtros?.cargo) params.append('cargo', filtros.cargo)
      if (filtros?.page) params.append('page', filtros.page.toString())
      if (filtros?.limit) params.append('limit', filtros.limit.toString())

      const response = await fetch(`/api/usuarios?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao listar usuários')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  // Gerenciar configurações
  const buscarConfiguracoes = useCallback(async () => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/configuracoes')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao buscar configurações')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  const atualizarConfiguracao = useCallback(async (
    chave: string,
    valor: string,
    mfaCode: string
  ) => {
    if (!session) throw new Error('Usuário não autenticado')
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chave, valor, mfaCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao atualizar configuração')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  return {
    loading,
    error,
    clearError,
    criarUsuario,
    listarUsuarios,
    buscarConfiguracoes,
    atualizarConfiguracao,
  }
}
