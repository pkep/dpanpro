/**
 * schedule-suspension-reminders
 *
 * Crée (ou annule) les rappels J-3/J-2/J-1 d'une intervention suspendue.
 * Appelé par le front après suspend/resume/cancel (mode Supabase direct).
 *
 * body: { action: "schedule" | "cancel", interventionId, expectedCompletionDate? }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUSPENDED_TYPES = ["SUSPENDED_J3", "SUSPENDED_J2", "SUSPENDED_J1"];

/** Date 'YYYY-MM-DD' à Paris, décalée de `offsetDays`. */
function parisYmd(offsetDays: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(new Date()).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Instant UTC correspondant à 09:00 (Europe/Paris) pour la date 'YYYY-MM-DD'. */
function parisNineAmUtc(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, 9, 0, 0);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(utcGuess));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  const offset = asUtc - utcGuess;
  return new Date(utcGuess - offset).toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      action: "schedule" | "cancel";
      interventionId: string;
      expectedCompletionDate?: string;
    };
    if (!body?.interventionId) {
      return new Response(JSON.stringify({ error: "Missing interventionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (body.action === "cancel") {
      await supabase
        .from("scheduled_reminders")
        .update({ status: "CANCELLED" })
        .eq("intervention_id", body.interventionId)
        .eq("status", "PENDING")
        .in("reminder_type", SUSPENDED_TYPES);
      return new Response(JSON.stringify({ cancelled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.expectedCompletionDate) {
      return new Response(JSON.stringify({ error: "Missing expectedCompletionDate" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // On ne recrée pas si des rappels PENDING existent déjà.
    await supabase
      .from("scheduled_reminders")
      .update({ status: "CANCELLED" })
      .eq("intervention_id", body.interventionId)
      .eq("status", "PENDING")
      .in("reminder_type", SUSPENDED_TYPES);

    const expected = body.expectedCompletionDate.slice(0, 10); // YYYY-MM-DD
    const tomorrow = parisYmd(1);
    const reminders: Record<string, unknown>[] = [];
    for (const [daysBefore, type] of [[3, "SUSPENDED_J3"], [2, "SUSPENDED_J2"], [1, "SUSPENDED_J1"]] as [number, string][]) {
      const reminderDate = addDaysYmd(expected, -daysBefore);
      if (reminderDate < tomorrow) continue; // seulement le futur
      reminders.push({
        intervention_id: body.interventionId,
        reminder_type: type,
        scheduled_for: parisNineAmUtc(reminderDate),
        status: "PENDING",
      });
    }

    if (reminders.length > 0) {
      const { error } = await supabase.from("scheduled_reminders").insert(reminders);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ scheduled: reminders.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[ScheduleSuspensionReminders] Error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
