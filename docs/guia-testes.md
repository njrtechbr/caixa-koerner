# Guia Rápido de Testes - Sistema Caixa Koerner

## 🚀 Status da Implementação

✅ **PostgreSQL:** Configurado e funcionando  
✅ **Usuários:** Criados e funcionais  
✅ **Autenticação:** NextAuth.js integrado  
✅ **MFA/TOTP:** Implementado e funcional  
✅ **APIs:** 9 endpoints implementados  
✅ **Frontend:** Páginas principais criadas  
✅ **Middleware:** Proteção por cargo  
✅ **Banco de Dados:** Schema completo  

## 🔗 Acesso Rápido

**Sistema:** http://localhost:9002  
**Banco:** `npm run db:studio` → http://localhost:5555

## 👥 Usuários Disponíveis

| Cargo | Email | Senha | MFA |
|-------|-------|-------|-----|
| 🔐 Admin | admin@cartoriokoerner.com.br | Admin@123456 | ❌ |
| 👤 Operador 1 | operador@cartoriokoerner.com.br | Operador@123 | ❌ |
| 👤 Operador 2 | operador2@cartoriokoerner.com.br | Operador2@123 | ❌ |
| 👥 Supervisor Caixa | supervisor.caixa@cartoriokoerner.com.br | Supervisor@123 | ❌ |
| 👥 Supervisor Conf. | supervisor.conferencia@cartoriokoerner.com.br | SupervisorConf@123 | ❌ |

## 🧪 Fluxo de Teste Completo

### 1. Setup Inicial
```powershell
# Verificar se o servidor está rodando
http://localhost:9002

# Verificar banco de dados
npm run db:studio
```

### 2. Teste de Login e MFA

1. **Acesse:** http://localhost:9002
2. **Login:** Use qualquer usuário da tabela acima
3. **Configure MFA:** 
   - Escaneie o QR Code com Google Authenticator
   - Ou use qualquer app TOTP (Authy, Microsoft Authenticator)
   - Guarde os códigos de backup
4. **Teste:** Faça logout e login novamente

### 3. Teste Fluxo Operador

**Login:** `operador@cartoriokoerner.com.br` / `Operador@123`

1. **Abrir Caixa:**
   - Ir para: Operador de Caixa → Abrir Caixa
   - Definir valor inicial (ex: R$ 100,00)
   - Inserir código MFA
   - ✅ Caixa deve abrir com sucesso

2. **Fechar Caixa:**
   - Ir para: Operador de Caixa → Fechar Caixa
   - Preencher valores (Dinheiro, Pix, Débito, etc.)
   - Inserir código MFA
   - ✅ Caixa deve fechar e ir para conferência

3. **Solicitar Sangria/Entrada:**
   - Ir para: Operador de Caixa → Solicitações
   - Criar solicitação com valor e justificativa
   - Inserir código MFA
   - ✅ Solicitação deve ficar pendente

### 4. Teste Fluxo Supervisor Caixa

**Login:** `supervisor.caixa@cartoriokoerner.com.br` / `Supervisor@123`

1. **Conferir Caixa:**
   - Ir para: Supervisor de Caixa → Conferir Caixas
   - Selecionar caixa fechado
   - Conferir valores (cega ou aberta conforme configuração)
   - Inserir código MFA para aprovar/reprovar

2. **Aprovar Solicitações:**
   - Ir para: Supervisor de Caixa → Aprovar Solicitações
   - Revisar solicitações pendentes
   - Inserir código MFA para aprovar/reprovar

### 5. Teste Fluxo Supervisor Conferência

**Login:** `supervisor.conferencia@cartoriokoerner.com.br` / `SupervisorConf@123`

1. **Painel Consolidado:**
   - Ir para: Supervisor de Conferência → Painel Consolidado
   - Visualizar resumo diário
   - Comparar valores declarados vs conferidos

2. **Validação Final:**
   - Ir para: Supervisor de Conferência → Validar Dia
   - Inserir código MFA para validar
   - ✅ Dia deve ser validado e selado

### 6. Teste Fluxo Admin

**Login:** `admin@cartoriokoerner.com.br` / `Admin@123456`

1. **Gerenciar Usuários:**
   - Ir para: Admin → Gerenciar Usuários
   - Criar/editar/excluir usuários
   - Resetar MFA de usuários

2. **Configurações:**
   - Ir para: Admin → Configurações
   - Alterar configuração de conferência cega
   - Inserir código MFA para salvar

## 🔧 APIs Testáveis

| Endpoint | Método | Função |
|----------|--------|--------|
| `/api/caixa/abrir` | POST | Abrir caixa diário |
| `/api/caixa/fechar` | POST | Fechar caixa |
| `/api/caixa/listar` | GET | Listar caixas |
| `/api/caixa/conferencia` | POST | Conferir caixa |
| `/api/movimentacao` | GET/POST | Listar/solicitar movimentações |
| `/api/movimentacao/aprovar` | POST | Aprovar movimentações |
| `/api/usuarios` | GET/POST/PUT/DELETE | CRUD usuários |
| `/api/configuracoes` | GET/PUT | Configurações sistema |
| `/api/validacao-final` | GET/POST | Validação final diária |
| `/api/mfa` | POST/PUT/DELETE | Configurar MFA |

## 🛠️ Comandos Úteis

```powershell
# Desenvolvimento
npm run dev                # Iniciar servidor
npm run build             # Build para produção

# Banco de dados
npm run db:studio         # Interface visual
npm run db:seed           # Recriar usuários
npm run db:reset          # Reset completo
npm run db:migrate        # Aplicar migrações

# Testes
npm run lint              # Verificar código
npm run type-check        # Verificar tipos
```

## ⚠️ Pontos de Atenção

1. **MFA Obrigatório:** Todos os usuários devem configurar MFA no primeiro login
2. **Códigos de Backup:** Guardar códigos de recuperação
3. **Configuração Cega:** Testar ambos os modos (ativo/inativo)
4. **Transações:** Verificar atomicidade das operações
5. **Permissões:** Cada cargo só acessa suas funcionalidades
6. **Auditoria:** Todas as ações críticas são logadas

## 🐛 Troubleshooting

**Erro de MFA:** Verificar se o código tem 6 dígitos e está sincronizado  
**Erro de Permissão:** Verificar se o usuário tem o cargo correto  
**Erro de Banco:** Executar `npm run db:reset` e `npm run db:seed`  
**Erro de Build:** Executar `npm run lint` e corrigir problemas  

## 📈 Próximos Passos

- [ ] Implementar testes automatizados
- [ ] Adicionar logs detalhados
- [ ] Configurar ambiente de produção
- [ ] Implementar backup automático
- [ ] Adicionar métricas e monitoramento

---

**Última Atualização:** ${new Date().toLocaleDateString('pt-BR')}  
**Versão:** 1.0.0  
**Status:** Pronto para testes
