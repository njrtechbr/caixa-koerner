"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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

const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(1, { message: "Senha é obrigatória." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        toast({
          title: "Erro de Login",
          description: "Email ou senha inválidos. Por favor, tente novamente.",
          variant: "destructive",
        });
      } else if (result?.ok) {
        // Check if MFA is enabled and redirect accordingly
        // This is a simplified check. In a real app, you'd get this from the user object returned by signIn or session.
        const userResponse = await fetch('/api/auth/session'); // Mock fetching user data
        const session = await userResponse.json();

        if (session?.user?.mfaEnabled === false) { // For admin@example.com in mock
          router.push("/mfa-setup");
        } else if (session?.user?.mfaEnabled === true) {
          router.push("/mfa-verify"); 
        }
         else {
          router.push("/dashboard"); // Fallback or for users already past MFA steps
        }
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
        <CardTitle className="text-3xl font-headline text-center">CartórioCashFlow</CardTitle>
        <CardDescription className="text-center">
          Bem-vindo! Faça login para acessar o sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm">
          <a href="#" className="font-medium text-primary hover:underline">
            Esqueceu sua senha?
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
