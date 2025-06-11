"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Smartphone, CreditCard, Users, Archive, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const paymentTypeSchema = z.object({
  id: z.string().optional(),
  nome: z.string(),
  valor: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        // parseFloat will return NaN for empty or non-numeric strings.
        // z.number() will then catch this NaN as an invalid_type_error.
        return parseFloat(val.replace(",", "."));
      }
      // Pass through numbers, undefined, null for z.number() to validate.
      // For an optional field, undefined/null will be accepted.
      return val;
    },
    z.number({invalid_type_error: "Valor inválido"}).nonnegative({ message: "Valor não pode ser negativo." }).optional()
  ),
  isNew: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  icon: z.custom<LucideIcon>().optional(), // Added icon
  blocked: z.boolean().optional(), // Added blocked
});

const FecharCaixaSchema = z.object({
  transacoes: z.array(paymentTypeSchema),
  valor_sistema_w6: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val).replace(",", ".")),
    z.number({invalid_type_error: "Valor inválido"}).nonnegative({ message: "Valor não pode ser negativo." }).optional()
  ),
  mfaCode: z.string().optional(), // Made optional since MFA is disabled
});

type FecharCaixaFormValues = z.infer<typeof FecharCaixaSchema>;

const paymentTypes = [
  { nome: "Dinheiro", icon: DollarSign },
  { nome: "Pix", icon: Smartphone },
  { nome: "Débito", icon: CreditCard },
  { nome: "Crédito", icon: CreditCard }, // Added for completeness
  { nome: "Mensalista", icon: Users },
  { nome: "Outros", icon: Archive },
];

export default function FecharCaixaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FecharCaixaFormValues>({
    resolver: zodResolver(FecharCaixaSchema),
    defaultValues: {
      transacoes: paymentTypes.map(pt => ({ nome: pt.nome, valor: undefined, icon: pt.icon, blocked: false })), // Changed tipo_pagamento to nome
      valor_sistema_w6: undefined,
      mfaCode: "",
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "transacoes",
  });
  const handleBlur = (index: number, value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value);
    if (numericValue !== undefined && !isNaN(numericValue) && numericValue >= 0) {
      const currentField = fields[index];
      update(index, { ...currentField, blocked: true });
    }
  };
  async function onSubmit(data: FecharCaixaFormValues) {
    setIsLoading(true);
    
    try {
      // Get current open caixa first
      const caixaResponse = await fetch('/api/caixa/listar?status=aberto')
      const caixaData = await caixaResponse.json()
      
      if (!caixaResponse.ok || !caixaData.caixas || caixaData.caixas.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum caixa aberto encontrado",
          variant: "destructive",
        });
        return;
      }

      const caixaId = caixaData.caixas[0].id;

      // Prepare transaction data
      const transacoes = data.transacoes
        .filter(t => t.valor !== undefined && t.valor > 0)
        .map(t => ({
          tipoPagamento: t.nome, // Changed t.tipo_pagamento to t.nome
          valor: t.valor!
        }));

      const response = await fetch('/api/caixa/fechar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caixaId,
          transacoes,
          valorSistemaW6: data.valor_sistema_w6,
          mfaCode: data.mfaCode
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Caixa Fechado com Sucesso!",
          description: "Seu caixa foi fechado e enviado para conferência.",
        });
        router.push("/operador-caixa");
      } else {
        toast({
          title: "Erro ao Fechar Caixa",
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
  
  const totalDeclarado = fields.reduce((sum, field) => sum + (field.valor || 0), 0) + (form.watch("valor_sistema_w6") || 0);

  return (
    <div>
      <PageHeader
        title="Fechar Caixa"
        description="Declare os valores apurados para o fechamento do caixa."
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Valores de Fechamento</CardTitle>
          <CardDescription>
            Preencha os valores para cada tipo de pagamento. Após preenchido, o campo será bloqueado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6"> {/* Removed onSubmit from form tag, handled by AlertDialog */}
              {fields.map((item, index) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name={`transacoes.${index}.valor`}
                  render={({ field }) => {
                    const Icon = item.icon as LucideIcon;
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Icon className="mr-2 h-5 w-5 text-muted-foreground" />
                          {item.nome} (R$)
                        </FormLabel>                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={e => {
                              const inputValue = e.target.value;
                              if (inputValue === '') {
                                field.onChange(undefined);
                              } else {
                                const numericValue = parseFloat(inputValue);
                                if (!isNaN(numericValue)) {
                                  field.onChange(numericValue);
                                }
                              }
                            }}
                            onBlur={(e) => handleBlur(index, e.target.value)}
                            readOnly={item.blocked}
                            className={item.blocked ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              ))}
              <FormField
                control={form.control}
                name="valor_sistema_w6"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Sistema W6 (R$)</FormLabel>                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        value={field.value === undefined ? '' : String(field.value)}
                        onChange={e => {
                          const inputValue = e.target.value;
                          if (inputValue === '') {
                            field.onChange(undefined);
                          } else {
                            const numericValue = parseFloat(inputValue);
                            if (!isNaN(numericValue)) {
                              field.onChange(numericValue);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />              <div className="pt-4 border-t">
                <p className="text-lg font-semibold">Total Declarado: R$ {totalDeclarado.toFixed(2)}</p>
              </div>
              <FormField
                control={form.control}
                name="mfaCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código MFA para Selar</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={isLoading}>
                <Lock className="mr-2 h-4 w-4" /> Selar e Fechar Caixa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Fechamento do Caixa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ao confirmar, os valores declarados serão enviados para conferência e não poderão ser alterados diretamente.
                  O valor total declarado é de R$ {totalDeclarado.toFixed(2)}.
                  Você precisará do seu código MFA para completar esta ação.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar e Fechar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
