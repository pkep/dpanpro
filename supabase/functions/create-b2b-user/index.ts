import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { buildLoginUrl } from "../_shared/app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function uint8ArrayToHex(arr: Uint8Array): string {
  return new TextDecoder().decode(encode(arr));
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = uint8ArrayToHex(salt);
  const data = new TextEncoder().encode(password + saltHex);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return `${saltHex}:${uint8ArrayToHex(new Uint8Array(hashBuffer))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      b2bPartnerId,
      firstName,
      lastName,
      email,
      phone,
      createdBy,
    } = await req.json();

    if (!b2bPartnerId || !email) {
      return new Response(JSON.stringify({ error: "b2bPartnerId et email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Partenaire + garde « un compte par partenaire »
    const { data: partner, error: partnerError } = await supabase
      .from("b2b_partners")
      .select("id, company_name, contact_firstname, contact_lastname, contact_email, contact_phone, user_id")
      .eq("id", b2bPartnerId)
      .maybeSingle();

    if (partnerError) throw partnerError;
    if (!partner) {
      return new Response(JSON.stringify({ error: "Partenaire B2B introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (partner.user_id) {
      return new Response(JSON.stringify({ error: "Ce partenaire possède déjà un compte de connexion" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(partner.contact_email || email).trim().toLowerCase();
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return new Response(JSON.stringify({ error: "Cet email est déjà utilisé" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedFirstName = firstName || partner.contact_firstname || partner.company_name || "Partenaire";
    const resolvedLastName = lastName || partner.contact_lastname || "";
    const tempPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword(tempPassword);

    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        email: normalizedEmail,
        phone: phone || partner.contact_phone || null,
        password_hash: passwordHash,
        role: "b2b",
        is_active: true,
        must_change_password: true,
      })
      .select("id")
      .single();

    if (userError) throw userError;

    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: newUser.id,
      role: "b2b",
      created_by: createdBy || null,
    });

    if (roleError) {
      await supabase.from("users").delete().eq("id", newUser.id);
      throw roleError;
    }

    const { error: linkError } = await supabase
      .from("b2b_partners")
      .update({ user_id: newUser.id })
      .eq("id", b2bPartnerId);

    if (linkError) {
      await supabase.from("user_roles").delete().eq("user_id", newUser.id);
      await supabase.from("users").delete().eq("id", newUser.id);
      throw linkError;
    }

    // Email de bienvenue (best-effort, ne bloque pas la création)
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-welcome-admin-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          role: "b2b",
          tempPassword,
          loginUrl: buildLoginUrl(),
        }),
      });
    } catch (emailError) {
      console.error("Failed to send B2B welcome email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.id,
        tempPassword,
        email: normalizedEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-b2b-user error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
