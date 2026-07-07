// Returns a monitoring summary for the admin dashboard:
// - error/warn counts (7d)
// - recent system_logs
// - dispatch attempts in last 7d (success vs timeout)
// - last batch run markers (from system_logs source = 'batch-*')
// - pending disputes count
// - interventions stuck in 'new' with no technician for > 30min


import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Custom auth (no Supabase session): caller must pass userId in body.
  let userId: string | null = null;
  try {
    const body = await req.json();
    userId = body?.userId ?? null;
  } catch {
    userId = null;
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (userErr || !userRow || !userRow.is_active || !["admin", "manager"].includes(userRow.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const since30min = new Date(Date.now() - 30 * 60 * 1000).toISOString();


  const [
    errorsHead,
    warnsHead,
    recentLogs,
    dispatchAttempts,
    pendingDisputes,
    stuckInterventions,
    lastBatchRuns,
  ] = await Promise.all([
    admin
      .from("system_logs")
      .select("id", { count: "exact", head: true })
      .eq("level", "error")
      .gte("created_at", since7d),
    admin
      .from("system_logs")
      .select("id", { count: "exact", head: true })
      .eq("level", "warn")
      .gte("created_at", since7d),
    admin
      .from("system_logs")
      .select("id, level, source, message, context, intervention_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("dispatch_attempts")
      .select("status")
      .gte("created_at", since7d),
    admin
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("interventions")
      .select("id, tracking_code, created_at, status")
      .eq("status", "new")
      .is("technician_id", null)
      .lt("created_at", since30min)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("system_logs")
      .select("source, created_at, level, message")
      .ilike("source", "batch-%")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const dispatchByStatus: Record<string, number> = {};
  for (const r of dispatchAttempts.data ?? []) {
    const s = (r as { status?: string }).status ?? "unknown";
    dispatchByStatus[s] = (dispatchByStatus[s] ?? 0) + 1;
  }

  // Keep only the latest run per batch source
  const batchLastRun: Record<string, { created_at: string; level: string; message: string }> = {};
  for (const row of lastBatchRuns.data ?? []) {
    const r = row as { source: string; created_at: string; level: string; message: string };
    if (!batchLastRun[r.source]) {
      batchLastRun[r.source] = {
        created_at: r.created_at,
        level: r.level,
        message: r.message,
      };
    }
  }

  return new Response(
    JSON.stringify({
      counts: {
        errors7d: errorsHead.count ?? 0,
        warns7d: warnsHead.count ?? 0,
        pendingDisputes: pendingDisputes.count ?? 0,
        stuckInterventions: (stuckInterventions.data ?? []).length,
      },
      dispatchByStatus,
      recentLogs: recentLogs.data ?? [],
      stuckInterventions: stuckInterventions.data ?? [],
      batchLastRun,
      generatedAt: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
