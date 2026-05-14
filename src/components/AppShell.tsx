import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LogOut, LayoutDashboard, Receipt, Users, Wallet, Target,
  BarChart3, FileBarChart,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/lancamentos", label: "Lançamentos", icon: Receipt },
    ...(role === "admin"
      ? [{ to: "/usuarios", label: "Usuários", icon: Users }]
      : []),
    { to: "/metas", label: "Metas", icon: Target },
    { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
    { to: "/relatorios-consolidados", label: "Relatórios Consolidados", icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <Wallet className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sidebar-foreground leading-tight">Cesar Finanças</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Controle Financeiro Profissional</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
