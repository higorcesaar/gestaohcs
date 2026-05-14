import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";
import type { Database } from "@/integrations/supabase/types";

function deriveSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

let _admin: ReturnType<typeof createClient<Database>> | null = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _admin;
}

async function forwardToOwner(token: string, ownerChatId: string, payload: {
  from?: string; username?: string; chatId: number; text: string | null; type: string;
}) {
  const lines = [
    "📩 <b>Nova mensagem para o bot</b>",
    payload.from ? `👤 <b>De:</b> ${escapeHtml(payload.from)}${payload.username ? ` (@${escapeHtml(payload.username)})` : ""}` : null,
    `💬 <b>Chat ID:</b> <code>${payload.chatId}</code>`,
    `📝 <b>Tipo:</b> ${escapeHtml(payload.type)}`,
    "",
    payload.text ? escapeHtml(payload.text) : "<i>(sem texto)</i>",
  ].filter(Boolean).join("\n");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: ownerChatId, text: lines, parse_mode: "HTML" }),
  });
  if (!res.ok) {
    console.error("Telegram forward failed", res.status, await res.text());
    return false;
  }
  return true;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
        if (!token || !ownerChatId) {
          return new Response("Missing config", { status: 500 });
        }

        const expected = deriveSecret(token);
        const actual = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!safeEqual(actual, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = await request.json() as Record<string, unknown>;
        const message = (update.message ?? update.edited_message ?? update.channel_post) as
          | Record<string, unknown> | undefined;

        if (!message || typeof update.update_id !== "number") {
          return Response.json({ ok: true, ignored: true });
        }

        const chat = message.chat as { id: number } | undefined;
        const from = message.from as { id?: number; username?: string; first_name?: string; last_name?: string } | undefined;
        const text = (message.text ?? message.caption ?? null) as string | null;
        const type = inferType(message);

        if (!chat?.id) return Response.json({ ok: true, ignored: true });

        const admin = getAdmin();
        const fromName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || null;

        await admin.from("telegram_messages").upsert({
          update_id: update.update_id,
          chat_id: chat.id,
          from_user_id: from?.id ?? null,
          from_username: from?.username ?? null,
          from_name: fromName,
          text,
          raw_update: update as never,
        }, { onConflict: "update_id" });

        const ok = await forwardToOwner(token, ownerChatId, {
          from: fromName ?? from?.username ?? undefined,
          username: from?.username,
          chatId: chat.id,
          text,
          type,
        });

        if (ok) {
          await admin.from("telegram_messages").update({ forwarded: true }).eq("update_id", update.update_id);
        }

        return Response.json({ ok: true });
      },
    },
  },
});

function inferType(m: Record<string, unknown>): string {
  if (m.text) return "texto";
  if (m.photo) return "foto";
  if (m.video) return "vídeo";
  if (m.voice) return "áudio";
  if (m.document) return "documento";
  if (m.sticker) return "sticker";
  if (m.location) return "localização";
  return "outro";
}
