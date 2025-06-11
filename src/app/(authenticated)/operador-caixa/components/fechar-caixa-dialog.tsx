"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';

interface CaixaDiarioDetalhado {
  id: string;
  data_movimento: string | null;
  valor_inicial: string | null;
  status: string;
  [key: string]: any;
}

interface FecharCaixaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caixaParaFechar: CaixaDiarioDetalhado;
  onCaixaFechado: () => void;
}

export default function FecharCaixaDialog({ 
  isOpen, 
  onClose, 
  caixaParaFechar, 
  onCaixaFechado 
}: FecharCaixaDialogProps) {
  const [valores, setValores] = useState({
    dinheiro: '',
    pix: '',
    debito: '',
    mensalista: '',
    outros: ''
  });
  const [observacoes, setObservacoes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleValorChange = (tipo: string, valor: string) => {
    setValores(prev => ({
      ...prev,
      [tipo]: valor
    }));
  };

  const calcularTotal = () => {
    return Object.values(valores).reduce((total, valor) => {
      return total + (parseFloat(valor) || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const transacoes = Object.entries(valores)
        .filter(([_, valor]) => parseFloat(valor) > 0)
        .map(([tipo, valor]) => ({
          tipo_pagamento: tipo.charAt(0).toUpperCase() + tipo.slice(1),
          valor: parseFloat(valor)
        }));

      const response = await fetch('/api/caixa/fechar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caixaId: caixaParaFechar.id,
          transacoes,
          observacoes
        }),
      });

      const data = await response.json();

      if (data.sucesso) {
        onCaixaFechado();
        setValores({
          dinheiro: '',
          pix: '',
          debito: '',
          mensalista: '',
          outros: ''
        });
        setObservacoes('');
        toast({
          title: "Sucesso!",
          description: "Caixa fechado com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: data.mensagem || "Erro ao fechar caixa.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão ao fechar caixa.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
          <DialogDescription>
            Informe os valores apurados para fechar o caixa diário.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valores por Tipo de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dinheiro">Dinheiro</Label>
                    <Input
                      id="dinheiro"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valores.dinheiro}
                      onChange={(e) => handleValorChange('dinheiro', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pix">PIX</Label>
                    <Input
                      id="pix"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valores.pix}
                      onChange={(e) => handleValorChange('pix', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="debito">Cartão de Débito</Label>
                    <Input
                      id="debito"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valores.debito}
                      onChange={(e) => handleValorChange('debito', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mensalista">Mensalista</Label>
                    <Input
                      id="mensalista"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valores.mensalista}
                      onChange={(e) => handleValorChange('mensalista', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="outros">Outros</Label>
                    <Input
                      id="outros"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valores.outros}
                      onChange={(e) => handleValorChange('outros', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatarValor(calcularTotal())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label htmlFor="observacoes">Observações (Opcional)</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre o fechamento do caixa..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || calcularTotal() <= 0}>
              {isLoading ? "Fechando..." : "Fechar Caixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
