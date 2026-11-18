import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildAdminResumeSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminResumeRequest {
  interventionId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await userClient.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: { role: string }) =>
      r.role === "admin" || r.role === "manager"
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { interventionId }: NotifyAdminResumeRequest = await req.json();
    if (!interventionId) {
      return new Response(JSON.stringify({ error: "interventionId missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("tracking_code, technician_id")
      .eq("id", interventionId)
      .single();
    if (interventionError || !intervention) {
      return new Response(JSON.stringify({ error: "Intervention not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!intervention.technician_id) {
      return new Response(JSON.stringify({ success: true, skipped: "no technician" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: technician } = await supabase
      .from("users")
      .select("phone")
      .eq("id", intervention.technician_id)
      .single();
    if (!technician?.phone) {
      return new Response(JSON.stringify({ success: true, skipped: "no phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sent = await sendSMS(
      technician.phone,
      buildAdminResumeSms({ trackingCode: intervention.tracking_code }),
      "[NotifyAdminResume]",
    );

    return new Response(JSON.stringify({ success: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[NotifyAdminResume] error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
