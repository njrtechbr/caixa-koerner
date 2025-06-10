"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { SystemSettingsSchema } from "@/lib/schemas";
import { Loader2 } from "lucide-react";

type SystemSettingsFormValues = z.infer<typeof SystemSettingsSchema>;

// Mock current settings
const currentSettings: SystemSettingsFormValues = {
  conferencia_cega_dinheiro_habilitada: true,
};

export default function ConfiguracoesSistemaPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SystemSettingsFormValues>({
    resolver: zodResolver(SystemSettingsSchema),
    defaultValues: currentSettings, // Load current settings from backend in a real app
  });

  async function onSubmit(data: SystemSettingsFormValues) {
    setIsLoading(true);
    // Mock saving settings
    console.log("Saving settings:", data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Configurações Salvas",
      description: "As configurações do sistema foram atualizadas com sucesso.",
    });
    setIsLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="Configurações do Sistema"
        description="Ajuste as configurações globais da aplicação."
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Opções Gerais</CardTitle>
          <CardDescription>
            Modifique o comportamento padrão do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="conferencia_cega_dinheiro_habilitada"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Conferência Cega de Dinheiro
                      </FormLabel>
                      <FormDescription>
                        Se ativo, o supervisor de caixa não verá o valor em dinheiro declarado pelo operador durante a conferência.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/* Add more settings fields here */}
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
