import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function InstallPwaButton() {
  const { canInstall, installed, standalone, isIOS, promptInstall } = usePwaInstall();
  const [iosOpen, setIosOpen] = useState(false);

  if (standalone || installed) return null;
  if (!canInstall && !isIOS) return null;

  const onClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") toast.success("App instalado!");
    } else if (isIOS) {
      setIosOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={onClick}
        size="icon"
        className="fixed bottom-5 right-5 z-50 size-14 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
        aria-label="Instalar aplicativo"
        title="Instalar aplicativo"
      >
        <Download className="size-6" />
      </Button>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar no iPhone/iPad</DialogTitle>
            <DialogDescription>
              No Safari, toque em <Share className="inline size-4" /> Compartilhar
              e selecione <strong>"Adicionar à Tela de Início"</strong>.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => setIosOpen(false)}>
            <X className="size-4 mr-2" /> Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
