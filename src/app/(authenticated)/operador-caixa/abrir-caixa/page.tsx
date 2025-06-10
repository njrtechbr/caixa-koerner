"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AbrirCaixaSchema } from "@/lib/schemas"; // Assuming this schema exists
import { Loader2, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

type AbrirCaixaFormValues = z.infer<typeof AbrirCaixaSchema>;

// Mock previous day's closing balance
const saldoAnterior = 150.75; 

export default function AbrirCaixaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState(""); // For MFA step, if needed before opening

  const form = useForm<AbrirCaixaFormValues>({
    resolver: zodResolver(AbrirCaixaSchema),
    defaultValues: {
      valor_inicial: saldoAnterior, // Pre-fill with previous day's closing balance
    },
  });

  async function onSubmit(data: AbrirCaixaFormValues) {
    setIsLoading(true);
    // Here, you would typically show an MFA input dialog/modal
    // For simplicity, we'll assume MFA is handled or skip for this demo form
    console.log("Abrindo caixa com os seguintes dados:", data);
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Caixa Aberto com Sucesso!",
      description: `Caixa aberto em ${new Date().toLocaleDateString('pt-BR')} com valor inicial de R$ ${data.valor_inicial.toFixed(2)}.`,
    });
    setIsLoading(false);
    router.push("/operador-caixa"); // Redirect to operator's dashboard
  }

  return (
    <div>
      <PageHeader
        title="Abrir Novo Caixa"
        description="Inicie o movimento diário do seu caixa."
      />
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Detalhes da Abertura</CardTitle>
          <CardDescription>
            Confirme o valor inicial para a abertura do caixa. Este valor é o saldo final do caixa anterior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="valor_inicial"
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
                          {...field} 
                          className="pl-10"
                          value={field.value === undefined ? '' : String(field.value)} // Ensure controlled component
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Este valor deve corresponder ao saldo final do caixa do dia anterior.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 
                In a real scenario, an MFA input would be required here,
                possibly in a dialog triggered before submission.
                Example:
                <FormItem>
                  <FormLabel>Código MFA</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="123456" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Abrir Caixa
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
