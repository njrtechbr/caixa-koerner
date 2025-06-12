/*
  Warnings:

  - You are about to drop the column `tipo_pagamento` on the `transacoes_fechamento` table. All the data in the column will be lost.
  - Added the required column `forma_pagamento_id` to the `transacoes_fechamento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transacoes_fechamento" DROP COLUMN "tipo_pagamento",
ADD COLUMN     "forma_pagamento_id" UUID NOT NULL,
ADD COLUMN     "ordem_preenchimento" INTEGER,
ADD COLUMN     "timestamp_salvo" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "formas_pagamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "eh_dinheiro" BOOLEAN NOT NULL DEFAULT false,
    "eh_sistema_w6" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formas_pagamento_codigo_key" ON "formas_pagamento"("codigo");

-- AddForeignKey
ALTER TABLE "transacoes_fechamento" ADD CONSTRAINT "transacoes_fechamento_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
