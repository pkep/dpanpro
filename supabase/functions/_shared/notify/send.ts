import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isB2bIntervention } from "./guard.ts";
import { sendSMS } from "../sms/twilio.ts";

/**
 * Émetteur CLIENT centralisé (email + SMS).
 *
 * GARDE CENTRALE : toute notification destinée au client final passe par ici et
 * est **silenciée** si l'intervention est B2B (le bénéficiaire n'est pas notre client).
 */

export type SkipReason = "b2b" | "no_recipient" | "not_configured";

export interface ClientSendResult {
  sent: boolean;
  skipped?: SkipReason;
  error?: string;
}

export interface Attachment {
  filename: string;
  content: string; // base64
}

export interface ClientEmailArgs {
  supabase: SupabaseClient;
  interventionId?: string | null;
  to?: string | null;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

/** Envoi email « client » (garde B2B incluse). */
export async function sendClientEmail(args: ClientEmailArgs): Promise<ClientSendResult> {
  if (!args.to) return { sent: false, skipped: "no_recipient" };
  if (await isB2bIntervention(args.supabase, args.interventionId)) {
    console.log("[sendClientEmail] B2B intervention — client email suppressed");
    return { sent: false, skipped: "b2b" };
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log("[sendClientEmail] RESEND_API_KEY not configured");
    return { sent: false, skipped: "not_configured" };
  }
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

  try {
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Depan.Pro <${from}>`,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      ...(args.attachments && args.attachments.length ? { attachments: args.attachments } : {}),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ClientSmsArgs {
  supabase: SupabaseClient;
  interventionId?: string | null;
  to?: string | null;
  body: string;
  context?: string;
}

/** Envoi SMS « client » (garde B2B incluse). */
export async function sendClientSms(args: ClientSmsArgs): Promise<ClientSendResult> {
  if (!args.to) return { sent: false, skipped: "no_recipient" };
  if (await isB2bIntervention(args.supabase, args.interventionId)) {
    console.log("[sendClientSms] B2B intervention — client SMS suppressed");
    return { sent: false, skipped: "b2b" };
  }
  try {
    const ok = await sendSMS(args.to, args.body, args.context ?? "[sendClientSms]");
    return { sent: ok };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
