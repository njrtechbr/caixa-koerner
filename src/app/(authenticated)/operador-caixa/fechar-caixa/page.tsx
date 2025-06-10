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
  tipo_pagamento: z.string(),
  valor: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val).replace(",", ".")),
    z.number({invalid_type_error: "Valor inválido"}).nonnegative({ message: "Valor não pode ser negativo." }).optional()
  ),
  icon: z.any().optional(), // For UI only
  blocked: z.boolean().default(false).optional()
});

const FecharCaixaSchema = z.object({
  transacoes: z.array(paymentTypeSchema),
  valor_sistema_w6: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val).replace(",", ".")),
    z.number({invalid_type_error: "Valor inválido"}).nonnegative({ message: "Valor não pode ser negativo." }).optional()
  ),
  mfaCode: z.string().length(6, { message: "Código MFA é obrigatório e deve ter 6 dígitos." }),
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
      transacoes: paymentTypes.map(pt => ({ tipo_pagamento: pt.nome, valor: undefined, icon: pt.icon, blocked: false })),
      valor_sistema_w6: undefined,
      mfaCode: "",
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "transacoes",
  });

  const handleBlur = (index: number, value: number | undefined) => {
    if (value !== undefined && value >= 0) {
      const currentField = fields[index];
      update(index, { ...currentField, blocked: true });
    }
  };

  async function onSubmit(data: FecharCaixaFormValues) {
    setIsLoading(true);
    console.log("Fechando caixa com os seguintes dados:", data);
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: "Caixa Fechado com Sucesso!",
      description: `Seu caixa foi fechado e enviado para conferência.`,
    });
    setIsLoading(false);
    router.push("/operador-caixa"); 
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
                          {item.tipo_pagamento} (R$)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...field}
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                            onBlur={() => handleBlur(index, field.value)}
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
                    <FormLabel>Valor Sistema W6 (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        {...field} 
                        value={field.value === undefined ? '' : String(field.value)}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4 border-t">
                <p className="text-lg font-semibold">Total Declarado: R$ {totalDeclarado.toFixed(2)}</p>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-4">
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
