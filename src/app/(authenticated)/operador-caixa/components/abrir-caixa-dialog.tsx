"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from '@/hooks/use-toast';

interface AbrirCaixaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCaixaAberto: (caixa: any) => void;
}

export default function AbrirCaixaDialog({ isOpen, onClose, onCaixaAberto }: AbrirCaixaDialogProps) {
  const [valorInicial, setValorInicial] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/caixa/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valorInicial: parseFloat(valorInicial) || 0,
        }),
      });

      const data = await response.json();

      if (data.sucesso) {
        onCaixaAberto(data.caixa);
        setValorInicial('');
        toast({
          title: "Sucesso!",
          description: "Caixa aberto com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: data.mensagem || "Erro ao abrir caixa.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão ao abrir caixa.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Abrir Novo Caixa</DialogTitle>
          <DialogDescription>
            Informe o valor inicial para abrir um novo caixa diário.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valorInicial" className="text-right">
                Valor Inicial
              </Label>
              <Input
                id="valorInicial"
                type="number"
                step="0.01"
                min="0"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                className="col-span-3"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Abrindo..." : "Abrir Caixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
