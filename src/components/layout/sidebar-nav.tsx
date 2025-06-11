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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, Home, User, Users, DollarSign, BarChart3, Settings,
  Archive, ClipboardCheck, CheckSquare, Edit3, Upload, Download, ShieldAlert,
  FileText, KeyRound, TrendingUp, Clock, Calculator, Banknote, CreditCard,
  RefreshCw, AlertTriangle, UserCheck, Cog
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  subItems?: NavItem[];
  disabled?: boolean;
  badge?: string;
}

interface NavGroup {
  label: string;
  roles: string[];
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  // PAINEL PRINCIPAL
  {
    label: "Painel Principal",
    roles: ["operador_caixa", "supervisor_caixa", "supervisor_conferencia", "admin"],
    items: [
      { 
        href: "/dashboard", 
        label: "Dashboard", 
        icon: LayoutDashboard, 
        roles: ["operador_caixa", "supervisor_caixa", "supervisor_conferencia", "admin"] 
      }
    ]
  },

  // OPERAÇÕES DE CAIXA
  {
    label: "Operações de Caixa",
    roles: ["operador_caixa"],
    items: [
      { 
        href: "/operador-caixa", 
        label: "Painel Operador", 
        icon: Home, 
        roles: ["operador_caixa"] 
      },
      { 
        href: "/operador-caixa/abrir-caixa", 
        label: "Abrir Caixa", 
        icon: DollarSign, 
        roles: ["operador_caixa"] 
      },
      { 
        href: "/operador-caixa/fechar-caixa", 
        label: "Fechar Caixa", 
        icon: Archive, 
        roles: ["operador_caixa"] 
      },
      { 
        href: "/operador-caixa/meus-caixas", 
        label: "Histórico de Caixas", 
        icon: FileText, 
        roles: ["operador_caixa"] 
      }
    ]
  },

  // SOLICITAÇÕES & MOVIMENTAÇÕES
  {
    label: "Solicitações & Movimentações",
    roles: ["operador_caixa"],
    items: [
      { 
        href: "/operador-caixa/solicitacoes", 
        label: "Minhas Solicitações", 
        icon: Upload, 
        roles: ["operador_caixa"],
        subItems: [
          { 
            href: "/operador-caixa/solicitacoes/sangria-entrada", 
            label: "Sangria/Entrada", 
            icon: Banknote, 
            roles: ["operador_caixa"] 
          },
          { 
            href: "/operador-caixa/solicitacoes/correcao", 
            label: "Correções", 
            icon: Edit3, 
            roles: ["operador_caixa"] 
          }
        ]
      }
    ]
  },

  // SUPERVISÃO DE CAIXA
  {
    label: "Supervisão de Caixa",
    roles: ["supervisor_caixa"],
    items: [
      { 
        href: "/supervisor-caixa", 
        label: "Painel Supervisor", 
        icon: Home, 
        roles: ["supervisor_caixa"] 
      },
      { 
        href: "/supervisor-caixa/conferencia", 
        label: "Conferir Caixas", 
        icon: ClipboardCheck, 
        roles: ["supervisor_caixa"],
        badge: "pendente"
      },
      { 
        href: "/supervisor-caixa/aprovacoes", 
        label: "Aprovar Solicitações", 
        icon: CheckSquare, 
        roles: ["supervisor_caixa"],
        badge: "pendente"
      }
    ]
  },

  // CONFERÊNCIA FINAL
  {
    label: "Conferência Final",
    roles: ["supervisor_conferencia"],
    items: [
      { 
        href: "/supervisor-conferencia", 
        label: "Painel Conferência", 
        icon: Home, 
        roles: ["supervisor_conferencia"] 
      },
      { 
        href: "/supervisor-conferencia/painel-consolidado", 
        label: "Painel Consolidado", 
        icon: BarChart3, 
        roles: ["supervisor_conferencia"] 
      },
      { 
        href: "/supervisor-conferencia/validacao-final", 
        label: "Validação Final", 
        icon: KeyRound, 
        roles: ["supervisor_conferencia"],
        badge: "crítico"
      }
    ]
  },

  // ADMINISTRAÇÃO
  {
    label: "Administração",
    roles: ["admin", "supervisor_conferencia"],
    items: [
      { 
        href: "/admin", 
        label: "Painel Admin", 
        icon: Home, 
        roles: ["admin"] 
      },
      { 
        href: "/admin/gerenciar-usuarios", 
        label: "Gerenciar Usuários", 
        icon: Users, 
        roles: ["admin"] 
      },
      { 
        href: "/admin/configuracoes", 
        label: "Configurações", 
        icon: Settings, 
        roles: ["admin", "supervisor_conferencia"] 
      }
    ]
  }
];

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.cargo;

  const isActive = (href: string, exact = false) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  const hasAccess = (roles: string[]) => {
    return userRole && (roles.includes(userRole) || userRole === 'admin');
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'pendente':
        return 'bg-yellow-500 text-yellow-50';
      case 'crítico':
        return 'bg-red-500 text-red-50';
      default:
        return 'bg-blue-500 text-blue-50';
    }
  };
  return (
    <div className="space-y-2">
      {navigationGroups
        .filter(group => hasAccess(group.roles))
        .map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter(item => hasAccess(item.roles))
                  .map((item) => (
                    <SidebarMenuItem key={item.href}>
                      {item.subItems ? (
                        <>
                          <SidebarMenuButton
                            isActive={isActive(item.href)}
                            className="font-medium relative"
                            disabled={item.disabled}
                            tooltip={item.label}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className={`ml-auto px-1.5 py-0.5 text-xs rounded-full ${getBadgeColor(item.badge)}`}>
                                •
                              </span>
                            )}
                          </SidebarMenuButton>
                          <SidebarMenuSub>
                            {item.subItems
                              .filter(subItem => hasAccess(subItem.roles))
                              .map((subItem) => (
                                <SidebarMenuSubItem key={subItem.href}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive(subItem.href, true)}
                                  >
                                    <Link href={subItem.href} className="flex items-center">
                                      <subItem.icon className="w-4 h-4" />
                                      <span>{subItem.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                          </SidebarMenuSub>
                        </>
                      ) : (
                        <SidebarMenuButton 
                          asChild
                          isActive={isActive(item.href, item.href === "/dashboard")}
                          tooltip={item.label}
                          className="relative"
                          disabled={item.disabled}
                        >
                          <Link href={item.href} className="flex items-center">
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className={`ml-auto px-1.5 py-0.5 text-xs rounded-full ${getBadgeColor(item.badge)}`}>
                                •
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
    </div>
  );
}
