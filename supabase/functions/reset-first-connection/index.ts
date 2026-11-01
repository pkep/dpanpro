import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

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
    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, role")
      .eq("id", userId)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["admin", "manager", "b2b"].includes(user.role)) {
      return new Response(JSON.stringify({ error: "Action réservée aux comptes admin / manager / B2B" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword(tempPassword);

    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: passwordHash, must_change_password: true })
      .eq("id", userId);
    if (updateError) throw updateError;

    const roleLabel = user.role === "admin"
      ? "Administrateur"
      : user.role === "b2b"
        ? "Partenaire B2B"
        : "Manager";

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-welcome-admin-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        email: user.email,
        firstName: user.first_name || user.email,
        lastName: user.last_name || "",
        role: user.role,
        tempPassword,
      }),
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text();
      throw new Error(`Email non envoyé: ${detail}`);
    }

    return new Response(JSON.stringify({ success: true, email: user.email, roleLabel }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("reset-first-connection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
