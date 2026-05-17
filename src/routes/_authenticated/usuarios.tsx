import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  listUsers, createUser, listAllowedEmails, addAllowedEmail, removeAllowedEmail,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

interface UserRow { id: string; email: string; display_name: string | null; created_at: string; roles: string[] }
interface AllowedRow { email: string; is_admin: boolean; created_at: string }

function UsuariosPage() {
  const { role, loading, user } = useAuth();
  const fetchUsers = useServerFn(listUsers);
  const fetchAllowed = useServerFn(listAllowedEmails);
  const doCreate = useServerFn(createUser);
  const doAdd = useServerFn(addAllowedEmail);
  const doRemove = useServerFn(removeAllowedEmail);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [allowed, setAllowed] = useState<AllowedRow[]>([]);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [allowEmail, setAllowEmail] = useState("");
  const [allowAdmin, setAllowAdmin] = useState(false);

  async function refresh() {
    try {
      const [u, a] = await Promise.all([fetchUsers(), fetchAllowed()]);
      setUsers(u as UserRow[]);
      setAllowed(a as AllowedRow[]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  useEffect(() => { if (role === "admin") refresh(); }, [role]);

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;
  if (role !== "admin") return <Navigate to="/dashboard" />;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await doCreate({ data: { email, password, display_name: name, is_admin: isAdmin } });
      toast.success("Usuário criado");
      setEmail(""); setPassword(""); setName(""); setIsAdmin(false);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function onAddAllowed(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await doAdd({ data: { email: allowEmail, is_admin: allowAdmin } });
      toast.success("E-mail autorizado");
      setAllowEmail(""); setAllowAdmin(false);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function onRemoveAllowed(emailToRemove: string) {
    try {
      await doRemove({ data: { email: emailToRemove } });
      toast.success("E-mail removido");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Usuários</h1>
        <p className="text-muted-foreground">Gerencie quem tem acesso ao sistema.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Criar usuário</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>Senha (mín. 8)</Label><Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">Conceder permissão de admin</span>
                <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">Criar usuário</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Autorizar e-mail (auto-cadastro)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Adicione um e-mail aqui para que a pessoa possa se cadastrar sozinha pela tela de login.
            </p>
            <form onSubmit={onAddAllowed} className="space-y-3">
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={allowEmail} onChange={(e) => setAllowEmail(e.target.value)} required /></div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">Cadastrar como admin</span>
                <Switch checked={allowAdmin} onCheckedChange={setAllowAdmin} />
              </div>
              <Button type="submit" disabled={busy} variant="secondary" className="w-full">Autorizar</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários ativos</CardTitle></CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papéis</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.display_name ?? "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="space-x-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">E-mails autorizados</CardTitle></CardHeader>
        <CardContent>
          {allowed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum e-mail autorizado.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>E-mail</TableHead><TableHead>Admin?</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {allowed.map((a) => (
                  <TableRow key={a.email}>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.is_admin ? <Badge>admin</Badge> : <Badge variant="secondary">user</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => onRemoveAllowed(a.email)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
