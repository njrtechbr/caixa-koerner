"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, Home, User, Users, DollarSign, BarChart3, Settings,
  Archive, ClipboardCheck, CheckSquare, Edit3, Upload, Download, ShieldAlert,
  FileText, KeyRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  subItems?: NavItem[];
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Painel Principal", icon: LayoutDashboard, roles: ["operador_caixa", "supervisor_caixa", "supervisor_conferencia", "admin"] },
  
  // Operador de Caixa
  { href: "/operador-caixa/abrir-caixa", label: "Abrir Caixa", icon: DollarSign, roles: ["operador_caixa"] },
  { href: "/operador-caixa/fechar-caixa", label: "Fechar Caixa", icon: Archive, roles: ["operador_caixa"] },
  { 
    href: "/operador-caixa/solicitacoes", 
    label: "Solicitações", 
    icon: Upload, 
    roles: ["operador_caixa"],
    subItems: [
      { href: "/operador-caixa/solicitacoes/sangria-entrada", label: "Sangria/Entrada", icon: Download, roles: ["operador_caixa"]},
      { href: "/operador-caixa/solicitacoes/correcao", label: "Correção", icon: Edit3, roles: ["operador_caixa"]},
    ]
  },
  { href: "/operador-caixa/meus-caixas", label: "Meus Caixas", icon: FileText, roles: ["operador_caixa"] },

  // Supervisor de Caixa
  { href: "/supervisor-caixa/conferencia", label: "Conferir Caixas", icon: ClipboardCheck, roles: ["supervisor_caixa"] },
  { href: "/supervisor-caixa/aprovacoes", label: "Aprovar Solicitações", icon: CheckSquare, roles: ["supervisor_caixa"] },

  // Supervisor de Conferência
  { href: "/supervisor-conferencia/painel-consolidado", label: "Painel Consolidado", icon: BarChart3, roles: ["supervisor_conferencia"] },
  { href: "/supervisor-conferencia/validacao-final", label: "Validar Dia", icon: KeyRound, roles: ["supervisor_conferencia"] },
  
  // Admin
  { href: "/admin/gerenciar-usuarios", label: "Gerenciar Usuários", icon: Users, roles: ["admin"] },
  { href: "/admin/configuracoes", label: "Configurações Sistema", icon: Settings, roles: ["admin", "supervisor_conferencia"] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const isActive = (href: string, exact = false) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole || ""));

  return (
    <SidebarMenu>
      {filteredNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {item.subItems ? (
            <>
              <SidebarMenuButton
                // Implement open/close state for submenus if needed
                // For now, it's just a label
                isActive={isActive(item.href)}
                className="font-medium"
                disabled={item.disabled}
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              <SidebarMenuSub>
                {item.subItems.filter(subItem => subItem.roles.includes(userRole || "")).map((subItem) => (
                  <SidebarMenuSubItem key={subItem.href}>
                    <Link href={subItem.href} legacyBehavior passHref>
                      <SidebarMenuSubButton
                        isActive={isActive(subItem.href, true)}
                        disabled={subItem.disabled}
                      >
                        <subItem.icon />
                        <span>{subItem.label}</span>
                      </SidebarMenuSubButton>
                    </Link>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </>
          ) : (
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton 
                isActive={isActive(item.href, item.href === "/dashboard")}
                disabled={item.disabled}
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
