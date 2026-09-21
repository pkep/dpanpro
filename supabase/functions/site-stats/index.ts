import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const enc = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${enc(header)}.${enc(payload)}`;
  // Import private key
  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pemBody = pem.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const bin = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", bin, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${b64sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token: " + JSON.stringify(data));
  return data.access_token;
}

async function runReport(propertyId: string, accessToken: string, body: unknown) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GA4 runReport failed ${res.status}: ${txt}`);
  }
  return await res.json();
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: string, days: number): string {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return isoDate(dt);
}

function diffDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

function addYears(d: string, years: number): string {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCFullYear(dt.getUTCFullYear() + years);
  return isoDate(dt);
}

function singleRange(from: string, to: string) {
  return [{ startDate: from, endDate: to }];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: pub } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
      const role = (pub as any)?.role;
      if (role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const period = (body.period || url.searchParams.get("period") || "month") as string;
    let from = (body.from || url.searchParams.get("from") || null) as string | null;
    let to = (body.to || url.searchParams.get("to") || null) as string | null;

    const GA4_PROPERTY_ID = Deno.env.get("GA4_PROPERTY_ID");
    const GA4_SERVICE_ACCOUNT_JSON = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON");
    if (!GA4_PROPERTY_ID || !GA4_SERVICE_ACCOUNT_JSON) {
      return new Response(JSON.stringify({ error: "GA4 non configuré", hint: "Ajoutez GA4_PROPERTY_ID et GA4_SERVICE_ACCOUNT_JSON" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    if (!from || !to) {
      if (period === "all") {
        from = isoDate(new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000));
        to = isoDate(now);
      } else if (period === "month") {
        from = isoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
        to = isoDate(now);
      } else if (period === "week") {
        from = isoDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        to = isoDate(now);
      } else {
        from = isoDate(now);
        to = isoDate(now);
      }
    }

    // Comparison windows: previous equal-length window + same window last year
    const lengthDays = Math.max(1, diffDays(from, to));
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(lengthDays - 1));
    const yoyFrom = addYears(from, -1);
    const yoyTo = addYears(to, -1);

    const accessToken = await getAccessToken(GA4_SERVICE_ACCOUNT_JSON);

    const fetchSessionsOverTime = async () => {
      const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      const rows = data.rows || [];
      return rows.map((r: any) => {
        const d = r.dimensionValues[0].value; // YYYYMMDD
        const formatted = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d;
        return { date: formatted, sessions: parseInt(r.metricValues[0].value, 10) || 0 };
      });
    };

    const fetchAcquisition = async () => {
      const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      });
      return (data.rows || []).map((r: any) => ({ label: r.dimensionValues[0].value, value: parseInt(r.metricValues[0].value, 10) || 0 }));
    };

    const fetchAvg = async () => {
      const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
        dateRanges: [{ startDate: from, endDate: to }],
        metrics: [{ name: "averageSessionDuration" }, { name: "screenPageViewsPerSession" }],
      });
      const row = data.rows?.[0];
      return {
        avgSessionDurationSeconds: row ? parseFloat(row.metricValues[0].value) || 0 : 0,
        avgPagesPerSession: row ? parseFloat(row.metricValues[1].value) || 0 : 0,
      };
    };

    const fetchNewVsReturning = async () => {
      const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [{ name: "totalUsers" }],
      });
      const map: Record<string, number> = {};
      for (const r of (data.rows || [])) map[r.dimensionValues[0].value.toLowerCase()] = parseInt(r.metricValues[0].value, 10) || 0;
      return [{ label: "New", value: map["new"] || 0 }, { label: "Returning", value: map["returning"] || 0 }];
    };

    const fetchByDevice = async () => {
      const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
      });
      const map: Record<string, number> = {};
      for (const r of (data.rows || [])) map[r.dimensionValues[0].value.toLowerCase()] = parseInt(r.metricValues[0].value, 10) || 0;
      return [
        { label: "Mobile", value: map["mobile"] || 0 },
        { label: "Desktop", value: map["desktop"] || 0 },
        { label: "Tablet", value: map["tablet"] || 0 },
      ];
    };

    const fetchSessionsByChannel = async () => {
      const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      return (data.rows || []).map((r: any) => {
        const d = r.dimensionValues[0].value;
        const formatted = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d;
        return { date: formatted, channel: r.dimensionValues[1].value, sessions: parseInt(r.metricValues[0].value, 10) || 0 };
      });
    };

    const fetchNewInterventionRanged = async (): Promise<number[][]> => {
      const out = [[0, 0], [0, 0], [0, 0]];
      const starts = [from, prevFrom, yoyFrom];
      const ends = [to, prevTo, yoyTo];
      for (let i = 0; i < 3; i++) {
        try {
          const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
            dateRanges: singleRange(starts[i], ends[i]),
            dimensions: [{ name: "pagePathPlusQueryString" }],
            metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
            dimensionFilter: {
              filter: {
                fieldName: "pagePathPlusQueryString",
                stringFilter: { matchType: "CONTAINS", value: "/new-intervention", caseSensitive: false },
              },
            },
          });
          for (const r of (data.rows || [])) {
            out[i][0] += parseInt(r.metricValues[0].value, 10) || 0;
            out[i][1] += parseInt(r.metricValues[1].value, 10) || 0;
          }
        } catch (e) {
          console.warn(`fetchNewInterventionRanged [${starts[i]} -> ${ends[i]}] failed:`, String(e));
        }
      }
      return out;
    };

    const fetchAudienceRanged = async (): Promise<number[][]> => {
      const out = [[0, 0], [0, 0], [0, 0]];
      const starts = [from, prevFrom, yoyFrom];
      const ends = [to, prevTo, yoyTo];
      for (let i = 0; i < 3; i++) {
        try {
          const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
            dateRanges: singleRange(starts[i], ends[i]),
            metrics: [{ name: "activeUsers" }, { name: "newUsers" }],
          });
          const row = data.rows?.[0];
          if (row) {
            out[i][0] = parseInt(row.metricValues[0].value, 10) || 0;
            out[i][1] = parseInt(row.metricValues[1].value, 10) || 0;
          }
        } catch (e) {
          console.warn(`fetchAudienceRanged [${starts[i]} -> ${ends[i]}] failed:`, String(e));
        }
      }
      return out;
    };

    const fetchFinalStepRanged = async (): Promise<number[][]> => {
      const out = [[0, 0], [0, 0], [0, 0]];
      const starts = [from, prevFrom, yoyFrom];
      const ends = [to, prevTo, yoyTo];
      for (let i = 0; i < 3; i++) {
        try {
          const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
            dateRanges: singleRange(starts[i], ends[i]),
            dimensions: [{ name: "eventName" }],
            metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
            dimensionFilter: {
              filter: {
                fieldName: "eventName",
                stringFilter: { matchType: "EXACT", value: "submit_success" },
              },
            },
          });
          for (const r of (data.rows || [])) {
            out[i][0] += parseInt(r.metricValues[0].value, 10) || 0;
            out[i][1] += parseInt(r.metricValues[1].value, 10) || 0;
          }
        } catch (e) {
          console.warn(`fetchFinalStepRanged [${starts[i]} -> ${ends[i]}] failed:`, String(e));
        }
      }
      return out;
    };

    const fetchCountries = async (totalActiveUsers: number) => {
      const out: { country: string; countryId: string; activeUsers: number; share: number }[] = [];
      try {
        const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
          dateRanges: [{ startDate: from, endDate: to }],
          dimensions: [{ name: "country" }, { name: "countryId" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 6,
        });
        const rows = data.rows || [];
        let returnedTotal = 0;
        for (const r of rows) returnedTotal += parseInt(r.metricValues[0].value, 10) || 0;
        const denominator = totalActiveUsers > 0 ? totalActiveUsers : returnedTotal;
        const limit = Math.min(5, rows.length);
        let topSum = 0;
        for (let i = 0; i < limit; i++) {
          const users = parseInt(rows[i].metricValues[0].value, 10) || 0;
          topSum += users;
          const share = denominator > 0 ? (users * 100) / denominator : 0;
          out.push({
            country: rows[i].dimensionValues[0].value,
            countryId: rows[i].dimensionValues[1].value,
            activeUsers: users,
            share: Math.round(share * 10) / 10,
          });
        }
        if (denominator > topSum) {
          const others = denominator - topSum;
          out.push({ country: "Autres", countryId: "", activeUsers: others, share: Math.round((others * 100 / denominator) * 10) / 10 });
        }
      } catch (e) {
        console.warn("fetchCountries failed:", String(e));
      }
      return out;
    };

    const countDb = async (start: string, end: string): Promise<number> => {
      try {
        const { count } = await supabase
          .from("interventions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${start}T00:00:00.000Z`)
          .lt("created_at", `${addDays(end, 1)}T00:00:00.000Z`);
        return count || 0;
      } catch (e) {
        console.warn("countDb failed:", String(e));
        return 0;
      }
    };

    const [sessionsOverTime, sessionsByChannel, acquisition, avg, newVsReturning, byDevice, newIntervention, audience, finalStep] = await Promise.all([
      fetchSessionsOverTime(),
      fetchSessionsByChannel(),
      fetchAcquisition(),
      fetchAvg(),
      fetchNewVsReturning(),
      fetchByDevice(),
      fetchNewInterventionRanged(),
      fetchAudienceRanged(),
      fetchFinalStepRanged(),
    ]);

    const [countries, dbCurrent, dbPrev, dbYoy] = await Promise.all([
      fetchCountries(audience[0][0]),
      countDb(from, to),
      countDb(prevFrom, prevTo),
      countDb(yoyFrom, yoyTo),
    ]);

    return new Response(JSON.stringify({
      sessionsOverTime,
      sessionsByChannel,
      newInterventionViews: newIntervention[0][0],
      newInterventionUsers: newIntervention[0][1],
      acquisition,
      avgSessionDurationSeconds: avg.avgSessionDurationSeconds,
      avgPagesPerSession: avg.avgPagesPerSession,
      newVsReturning,
      byDevice,
      period,
      from,
      to,
      activeUsers: audience[0][0],
      newUsers: audience[0][1],
      prevActiveUsers: audience[1][0],
      prevNewUsers: audience[1][1],
      yoyActiveUsers: audience[2][0],
      yoyNewUsers: audience[2][1],
      prevNewInterventionViews: newIntervention[1][0],
      prevNewInterventionUsers: newIntervention[1][1],
      yoyNewInterventionViews: newIntervention[2][0],
      yoyNewInterventionUsers: newIntervention[2][1],
      finalStepUsers: finalStep[0][0],
      finalStepEvents: finalStep[0][1],
      prevFinalStepUsers: finalStep[1][0],
      prevFinalStepEvents: finalStep[1][1],
      yoyFinalStepUsers: finalStep[2][0],
      yoyFinalStepEvents: finalStep[2][1],
      dbInterventionsCreated: dbCurrent,
      prevDbInterventionsCreated: dbPrev,
      yoyDbInterventionsCreated: dbYoy,
      countries,
      prevFrom,
      prevTo,
      yoyFrom,
      yoyTo,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
