// Shared logger helper for edge functions.
// Writes structured entries to public.system_logs so the admin monitoring page can display them.

import { createClient } from "npm:@supabase/supabase-js@2";

type Level = "info" | "warn" | "error";

interface LogEntry {
  level: Level;
  source: string; // edge function name
  message: string;
  context?: Record<string, unknown>;
  interventionId?: string;
  userId?: string;
}

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (client) return client;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function logSystem(entry: LogEntry): Promise<void> {
  try {
    // Always mirror to console for native edge function logs
    const line = `[${entry.source}] ${entry.message}`;
    if (entry.level === "error") console.error(line, entry.context ?? "");
    else if (entry.level === "warn") console.warn(line, entry.context ?? "");
    else console.log(line, entry.context ?? "");

    await getClient().from("system_logs").insert({
      level: entry.level,
      source: entry.source,
      message: entry.message,
      context: entry.context ?? null,
      intervention_id: entry.interventionId ?? null,
      user_id: entry.userId ?? null,
    });
  } catch (err) {
    // Never throw from the logger
    console.error("[logger] Failed to persist log:", err);
  }
}

export const logInfo = (source: string, message: string, context?: Record<string, unknown>) =>
  logSystem({ level: "info", source, message, context });

export const logWarn = (source: string, message: string, context?: Record<string, unknown>) =>
  logSystem({ level: "warn", source, message, context });

export const logError = (source: string, message: string, context?: Record<string, unknown>) =>
  logSystem({ level: "error", source, message, context });
