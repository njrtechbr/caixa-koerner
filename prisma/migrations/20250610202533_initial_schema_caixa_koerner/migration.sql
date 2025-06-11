-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "cargo" VARCHAR(50) NOT NULL,
    "mfaSecret" TEXT,
    "is_mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_backup_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuarios_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_sistema" (
    "id" SERIAL NOT NULL,
    "chave" VARCHAR(100) NOT NULL,
    "valor" VARCHAR(255) NOT NULL,

    CONSTRAINT "configuracoes_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixa_diario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data_movimento" DATE NOT NULL,
    "valor_inicial" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "aberto_por_usuario_id" UUID,
    "data_abertura" TIMESTAMPTZ,
    "fechado_por_usuario_id" UUID,
    "data_fechamento" TIMESTAMPTZ,
    "revisado_por_usuario_id" UUID,
    "data_revisao" TIMESTAMPTZ,
    "motivo_rejeicao" TEXT,
    "valor_sistema_w6" DECIMAL(10,2),

    CONSTRAINT "caixa_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes_fechamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caixa_diario_id" UUID NOT NULL,
    "tipo_pagamento" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "transacoes_fechamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conferencia_supervisor_caixa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caixa_diario_id" UUID NOT NULL,
    "supervisor_id" UUID,
    "timestamp_conferencia" TIMESTAMPTZ,
    "valor_dinheiro_contado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "conferencia_supervisor_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conferencia_diaria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data_conferencia" DATE NOT NULL,
    "valor_total_declarado" DECIMAL(15,2),
    "valor_total_conferido" DECIMAL(15,2),
    "conferido_por_usuario_id" UUID,
    "timestamp_conferencia" TIMESTAMPTZ,

    CONSTRAINT "conferencia_diaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_caixa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caixa_diario_id" UUID,
    "tipo" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "status" VARCHAR(20) NOT NULL,
    "solicitante_id" UUID,
    "data_solicitacao" TIMESTAMPTZ,
    "aprovador_id" UUID,
    "data_decisao" TIMESTAMPTZ,

    CONSTRAINT "movimentacoes_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_correcao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caixa_diario_id" UUID,
    "campo_corrigir" VARCHAR(100) NOT NULL,
    "valor_antigo" DECIMAL(10,2),
    "valor_novo" DECIMAL(10,2),
    "motivo" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "solicitante_id" UUID,
    "data_solicitacao" TIMESTAMPTZ,
    "aprovador_id" UUID,
    "data_decisao" TIMESTAMPTZ,

    CONSTRAINT "solicitacoes_correcao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_sistema_chave_key" ON "configuracoes_sistema"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "conferencia_supervisor_caixa_caixa_diario_id_key" ON "conferencia_supervisor_caixa"("caixa_diario_id");

-- CreateIndex
CREATE UNIQUE INDEX "conferencia_diaria_data_conferencia_key" ON "conferencia_diaria"("data_conferencia");

-- AddForeignKey
ALTER TABLE "usuarios_backup_codes" ADD CONSTRAINT "usuarios_backup_codes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa_diario" ADD CONSTRAINT "caixa_diario_aberto_por_usuario_id_fkey" FOREIGN KEY ("aberto_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa_diario" ADD CONSTRAINT "caixa_diario_fechado_por_usuario_id_fkey" FOREIGN KEY ("fechado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa_diario" ADD CONSTRAINT "caixa_diario_revisado_por_usuario_id_fkey" FOREIGN KEY ("revisado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_fechamento" ADD CONSTRAINT "transacoes_fechamento_caixa_diario_id_fkey" FOREIGN KEY ("caixa_diario_id") REFERENCES "caixa_diario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencia_supervisor_caixa" ADD CONSTRAINT "conferencia_supervisor_caixa_caixa_diario_id_fkey" FOREIGN KEY ("caixa_diario_id") REFERENCES "caixa_diario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencia_supervisor_caixa" ADD CONSTRAINT "conferencia_supervisor_caixa_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencia_diaria" ADD CONSTRAINT "conferencia_diaria_conferido_por_usuario_id_fkey" FOREIGN KEY ("conferido_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_caixa_diario_id_fkey" FOREIGN KEY ("caixa_diario_id") REFERENCES "caixa_diario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_correcao" ADD CONSTRAINT "solicitacoes_correcao_caixa_diario_id_fkey" FOREIGN KEY ("caixa_diario_id") REFERENCES "caixa_diario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_correcao" ADD CONSTRAINT "solicitacoes_correcao_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_correcao" ADD CONSTRAINT "solicitacoes_correcao_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
