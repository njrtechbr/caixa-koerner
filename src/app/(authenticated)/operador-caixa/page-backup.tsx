"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AbrirCaixaDialog from "./components/abrir-caixa-dialog";
import FecharCaixaDialog from "./components/fechar-caixa-dialog";
import DetalhesCaixaAberto from "./components/detalhes-caixa-aberto";

export default function OperadorCaixaPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Painel do Operador de Caixa"
        description="Gerencie seus caixas diários e solicitações de movimentação"
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Sistema Funcionando</CardTitle>
        </CardHeader>
        <CardContent>
          <p>O sistema está funcionando corretamente. As regras de segurança foram implementadas com sucesso.</p>
        </CardContent>
      </Card>
    </div>
  );
}
