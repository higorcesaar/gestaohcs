import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LogOut, LayoutDashboard, Receipt, Users, Wallet, Target,
  BarChart3, FileBarChart, Tags, CreditCard, Menu,
  PiggyBank, CalendarRange, Settings, Database, Landmark,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useTitular } from "@/hooks/use-titular";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { TITULARES } from "@/lib/finance-constants";
import { InstallPwaButton } from "@/components/InstallPwaButton";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label?: string; items: NavItem[] };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { titular, setTitular } = useTitular();
  const pageHeader = usePageHeader();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: NavGroup[] = [
    {
      items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/lancamentos", label: "Lançamentos", icon: Receipt },
        { to: "/categorias", label: "Categorias", icon: Tags },
        { to: "/cartoes", label: "Cartões", icon: CreditCard },
        { to: "/orcamentos", label: "Gestão Orçamentária", icon: PiggyBank },
        { to: "/metas", label: "Metas", icon: Target },
        { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
        { to: "/relatorios-consolidados", label: "Consolidados", icon: FileBarChart },
        ...(role === "admin"
          ? [{ to: "/usuarios", label: "Usuários", icon: Users }]
          : []),
      ],
    },
    {
      label: "Financeiro",
      items: [
        { to: "/contas", label: "Contas", icon: Landmark },
        { to: "/planejamento", label: "Planejamento", icon: CalendarRange },
      ],
    },
    {
      label: "Configurações",
      items: [
        { to: "/configuracoes", label: "Configurações", icon: Settings },
        { to: "/backup", label: "Backup e Dados", icon: Database },
      ],
    },
  ];

  const SidebarContent = (
    <>
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
          <Wallet className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sidebar-foreground leading-tight">Cesar Finanças</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Controle Financeiro Profissional</div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto pb-3">
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-1">
            {g.label && (
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {g.label}
              </div>
            )}
            {g.items.map((n) => {
              const active = path === n.to || path.startsWith(n.to + "/");
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileOpen(false)}
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
          </div>
        ))}
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
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-sidebar-border bg-sidebar flex-col">
        {SidebarContent}
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar flex flex-col">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                {SidebarContent}
              </SheetContent>
            </Sheet>

            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
                <Wallet className="size-4" />
              </div>
              <div className="font-semibold text-sm truncate">Cesar Finanças</div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Titular:</span>
              <Select value={titular} onValueChange={(v) => setTitular(v as "all" | "Higor" | "Mirelly")}>
                <SelectTrigger className="w-[130px] sm:w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TITULARES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </div>
      </main>

      <InstallPwaButton />
    </div>
  );
}
