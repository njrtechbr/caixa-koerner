"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, MoveUp, MoveDown, CreditCard } from "lucide-react";

interface FormaPagamento {
  id: string;
  nome: string;
  codigo: string;
  ordem: number;
  ativo: boolean;
  ehDinheiro: boolean;
  ehSistemaW6: boolean;
}

export default function FormasPagamentoPage() {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingForma, setEditingForma] = useState<FormaPagamento | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    codigo: "",
    ativo: true,
    eh_dinheiro: false,
    eh_sistema_w6: false,
  });
  // Carregar formas de pagamento
  const carregarFormas = async () => {
    try {
      const response = await fetch("/api/formas-pagamento/admin");
      if (!response.ok) throw new Error("Erro ao carregar formas de pagamento");
      const data = await response.json();
      if (data.sucesso) {
        setFormas(data.formasPagamento || []);
      } else {
        throw new Error(data.mensagem || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as formas de pagamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarFormas();
  }, []);

  // Abrir dialog para nova forma
  const abrirNovaForma = () => {
    setEditingForma(null);
    setFormData({
      nome: "",
      codigo: "",
      ativo: true,
      eh_dinheiro: false,
      eh_sistema_w6: false,
    });
    setIsDialogOpen(true);
  };
  // Abrir dialog para editar forma
  const abrirEditarForma = (forma: FormaPagamento) => {
    setEditingForma(forma);
    setFormData({
      nome: forma.nome,
      codigo: forma.codigo,
      ativo: forma.ativo,
      eh_dinheiro: forma.ehDinheiro,
      eh_sistema_w6: forma.ehSistemaW6,
    });
    setIsDialogOpen(true);
  };

  // Salvar forma de pagamento
  const salvarForma = async () => {
    try {
      const url = editingForma
        ? `/api/formas-pagamento/admin/${editingForma.id}`
        : "/api/formas-pagamento/admin";
      
      const method = editingForma ? "PUT" : "POST";      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensagem || "Erro ao salvar");
      }

      toast({
        title: "Sucesso",
        description: data.mensagem || (editingForma
          ? "Forma de pagamento atualizada com sucesso"
          : "Forma de pagamento criada com sucesso"),
      });

      setIsDialogOpen(false);
      carregarFormas();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar",
        variant: "destructive",
      });
    }
  };
  // Remover forma de pagamento
  const removerForma = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta forma de pagamento?")) {
      return;
    }

    try {
      const response = await fetch(`/api/formas-pagamento/admin/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensagem || "Erro ao remover");
      }

      toast({
        title: "Sucesso",
        description: data.mensagem || "Forma de pagamento removida com sucesso",
      });

      carregarFormas();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao remover",
        variant: "destructive",
      });
    }
  };
  // Alterar ordem da forma de pagamento
  const alterarOrdem = async (id: string, direcao: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/formas-pagamento/admin/${id}/ordem`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direcao }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensagem || "Erro ao alterar ordem");
      }

      carregarFormas();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar ordem",
        variant: "destructive",
      });
    }
  };

  const formatarCodigo = (texto: string) => {
    return texto
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciar Formas de Pagamento"
        description="Configure as formas de pagamento disponíveis no sistema"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Formas de Pagamento
              </CardTitle>
              <CardDescription>
                Gerencie as formas de pagamento que os operadores podem usar no fechamento de caixa
              </CardDescription>
            </div>
            <Button onClick={abrirNovaForma}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nova Forma
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formas
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((forma, index) => (
                    <TableRow key={forma.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono">{forma.ordem}</span>
                          <div className="flex flex-col">                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => alterarOrdem(forma.id, 'up')}
                              disabled={index === 0}
                            >
                              <MoveUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => alterarOrdem(forma.id, 'down')}
                              disabled={index === formas.length - 1}
                            >
                              <MoveDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{forma.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{forma.codigo}</TableCell>                      <TableCell>
                        <div className="flex gap-1">
                          {forma.ehDinheiro && (
                            <Badge variant="secondary">Dinheiro</Badge>
                          )}
                          {forma.ehSistemaW6 && (
                            <Badge variant="outline">Sistema W6</Badge>
                          )}
                          {!forma.ehDinheiro && !forma.ehSistemaW6 && (
                            <Badge variant="default">Padrão</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={forma.ativo ? "default" : "secondary"}>
                          {forma.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditarForma(forma)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerForma(forma.id)}
                            disabled={forma.ehDinheiro || forma.ehSistemaW6}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar forma de pagamento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingForma ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da forma de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    nome,
                    codigo: formatarCodigo(nome),
                  }));
                }}
                placeholder="Ex: Cartão de Débito"
              />
            </div>

            <div>
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo: formatarCodigo(e.target.value) }))}
                placeholder="Ex: cartao_debito"
                className="font-mono"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Forma ativa</Label>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="eh_dinheiro">É dinheiro físico</Label>
                  <p className="text-sm text-muted-foreground">
                    Marque se esta forma representa dinheiro físico
                  </p>
                </div>
                <Switch
                  id="eh_dinheiro"
                  checked={formData.eh_dinheiro}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, eh_dinheiro: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="eh_sistema_w6">É valor do Sistema W6</Label>
                  <p className="text-sm text-muted-foreground">
                    Marque se o valor vem automaticamente do Sistema W6
                  </p>
                </div>
                <Switch
                  id="eh_sistema_w6"
                  checked={formData.eh_sistema_w6}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, eh_sistema_w6: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarForma}>
              {editingForma ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
