"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const mfaVerifySchema = z.object({
  mfaCode: z.string().length(6, { message: "O código MFA deve ter 6 dígitos." }),
});

type MfaVerifyFormValues = z.infer<typeof mfaVerifySchema>;

export function MfaVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: {
      mfaCode: "",
    },
  });

  // This component assumes the user has already partially logged in (user/pass was ok)
  // and now needs to provide the MFA code.
  // For a real app, you might need to pass along the email/token from the previous step.
  // Here, we are simplifying and assuming the `signIn` function can handle this context if needed,
  // or that session management already knows who the user is.

  async function onSubmit(data: MfaVerifyFormValues) {
    setIsLoading(true);
    try {
      // In a real application, you would likely call signIn with a specific flow for MFA verification
      // or have a dedicated API endpoint. Here we simulate a successful verification.
      // For demonstration, we assume `signIn` with credentials will handle the MFA code if provided,
      // or you'd have a different provider/method.
      // This is a mock:
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isCodeCorrect = data.mfaCode !== "000000"; // Fail for "000000" for demo

      if (isCodeCorrect) {
        toast({
          title: "Verificação Bem-Sucedida",
          description: "Login concluído com sucesso.",
        });
        // The callbackUrl should ideally come from NextAuth or be managed statefully
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
      } else {
        form.setError("mfaCode", { type: "manual", message: "Código MFA inválido." });
        toast({
          title: "Erro de Verificação",
          description: "Código MFA inválido. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro Inesperado",
        description: "Ocorreu um erro. Por favor, tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-center">Verificação de Dois Fatores</CardTitle>
        <CardDescription className="text-center">
          Insira o código do seu aplicativo autenticador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="mfaCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código MFA</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar e Entrar
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm">
          <a href="#" className="font-medium text-primary hover:underline">
            Problemas com o código? Use um código de recuperação.
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
