"use client";

import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, UserCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) {
    return null; // Or a login button if appropriate for context
  }

  const userName = session.user.name || "Usuário";
  const userEmail = session.user.email || "";
  const userRole = (session.user as any).role || "Não definido";
  const initials = userName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const roleTranslations: { [key: string]: string } = {
    operador_caixa: "Operador de Caixa",
    supervisor_caixa: "Supervisor de Caixa",
    supervisor_conferencia: "Supervisor de Conferência",
    admin: "Administrador",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-full justify-start px-2 space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || undefined} alt={userName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium truncate max-w-[120px] group-data-[collapsible=icon]:hidden">{userName}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px] group-data-[collapsible=icon]:hidden">{roleTranslations[userRole] || userRole}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/perfil"> {/* Placeholder link */}
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </Link>
          </DropdownMenuItem>
          {(session.user as any).mfaEnabled === false && (
            <DropdownMenuItem asChild>
               <Link href="/mfa-setup">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Ativar MFA</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/configuracoes"> {/* Placeholder link */}
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
