"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCaixa } from "@/hooks/use-database";
import { AbrirCaixaSchema } from "@/lib/schemas";
import { Loader2, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

type AbrirCaixaFormValues = z.infer<typeof AbrirCaixaSchema>;

// Mock previous day's closing balance - This might be removed or fetched if a caixa is already open
// const saldoAnterior = 150.75; 

interface CaixaAbertoInfo {
  id: string;
  dataHoraAbertura: Date;
  valorInicial: number | string;
}

// Função auxiliar para formatar valores monetários com segurança
const formatarMoeda = (valor: number | string | null | undefined): string => {
  if (valor === null || valor === undefined) return "0,00";
  
  const numero = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  
  if (isNaN(numero)) return "0,00";
  
  return numero.toFixed(2).replace('.', ',');
}

export default function AbrirCaixaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { abrirCaixa, listarCaixas, loading: caixaLoading, error: caixaError } = useCaixa();
  const [isLoading, setIsLoading] = useState(false);
  const [caixaAbertoDetalhes, setCaixaAbertoDetalhes] = useState<CaixaAbertoInfo | null>(null);
  const [isCheckingInitialStatus, setIsCheckingInitialStatus] = useState(true);
  const form = useForm<AbrirCaixaFormValues>({
    resolver: zodResolver(AbrirCaixaSchema),
    defaultValues: {
      valorInicial: undefined,
      mfaCode: ""
    }
  });
  // Effect to check initial caixa status and set form defaults
  useEffect(() => {
    const checkInitialCaixaStatus = async () => {
      setIsCheckingInitialStatus(true);
      
      try {        // Check if user has an open caixa
        const response = await fetch('/api/caixa/listar?status=aberto')
        const data = await response.json()
        
        if (response.ok && data.caixas && data.caixas.length > 0) {
          // User has an open caixa
          const caixaAberto = data.caixas[0];
          
          // Tentar converter o valor inicial para número
          let valorInicialNumerico;
          try {
            valorInicialNumerico = typeof caixaAberto.valorInicial === 'number'
              ? caixaAberto.valorInicial
              : parseFloat(String(caixaAberto.valorInicial).replace(',', '.'));
            
            if (isNaN(valorInicialNumerico)) {
              throw new Error('Valor inválido');
            }
          } catch (error) {
            console.warn("Erro ao converter valor inicial:", error);
            valorInicialNumerico = 0; // valor padrão seguro
          }
          
          const existingCaixa: CaixaAbertoInfo = {
            id: caixaAberto.id,
            dataHoraAbertura: new Date(caixaAberto.dataHoraAbertura),
            valorInicial: valorInicialNumerico,
          };
          setCaixaAbertoDetalhes(existingCaixa);
          form.reset({ 
            valorInicial: typeof existingCaixa.valorInicial === 'number' 
                        ? existingCaixa.valorInicial 
                        : parseFloat(String(existingCaixa.valorInicial).replace(',', '.')), 
            mfaCode: "" 
          });
        } else {          // No open caixa, set default value
          setCaixaAbertoDetalhes(null);
          const saldoAnteriorMock = 150.75; // This should come from last day's closing
          form.reset({ valorInicial: saldoAnteriorMock, mfaCode: "" });
        }
      } catch (error) {
        console.error('Erro ao verificar status do caixa:', error)
        toast({
          title: "Erro",
          description: "Não foi possível verificar o status do caixa",
          variant: "destructive",
        });        // Set default values on error
        setCaixaAbertoDetalhes(null);
        form.reset({ valorInicial: 150.75, mfaCode: "" });
      } finally {
        setIsCheckingInitialStatus(false);
      }
    };

    checkInitialCaixaStatus();
  }, [form, toast]);
  async function onSubmit(data: AbrirCaixaFormValues) {
    if (caixaAbertoDetalhes) {
      toast({
        title: "Operação Não Permitida",
        description: "Você já possui um caixa aberto. Feche-o antes de abrir um novo.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {      const response = await fetch('/api/caixa/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valorInicial: data.valorInicial,
          mfaCode: data.mfaCode
        }),
      })

      const result = await response.json();
      if (response.ok) {        
        // Tentar converter o valor inicial para número
        let valorInicialNumerico;
        try {
          valorInicialNumerico = typeof result.caixa.valorInicial === 'number'
            ? result.caixa.valorInicial
            : parseFloat(String(result.caixa.valorInicial).replace(',', '.'));
          
          if (isNaN(valorInicialNumerico)) {
            throw new Error('Valor inválido');
          }
        } catch (error) {
          console.warn("Erro ao converter valor inicial:", error);
          valorInicialNumerico = 0; // valor padrão seguro
        }          const newCaixaInfo: CaixaAbertoInfo = {
          id: result.caixa.id,
          dataHoraAbertura: new Date(result.caixa.dataHoraAbertura),
          valorInicial: valorInicialNumerico
        };
        setCaixaAbertoDetalhes(newCaixaInfo);
        
        toast({
          title: "Caixa Aberto com Sucesso!",
          description: `Caixa ID: ${result.caixa.id} aberto com valor inicial de R$ ${formatarMoeda(result.caixa.valorInicial)}.`,
        });
      } else {
        toast({
          title: "Erro ao Abrir Caixa",
          description: result.erro || "Erro interno do servidor",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingInitialStatus) {
    return (
      <div>
        <PageHeader
          title="Abrir Novo Caixa"
          description="Inicie o movimento diário do seu caixa."
        />
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Verificando status do caixa...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Abrir Novo Caixa"
        description="Inicie o movimento diário do seu caixa."
      />
      {caixaAbertoDetalhes && (
        <Alert variant="default" className="mb-6 max-w-lg mx-auto bg-blue-50 border-blue-200">
          <Info className="h-5 w-5 text-blue-700" />
          <AlertTitle className="text-blue-800">Caixa Aberto</AlertTitle>
          <AlertDescription className="text-blue-700">
            Você já possui um caixa aberto (ID: <strong>{caixaAbertoDetalhes.id}</strong>).
            <br />
            Aberto em: {caixaAbertoDetalhes.dataHoraAbertura.toLocaleString('pt-BR')}
            <br />
            Valor Inicial: R$ {formatarMoeda(caixaAbertoDetalhes.valorInicial)}
            <br />
            Para abrir um novo caixa, você precisa fechar o atual primeiro.
          </AlertDescription>
        </Alert>
      )}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Detalhes da Abertura</CardTitle>
          <CardDescription>
            {caixaAbertoDetalhes 
              ? "Um caixa já está aberto. Feche-o para abrir um novo."
              : "Confirme o valor inicial para a abertura do caixa. Este valor é geralmente o saldo final do caixa anterior."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <fieldset disabled={!!caixaAbertoDetalhes}> {/* Disables inputs if caixa is already open */}                <FormField
                  control={form.control}
                  name="valorInicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Inicial (R$)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0,00" 
                            className="pl-10"
                            // value and onChange are handled by react-hook-form Controller (via field)
                            // Ensure field.value is correctly formatted if needed, but RHF handles it well for type="number"
                            {...field} // Spread field props here
                            onChange={e => { // Keep custom onChange for parsing if necessary
                              const inputValue = e.target.value;
                              if (inputValue === '') {
                                field.onChange(undefined); 
                              } else {
                                // RHF with Zod handles parsing for type number, 
                                // but explicit parsing can be kept if specific behavior is needed before validation
                                const numericValue = parseFloat(inputValue.replace(",", "."));
                                if (!isNaN(numericValue)) {
                                  field.onChange(numericValue);
                                } else {
                                  field.onChange(inputValue); // Let Zod catch it if it's not a valid number string for preprocess
                                }
                              }
                            }}
                            value={field.value === undefined || field.value === null ? '' : String(field.value)} // Control value display
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Este valor deve corresponder ao saldo final do caixa do dia anterior.
                      </FormDescription>                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mfaCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código MFA</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          className="text-center text-lg tracking-widest"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Digite o código de 6 dígitos do seu aplicativo autenticador.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !!caixaAbertoDetalhes} // isLoading for submission, !!caixaAbertoDetalhes if already open
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {caixaAbertoDetalhes ? "Caixa já Aberto" : "Abrir Caixa"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
