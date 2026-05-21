import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/dashboard" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error });
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-secondary">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Wallet className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-lg">Cesar Finanças</div>
            <div className="text-sm text-muted-foreground">Controle financeiro 2026</div>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight text-foreground">
            Suas finanças, sob a luz certa.
          </h1>
          <p className="text-muted-foreground">
            Cadastre lançamentos, acompanhe gastos fixos, variáveis e parcelamentos — e receba
            mensagens do seu bot direto no Telegram.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Acesso restrito. Apenas e-mails autorizados podem entrar.
        </p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Entrar</h2>
              <p className="text-sm text-muted-foreground">Use seu e-mail autorizado e senha.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center">
            Esqueceu a senha? Use "Redefinir senha" abaixo.
          </p>
          <SignupHint />
          <ResetPassword />
        </div>
      </div>
    </div>
  );
}

function SignupHint() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function doSignup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível cadastrar", { description: error.message });
      return;
    }
    toast.success("Cadastro feito! Faça login.");
    setOpen(false);
    navigate({ to: "/login" });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-primary underline w-full text-center"
      >
        Criar conta com e-mail autorizado
      </button>
    );
  }

  return (
    <form onSubmit={doSignup} className="space-y-3 border-t pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">E-mail</Label>
        <Input
          id="signup-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Senha (mín. 8)</Label>
        <Input
          id="signup-password"
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
        {submitting ? "Cadastrando…" : "Cadastrar"}
      </Button>
    </form>
  );
}

function ResetPassword() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar reset", { description: error.message });
      return;
    }
    toast.success("Se o e-mail existir, enviaremos um link.");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline w-full text-center"
      >
        Redefinir senha
      </button>
    );
  }

  return (
    <form onSubmit={doReset} className="space-y-3 border-t pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">E-mail</Label>
        <Input
          id="reset-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={submitting}>
        {submitting ? "Enviando…" : "Enviar link de redefinição"}
      </Button>
    </form>
  );
}
