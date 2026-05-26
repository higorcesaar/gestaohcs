import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Zap, CreditCard, BarChart3, ArrowRight, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cesar Finanças Pro — Controle financeiro Ultra Premium" },
      {
        name: "description",
        content:
          "Predição de déficit, visão multi-cartões e categorização cirúrgica. A nova UI premium do Cesar Finanças.",
      },
      { property: "og:title", content: "Cesar Finanças Pro — Controle financeiro Ultra Premium" },
      {
        property: "og:description",
        content:
          "Predição de déficit, visão multi-cartões e categorização cirúrgica. A nova UI premium do Cesar Finanças.",
      },
      { property: "og:url", content: "https://gestaohcs.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://gestaohcs.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        Carregando…
      </div>
    );
  if (session) return <Navigate to="/dashboard" />;
  return <Landing />;
}

function Landing() {
  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-xl btn-gradient-primary grid place-items-center">
              <Wallet className="size-4" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-gradient-brand">Cesar</span>
              <span className="text-primary">Finanças</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#ui" className="hover:text-foreground transition-colors">UX/UI Premium</a>
            <a href="#cta" className="hover:text-foreground transition-colors">Suporte</a>
            <Link
              to="/login"
              className="rounded-lg border border-border bg-white/5 px-4 py-2 font-medium text-foreground hover:bg-white hover:text-background transition-all"
            >
              Acessar Sistema
            </Link>
          </nav>
          <Link
            to="/login"
            className="md:hidden rounded-lg border border-border bg-white/5 px-3 py-1.5 text-sm font-medium"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-16 px-4 text-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -z-10 left-[15%] top-[10%] size-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.17 162 / 0.25), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -z-10 right-[12%] bottom-[5%] size-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.21 295 / 0.22), transparent 70%)" }}
        />
        <span className="premium-chip inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] mb-6">
          Disponível • Versão 2.0 Pro
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight max-w-4xl mx-auto">
          O controle financeiro que você já confia, agora com{" "}
          <span className="text-gradient-primary">inteligência Ultra Premium</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Evoluímos a interface do Cesar Finanças para entregar máxima performance visual,
          clareza preditiva e organização automatizada de cartões e receitas.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="btn-gradient-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold"
          >
            Atualizar para o Pro <ArrowRight className="size-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold border border-border text-foreground hover:bg-white/5"
          >
            Conhecer Melhorias
          </a>
        </div>

        {/* Mockup preview */}
        <div
          id="ui"
          className="mt-16 mx-auto w-[92%] max-w-5xl rounded-2xl border border-white/10 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
          style={{
            background: "linear-gradient(145deg, oklch(0.24 0.03 265 / 0.7), oklch(0.18 0.025 265 / 0.85))",
          }}
        >
          <div className="flex items-center gap-2 px-2 pb-3">
            <span className="size-3 rounded-full" style={{ background: "#ff5f56" }} />
            <span className="size-3 rounded-full" style={{ background: "#ffbd2e" }} />
            <span className="size-3 rounded-full" style={{ background: "#27c93f" }} />
            <span className="ml-3 text-xs text-muted-foreground">
              cesarfinancas.com.br/dashboard
            </span>
          </div>
          <div className="rounded-xl bg-[#0f1626] p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <MiniCard label="Saldo Consolidado" value="R$ 339,92" tone="green" />
            <MiniCard label="Previsão de Déficit (Junho)" value="-R$ 2.167,90" tone="red" />
            <MiniCard label="Fatura Atual Inter/Nu" value="R$ 1.869,35" tone="default" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-24 border-t border-border bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.18em] mb-2">
              Engenharia Visual Avançada
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              O que mudou para tornar sua gestão financeira impecável?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature
              icon={<Zap className="size-5" />}
              title="Predição de Déficit Ativa"
              desc="Antecipe os impactos de despesas fixas e parcelamentos diretamente no topo do seu fluxo de caixa antes mesmo do mês virar."
            />
            <Feature
              icon={<CreditCard className="size-5" />}
              title="Visão Multi-Cartões"
              desc="Acompanhamento analítico e individualizado de limites consumidos e datas de vencimento críticas para cartões Inter e Nubank."
            />
            <Feature
              icon={<BarChart3 className="size-5" />}
              title="Categorização Cirúrgica"
              desc="Gráficos de barra nativos e progressivos para entender os pesos exatos de despesas com Saúde, Mobilidade e Projetos."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer id="cta" className="px-5 pt-20 pb-10 text-center border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-extrabold tracking-tight">
            Pronto para transformar sua interface de dados?
          </h3>
          <p className="mt-4 text-muted-foreground">
            Implemente a arquitetura CSS Pro no Cesar Finanças e gerencie patrimônios com a clareza
            visual que você merece.
          </p>
          <Link
            to="/login"
            className="btn-gradient-primary mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
          >
            Experimentar Nova UI <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-16 text-xs text-white/30">
          © 2026 Cesar Finanças Profissional. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

function MiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "default";
}) {
  const color =
    tone === "green"
      ? "text-[oklch(0.78_0.16_162)]"
      : tone === "red"
      ? "text-[oklch(0.72_0.2_27)]"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-border p-7 hover:border-primary/40 transition-all"
      style={{ background: "linear-gradient(145deg, oklch(0.24 0.03 265 / 0.55), oklch(0.18 0.025 265 / 0.7))" }}>
      <div className="size-11 rounded-xl grid place-items-center text-primary mb-5"
        style={{ background: "color-mix(in oklab, oklch(0.72 0.17 162) 14%, transparent)" }}>
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
