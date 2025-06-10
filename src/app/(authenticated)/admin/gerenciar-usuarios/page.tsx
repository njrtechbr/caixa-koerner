"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
import { useState } from "react";

// Mock user data
const mockUsers = [
  { id: "1", nome: "Operador Fulano", email: "operador@example.com", cargo: "operador_caixa", mfa_enabled: true },
  { id: "2", nome: "Supervisor Ciclano", email: "supervisor@example.com", cargo: "supervisor_caixa", mfa_enabled: true },
  { id: "3", nome: "Admin Beltrano", email: "admin@example.com", cargo: "admin", mfa_enabled: false },
];

const roleTranslations: { [key: string]: string } = {
  operador_caixa: "Operador de Caixa",
  supervisor_caixa: "Supervisor de Caixa",
  supervisor_conferencia: "Supervisor de Conferência",
  admin: "Administrador",
};


export default function GerenciarUsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredUsers = mockUsers.filter(user => 
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Gerenciar Usuários"
        description="Adicione, edite, e remova usuários do sistema."
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
           <div className="flex items-center py-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar usuários..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>MFA Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{roleTranslations[user.cargo] || user.cargo}</TableCell>
                  <TableCell>{user.mfa_enabled ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-2">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                       <span className="sr-only">Remover</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Nenhum usuário encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
