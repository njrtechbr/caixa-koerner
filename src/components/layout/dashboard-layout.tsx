import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";
import { UserNav } from "./user-nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Banknote } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  console.log("[DEBUG] DashboardLayout renderizando...");
  
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen">
        <Sidebar variant="sidebar" collapsible="icon" className="border-r bg-sidebar-background">
          <SidebarHeader className="p-4 border-b bg-sidebar-background">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <Banknote className="h-7 w-7 text-primary flex-shrink-0" />
              <h1 className="text-xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">
                CartórioCashFlow
              </h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2 bg-sidebar-background">
            <ScrollArea className="h-full">
              <SidebarNav />
            </ScrollArea>
          </SidebarContent>
          
          <SidebarFooter className="p-2 border-t bg-sidebar-background">
            <UserNav />
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex-1 bg-background">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
            <div className="flex-1">
              {/* Breadcrumbs ou título da página podem ir aqui */}
            </div>
          </header>
          
          <main className="flex-1 p-4 sm:p-6 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
