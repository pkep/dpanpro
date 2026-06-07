import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotifyManagerAfterJobTechnicianHtml } from "../_shared/email-templates/notify-manager-after-job-technician.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  technicianId: string;
}

const ACTION_KEY = "welcome-job-technician";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { technicianId }: RequestBody = await req.json();

    if (!technicianId) {
      return new Response(JSON.stringify({ error: "technicianId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch technician user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", technicianId)
      .maybeSingle();

    if (userError || !user) {
      console.error("[NotifyManagerAfterJobTechnician] User not found:", userError);
      return new Response(JSON.stringify({ error: "Technician not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch partner application
    const { data: application } = await supabase
      .from("partner_applications")
      .select("company_name, siren, ape_code, skills")
      .eq("user_id", technicianId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch action recipients config
    const { data: config, error: configError } = await supabase
      .from("action_notification_recipients")
      .select("roles, email")
      .eq("action", ACTION_KEY)
      .maybeSingle();

    if (configError) {
      console.error("[NotifyManagerAfterJobTechnician] Config fetch error:", configError);
    }

    const recipients = new Set<string>();

    // Add custom emails
    if (config?.email && Array.isArray(config.email)) {
      for (const e of config.email) {
        if (e) recipients.add(e);
      }
    }

    // Resolve role-based recipients
    if (config?.roles && Array.isArray(config.roles) && config.roles.length > 0) {
      const { data: roleUsers, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", config.roles);

      if (rolesError) {
        console.error("[NotifyManagerAfterJobTechnician] Roles fetch error:", rolesError);
      } else if (roleUsers && roleUsers.length > 0) {
        const userIds = [...new Set(roleUsers.map((r: { user_id: string }) => r.user_id))];
        const { data: roleEmails } = await supabase
          .from("users")
          .select("email")
          .in("id", userIds);

        if (roleEmails) {
          for (const u of roleEmails as { email: string }[]) {
            if (u.email) recipients.add(u.email);
          }
        }
      }
    }

    if (recipients.size === 0) {
      console.log("[NotifyManagerAfterJobTechnician] No recipients found");
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.log("[NotifyManagerAfterJobTechnician] Resend not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Email not sent - Resend not configured", recipients: [...recipients] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const { subject, html } = buildNotifyManagerAfterJobTechnicianHtml({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      companyName: application?.company_name || "",
      siren: application?.siren || "",
      apeCode: application?.ape_code || "",
      skills: (application?.skills as string[] | null) || [],
    });

    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${resendFromEmail}>`,
      to: [...recipients],
      subject,
      html,
    });

    console.log(`[NotifyManagerAfterJobTechnician] Email sent to ${[...recipients].join(", ")}:`, emailResponse);

    return new Response(JSON.stringify({ success: true, recipients: [...recipients], emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[NotifyManagerAfterJobTechnician] Error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
