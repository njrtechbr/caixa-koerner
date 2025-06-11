# Credenciais de Desenvolvimento - Sistema Controle de Caixa

Este documento contém as credenciais de teste para desenvolvimento do Sistema de Controle de Caixa do Cartório Koerner.

## 🔐 Usuários de Teste

### Administrador
- **Email:** `admin@cartoriokoerner.com.br`
- **Senha:** `Admin@123456`
- **Cargo:** `admin`
- **Permissões:** Acesso completo ao sistema, gerenciamento de usuários e configurações

### Operador de Caixa
- **Email:** `operador@cartoriokoerner.com.br`
- **Senha:** `Operador@123`
- **Cargo:** `operador_caixa`
- **Permissões:** Abrir/fechar caixa, solicitar sangrias/entradas/correções

### Operador de Caixa 2
- **Email:** `operador2@cartoriokoerner.com.br`
- **Senha:** `Operador2@123`
- **Cargo:** `operador_caixa`
- **Permissões:** Abrir/fechar caixa, solicitar sangrias/entradas/correções

### Supervisor de Caixa
- **Email:** `supervisor.caixa@cartoriokoerner.com.br`
- **Senha:** `Supervisor@123`
- **Cargo:** `supervisor_caixa`
- **Permissões:** Conferir caixas, aprovar/reprovar solicitações

### Supervisor de Conferência
- **Email:** `supervisor.conferencia@cartoriokoerner.com.br`
- **Senha:** `SupervisorConf@123`
- **Cargo:** `supervisor_conferencia`
- **Permissões:** Painel consolidado, validação final do dia

## 🔧 Configurações do Sistema

As seguintes configurações foram inseridas no banco:

- **conferencia_cega_dinheiro_habilitada:** `true`
- **sistema_versao:** `1.0.0`
- **sistema_nome:** `Sistema de Controle de Caixa - Cartório Koerner`

## 🚀 Como Testar

1. **Acesse o sistema:** http://localhost:3000
2. **Faça login** com qualquer uma das credenciais acima
3. **Configure MFA:** No primeiro login, será solicitado configurar o MFA/TOTP
   - Use um aplicativo como Google Authenticator ou Authy
   - Escaneie o QR Code gerado
   - Guarde os códigos de backup fornecidos
4. **Teste os fluxos:**
   - **Operador:** Abrir caixa → Fechar caixa → Solicitar sangria/entrada
   - **Supervisor Caixa:** Conferir caixas → Aprovar/reprovar solicitações
   - **Supervisor Conferência:** Visualizar painel → Validar dia
   - **Admin:** Gerenciar usuários → Configurar sistema

## ⚠️ Avisos Importantes

- **Ambiente de Desenvolvimento:** Estas credenciais são apenas para desenvolvimento
- **Altere as Senhas:** Mude todas as senhas após o primeiro login
- **MFA Obrigatório:** Todos os usuários devem configurar MFA antes de usar o sistema
- **Códigos de Backup:** Guarde os códigos de backup em local seguro

## 🔒 Fluxo de Teste MFA

Para testar sem um aplicativo autenticador real:

1. Durante a configuração do MFA, use qualquer aplicativo TOTP
2. Ou para desenvolvimento rápido, use códigos de 6 dígitos válidos
3. Códigos de backup têm formato: `XXXX-YYYY` (ex: `A1B2-C3D4`)

## 📋 Comandos Úteis

```bash
# Resetar banco de dados
npm run db:reset

# Executar seed novamente
npm run db:seed

# Visualizar banco no Prisma Studio
npm run db:studio

# Rodar migrações
npm run db:migrate

# Iniciar servidor de desenvolvimento
npm run dev
```

## 🌐 URLs de Acesso

- **Sistema Principal:** http://localhost:9002
- **Prisma Studio:** http://localhost:5555 (após `npm run db:studio`)
- **API Docs:** http://localhost:9002/api (endpoints REST)

---

**Data de Criação:** ${new Date().toLocaleDateString('pt-BR')}  
**Versão:** 1.0.0  
**Status:** Desenvolvimento
