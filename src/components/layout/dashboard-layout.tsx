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
import { Banknote } from "lucide-react"; // Or a more specific logo icon

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Banknote className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">
              CartórioCashFlow
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <ScrollArea className="h-full">
            <SidebarNav />
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t">
          <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          {/* Breadcrumbs or Page Title can go here */}
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
