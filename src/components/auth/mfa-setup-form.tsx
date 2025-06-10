"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QrCode, KeyRound, Copy, Loader2 } from "lucide-react";

const mfaSetupSchema = z.object({
  mfaCode: z.string().length(6, { message: "O código MFA deve ter 6 dígitos." }),
});

type MfaSetupFormValues = z.infer<typeof mfaSetupSchema>;

// Mock backup codes
const mockBackupCodes = [
  "A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2", "M3N4-O5P6", 
  "Q7R8-S9T0", "U1V2-W3X4", "Y5Z6-0A1B", "2C3D-4E5F"
];

export function MfaSetupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    // In a real app, you would fetch the QR code URL and backup codes from your backend
    setQrCodeUrl("https://placehold.co/200x200.png?text=QR+Code"); // Placeholder QR code
    setBackupCodes(mockBackupCodes);
  }, []);

  const form = useForm<MfaSetupFormValues>({
    resolver: zodResolver(mfaSetupSchema),
    defaultValues: {
      mfaCode: "",
    },
  });

  async function onSubmit(data: MfaSetupFormValues) {
    setIsLoading(true);
    // Mock MFA activation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, send data.mfaCode to backend for verification and activation
    const isCodeValid = true; // Mock validation

    if (isCodeValid) {
      toast({
        title: "MFA Ativado",
        description: "Autenticação de dois fatores ativada com sucesso.",
      });
      // Update user session/status to reflect MFA enabled
      // For demo, assume this happens and redirect to dashboard
      router.push("/dashboard");
    } else {
      toast({
        title: "Erro na Ativação",
        description: "Código MFA inválido. Tente novamente.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast({ title: "Copiado!", description: "Códigos de recuperação copiados para a área de transferência." });
  };

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-center">Configurar Autenticação de Dois Fatores (MFA)</CardTitle>
        <CardDescription className="text-center">
          Aumente a segurança da sua conta configurando o MFA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <p>1. Escaneie este QR Code com seu aplicativo autenticador (Google Authenticator, Authy, etc.):</p>
          {qrCodeUrl ? (
            <Image src={qrCodeUrl} alt="QR Code MFA" width={200} height={200} data-ai-hint="qr code" />
          ) : (
            <div className="w-[200px] h-[200px] bg-muted flex items-center justify-center rounded-md">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="mfaCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2. Insira o código gerado pelo aplicativo:</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || !qrCodeUrl}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ativar MFA e Continuar
            </Button>
          </form>
        </Form>

        {backupCodes.length > 0 && (
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertTitle>Guarde seus códigos de recuperação!</AlertTitle>
            <AlertDescription>
              Se você perder o acesso ao seu aplicativo autenticador, esses códigos permitirão que você acesse sua conta. Guarde-os em um local seguro.
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-sm">
                {backupCodes.map(code => <span key={code}>{code}</span>)}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyCodes} className="mt-3">
                <Copy className="mr-2 h-3 w-3" /> Copiar Códigos
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="link" onClick={() => router.push("/dashboard")} className="mx-auto">
            Pular por enquanto (desenvolvimento)
        </Button>
      </CardFooter>
    </Card>
  );
}
