'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function AuthTestPage() {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('mfa.test@cartoriokoerner.com.br')
  const [password, setPassword] = useState('MfaTest@123')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })
      
      console.log('Login result:', result)
      
      if (result?.error) {
        alert('Erro no login: ' + result.error)
      }
    } catch (error) {
      console.error('Erro durante login:', error)
      alert('Erro durante login')
    } finally {
      setLoading(false)
    }
  }

  const testMfaApi = async () => {
    try {
      const response = await fetch('/api/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('MFA API response:', data)
      
      if (data.sucesso) {
        alert('MFA API funcionando! QR Code gerado.')
      } else {
        alert('Erro na API MFA: ' + (data.erro || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao testar MFA API:', error)
      alert('Erro ao testar MFA API')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">🔧 Teste de Autenticação</h1>
      
      {status === 'loading' && (
        <div className="text-center text-gray-600">Carregando...</div>
      )}
      
      {status === 'unauthenticated' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Login de Teste</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Fazendo login...' : 'Fazer Login'}
          </button>
          
          <div className="text-sm text-gray-600 mt-4">
            <h3 className="font-semibold">Usuários de teste:</h3>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>admin@cartoriokoerner.com.br | Admin@123456</li>
              <li>mfa.test@cartoriokoerner.com.br | MfaTest@123</li>
              <li>operador@cartoriokoerner.com.br | Operador@123</li>
            </ul>
          </div>
        </div>
      )}
      
      {status === 'authenticated' && session && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-green-600">✅ Autenticado!</h2>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <p><strong>Nome:</strong> {session.user?.name}</p>
            <p><strong>Email:</strong> {session.user?.email}</p>
            <p><strong>ID:</strong> {session.user?.id}</p>
            <p><strong>Cargo:</strong> {(session.user as any)?.cargo}</p>
            <p><strong>MFA Habilitado:</strong> {(session.user as any)?.isMfaEnabled ? 'Sim' : 'Não'}</p>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={testMfaApi}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
            >
              🔐 Testar API MFA
            </button>
            
            <button
              onClick={() => window.location.href = '/mfa-setup'}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              🔧 Ir para MFA Setup
            </button>
            
            <button
              onClick={() => signOut()}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
