import type { Metadata } from 'next';
import { SessionProviderWrapper } from '@/components/providers/session-provider-wrapper';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

export const metadata: Metadata = {
  title: 'CartórioCashFlow',
  description: 'Sistema de Controle de Caixa – Cartório Koerner',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-body antialiased">
        <TooltipProvider>
          <SessionProviderWrapper>
            {children}
            <Toaster />
          </SessionProviderWrapper>
        </TooltipProvider>
      </body>
    </html>
  );
}
