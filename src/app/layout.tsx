import type { Metadata } from 'next';
import { SessionProviderWrapper } from '@/components/providers/session-provider-wrapper';
import { Toaster } from '@/components/ui/toaster';
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
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
