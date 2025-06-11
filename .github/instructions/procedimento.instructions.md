---
applyTo: '**'
---

# Contexto e Padrões de Codificação para o Projeto: Sistema de Controle de Caixa – Cartório Koerner

Este documento serve como a fonte da verdade para o desenvolvimento deste projeto. Ele contém o conhecimento de domínio, os padrões de codificação e as regras de negócio que o GitHub Copilot deve seguir.

## 1. Diretrizes Gerais

-   **Idioma:** Todo o código, comentários, documentação e texto voltado para o usuário devem ser escritos em **Português do Brasil (pt-br)**.
-   **Estrutura de Testes:** Todos os arquivos de teste (unitários, de integração, e2e) devem ser colocados em um único diretório `/tests` na raiz do projeto.
-   **Segurança em Primeiro Lugar:** A segurança é o pilar deste projeto. Todas as ações críticas devem ser protegidas por Autenticação de Múltiplos Fatores (MFA/TOTP) e as melhores práticas de segurança devem ser aplicadas em todas as camadas.

## 2. Conhecimento de Domínio: O Negócio

### 2.1. Objetivo do Sistema

O objetivo é construir um sistema web de controle de caixa para o Cartório Koerner. O sistema deve gerenciar o fluxo de caixa diário (abertura, fechamento, conferência) com uma trilha de auditoria digital segura, imutável e incontestável.

### 2.2. Funções de Usuário e Permissões

Existem quatro funções de usuário com responsabilidades estritas:

-   **`operador_caixa`**:
    -   Abre seu próprio caixa diário.
    -   Preenche os valores de fechamento (Dinheiro, Pix, Débito, etc.).
    -   Fecha o caixa, selando a ação com seu código MFA/TOTP.
    -   Solicita sangrias, entradas e correções (que necessitam de aprovação).
    -   Visualiza **apenas** o histórico de seus próprios caixas.

-   **`supervisor_caixa`**:
    -   Visualiza todos os caixas com status `Fechado - Aguardando Conferência`.
    -   Realiza a conferência de cada caixa, que pode ser "cega" ou "aberta" (ver Seção 3.1).
    -   Aprova ou rejeita caixas, sempre confirmando a ação com seu código MFA/TOTP.
    -   Aprova ou rejeita solicitações de sangria, entrada e correções dos operadores, também com MFA/TOTP.

-   **`supervisor_conferencia`**:
    -   Visualiza um painel consolidado de todos os caixas já aprovados pelo `supervisor_caixa`.
    -   Analisa o painel comparativo final (Declarado vs. Conferido).
    -   Realiza a validação final do movimento financeiro do dia, selando a ação com seu código MFA/TOTP.
    -   Pode ter acesso à área de configurações do sistema.

-   **`admin`**:
    -   Função de mais alto nível com acesso irrestrito.
    -   Gerencia usuários e suas respectivas funções.
    -   Acessa e modifica todas as configurações gerais do sistema.

## 3. Regras de Negócio e Fluxos de Trabalho

### 3.1. Configuração Central: A Conferência Cega

-   O sistema possui uma configuração global principal: `conferencia_cega_dinheiro_habilitada` (booleano).
-   **Se `true`**: O `supervisor_caixa` não vê o valor em dinheiro declarado pelo operador. Ele deve inserir sua própria contagem (conferência cega). Os demais valores (Pix, Débito) são visíveis.
-   **Se `false`**: O `supervisor_caixa` vê todos os valores declarados pelo operador e apenas aprova ou rejeita o total (conferência aberta).

### 3.2. Fluxo Principal do Caixa

1.  **Abertura**: O `operador_caixa` inicia o dia. O saldo inicial é o saldo final do dia anterior.
2.  **Fechamento (Operador)**: O operador preenche os valores apurados. Cada campo, após preenchido, deve ser bloqueado para evitar alteração. A ação final "Fechar Caixa" é selada com o código MFA/TOTP do operador. O status do caixa muda para `Fechado - Aguardando Conferência`.
3.  **Conferência (Supervisor de Caixa)**: O supervisor seleciona um caixa e segue o fluxo determinado pela flag `conferencia_cega_dinheiro_habilitada`. Todas as decisões (aprovação, rejeição, submissão de contagem) são seladas com o código MFA/TOTP do supervisor.
4.  **Validação Final (Supervisor de Conferência)**: Este supervisor visualiza um painel diário consolidado. Se a conferência cega estava ativa, o painel deve exibir um comparativo "Declarado vs. Conferido". Ele realiza a validação final do dia, selando a ação com seu MFA/TOTP.

### 3.3. Fluxos Secundários

-   **Sangria e Entradas**: O `operador_caixa` solicita, justificando. A solicitação fica pendente até um `supervisor_caixa` aprovar ou reprovar, com ambas as ações exigindo MFA/TOTP.
-   **Correções**: Para um caixa já fechado, o `operador_caixa` pode "Solicitar Correção", informando o campo, novo valor e motivo, selando com seu MFA/TOTP. A solicitação fica pendente até um `supervisor_caixa` aprovar ou reprovar, também com MFA/TOTP.

## 4. Padrões Técnicos e de Segurança

### 4.1. Stack Tecnológica Obrigatória

-   **Framework**: Next.js 15 (com App Router)
-   **Banco de Dados**: PostgreSQL
-   **Autenticação**: NextAuth.js
-   **Estilização**: Tailwind CSS
-   **Componentes de UI**: shadcn/ui

### 4.2. Padrões de Segurança

