import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { TitularProvider } from "@/hooks/use-titular";
import { PageHeaderProvider } from "@/hooks/use-page-header";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  if (!session) return <Navigate to="/login" />;
  return (
    <TitularProvider>
      <PageHeaderProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </PageHeaderProvider>
    </TitularProvider>
  );
}
