import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { ReactNode } from "react";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
