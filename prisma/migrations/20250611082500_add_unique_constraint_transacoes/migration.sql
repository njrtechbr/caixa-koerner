/*
  Warnings:

  - A unique constraint covering the columns `[caixa_diario_id,forma_pagamento_id]` on the table `transacoes_fechamento` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "transacoes_fechamento_caixa_diario_id_forma_pagamento_id_key" ON "transacoes_fechamento"("caixa_diario_id", "forma_pagamento_id");
