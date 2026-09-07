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
  const pemBody = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
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
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
      } else if (period === "month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
      } else if (period === "week") {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
      } else {
        from = now.toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
      }
    }

    const accessToken = await getAccessToken(GA4_SERVICE_ACCOUNT_JSON);

    // Helper to run and parse
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

    const fetchNewInterventionViews = async () => {
      const data: any = await runReport(GA4_PROPERTY_ID, accessToken, {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "pagePathPlusQueryString" }],
        metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePathPlusQueryString",
            stringFilter: { matchType: "CONTAINS", value: "/new-intervention", caseSensitive: false },
          },
        },
      });
      let views = 0, users = 0;
      for (const r of (data.rows || [])) {
        views += parseInt(r.metricValues[0].value, 10) || 0;
        users += parseInt(r.metricValues[1].value, 10) || 0;
      }
      return { views, users };
    };

    const [sessionsOverTime, acquisition, avg, newVsReturning, byDevice, pageViews] = await Promise.all([
      fetchSessionsOverTime(),
      fetchAcquisition(),
      fetchAvg(),
      fetchNewVsReturning(),
      fetchByDevice(),
      fetchNewInterventionViews(),
    ]);

    return new Response(JSON.stringify({
      sessionsOverTime,
      newInterventionViews: pageViews.views,
      newInterventionUsers: pageViews.users,
      acquisition,
      avgSessionDurationSeconds: avg.avgSessionDurationSeconds,
      avgPagesPerSession: avg.avgPagesPerSession,
      newVsReturning,
      byDevice,
      period,
      from,
      to,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