-   **Autenticação**: O login inicial é com usuário e senha. A ativação do MFA/TOTP é **obrigatória** para todos os usuários no primeiro login. O fluxo deve incluir geração de QR Code e fornecimento de códigos de recuperação de uso único.
-   **Assinatura Digital (MFA/TOTP)**: **TODAS** as ações críticas listadas nos fluxos de trabalho (fechar caixa, aprovar, rejeitar, validar, etc.) devem exigir a inserção de um código MFA/TOTP válido para serem concluídas.
-   **Validação de Dados**: Toda entrada do usuário deve ser validada no lado do servidor usando `Zod`.
-   **Armazenamento Seguro**: Senhas devem ser armazenadas como hashes (`bcrypt`). Segredos de MFA devem ser armazenados de forma **criptografada** no banco de dados.
-   **Transações de Banco de Dados**: Operações que envolvem múltiplas tabelas (ex: fechamento de caixa) devem ser envolvidas em uma transação para garantir atomicidade (commit/rollback).

## 5. Modelo de Dados Canônico (Schema PostgreSQL)

O sistema deve seguir estritamente o seguinte esquema de banco de dados.

```sql
-- Tabela de Usuários e Funções
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL, -- Armazenar hash
    cargo VARCHAR(50) NOT NULL, -- 'operador_caixa', 'supervisor_caixa', 'supervisor_conferencia', 'admin'
    mfa_secret TEXT, -- Criptografado
    is_mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Códigos de Recuperação para MFA
CREATE TABLE usuarios_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    is_used BOOLEAN DEFAULT false
);

-- Tabela de Configurações Gerais do Sistema
CREATE TABLE configuracoes_sistema (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor VARCHAR(255) NOT NULL
);
-- Exemplo de registro: ('conferencia_cega_dinheiro_habilitada', 'true')

-- Tabela principal do movimento diário de cada caixa
CREATE TABLE caixa_diario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_movimento DATE NOT NULL,
    valor_inicial NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Aberto', 'Fechado - Aguardando Conferência', etc.
    aberto_por_usuario_id UUID REFERENCES usuarios(id),
    data_abertura TIMESTAMPTZ,
    fechado_por_usuario_id UUID REFERENCES usuarios(id),
    data_fechamento TIMESTAMPTZ,
    revisado_por_usuario_id UUID REFERENCES usuarios(id),
    data_revisao TIMESTAMPTZ,
    motivo_rejeicao TEXT,
    valor_sistema_w6 NUMERIC(10, 2)
);

-- Tabela para os valores detalhados do fechamento do operador
CREATE TABLE transacoes_fechamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_diario_id UUID REFERENCES caixa_diario(id) ON DELETE CASCADE,
    tipo_pagamento VARCHAR(50) NOT NULL, -- 'Dinheiro', 'Pix', 'Débito', 'Mensalista', 'Outros'
    valor NUMERIC(10, 2) NOT NULL
);

-- Tabela para a conferência cega do supervisor (usada apenas se a configuração estiver ativa)
CREATE TABLE conferencia_supervisor_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_diario_id UUID UNIQUE REFERENCES caixa_diario(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES usuarios(id),
    timestamp_conferencia TIMESTAMPTZ,
    valor_dinheiro_contado NUMERIC(10, 2) NOT NULL
);

-- Tabela para registrar a validação final do dia
CREATE TABLE conferencia_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_conferencia DATE NOT NULL UNIQUE,
    valor_total_declarado NUMERIC(15, 2),
    valor_total_conferido NUMERIC(15, 2),
    conferido_por_usuario_id UUID REFERENCES usuarios(id),
    timestamp_conferencia TIMESTAMPTZ
);

-- Tabelas para Movimentações Adicionais (Sangria, Entradas, Correções)
CREATE TABLE movimentacoes_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_diario_id UUID REFERENCES caixa_diario(id),
    tipo VARCHAR(20) NOT NULL, -- 'entrada', 'sangria'
    valor NUMERIC(10, 2) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL, -- 'pendente', 'aprovado', 'reprovado'
    solicitante_id UUID REFERENCES usuarios(id),
    data_solicitacao TIMESTAMPTZ,
    aprovador_id UUID REFERENCES usuarios(id),
    data_decisao TIMESTAMPTZ
);

CREATE TABLE solicitacoes_correcao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_diario_id UUID REFERENCES caixa_diario(id),
    campo_corrigir VARCHAR(100) NOT NULL,
    valor_antigo NUMERIC(10, 2),
    valor_novo NUMERIC(10, 2),
    motivo TEXT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pendente', 'aprovado', 'reprovado'
    solicitante_id UUID REFERENCES usuarios(id),
    data_solicitacao TIMESTAMPTZ,
    aprovador_id UUID REFERENCES usuarios(id),
    data_decisao TIMESTAMPTZ
);

# Instruções: Acessando PostgreSQL e Criando um Novo Schema

Este guia fornece instruções detalhadas para acessar um banco de dados PostgreSQL com as credenciais especificadas e criar um novo schema, tanto via linha de comando quanto por uma interface gráfica.

---

### **Credenciais de Acesso**

* **Host:** `localhost`
* **Usuário (User):** `postgres`
* **Senha (Password):** `postgres`
* **Porta (Port):** `5432` (padrão)

---

## Método 1: Usando a Linha de Comando (`psql`)

Esta é a forma mais direta e universal de interagir com o PostgreSQL.

### Passo 1: Abrir o Terminal

Abra o seu terminal (Prompt de Comando no Windows, Terminal no macOS/Linux).

### Passo 2: Conectar ao Banco de Dados

Digite o comando abaixo para se conectar. Você precisará substituir `nome_do_banco` pelo nome do banco de dados específico ao qual deseja se conectar. Se você acabou de instalar o PostgreSQL, um banco de dados padrão chamado `postgres` geralmente está disponível.

```bash
psql -h localhost -U postgres -d postgres