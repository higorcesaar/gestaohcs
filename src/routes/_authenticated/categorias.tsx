import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { KINDS } from "@/lib/finance-constants";
import { useCategories } from "@/hooks/use-categories";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/categorias")({
  component: Categorias,
});

function Categorias() {
  const { user } = useAuth();
  const [kind, setKind] = useState("variavel");
  const [name, setName] = useState("");
  const { list, reload } = useCategories();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      kind,
      name: name.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Categoria criada");
      setName("");
      reload();
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removida");
      reload();
    }
  }

  const grouped = KINDS.map((k) => ({
    ...k,
    items: list.filter((c) => c.kind === k.value),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Categorias</h1>
        <p className="text-muted-foreground">Gerencie as categorias usadas nos lançamentos.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome</Label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pet"
                />
                <Button type="submit">Adicionar</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map((g) => (
          <Card key={g.value}>
            <CardHeader>
              <CardTitle className="text-base">{g.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {g.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma categoria.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {g.items.map((c) => (
                    <Badge key={c.id} variant="secondary" className="gap-1.5 pl-2.5 pr-1 py-1">
                      {c.name}
                      <button
                        onClick={() => remove(c.id)}
                        className="hover:bg-destructive/10 rounded p-0.5"
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
