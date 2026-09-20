import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Génère un hash aléatoire inutilisable comme mot de passe (comptes Google)
function randomPasswordHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "google:" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token manquant" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Vérifier le token Google OAuth auprès du serveur Auth
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user?.email) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = authData.user.email.toLowerCase();
    const meta = authData.user.user_metadata ?? {};
    const fullName: string = meta.full_name ?? meta.name ?? "";
    const firstName: string = meta.given_name ?? fullName.split(" ")[0] ?? "";
    const lastName: string =
      meta.family_name ?? fullName.split(" ").slice(1).join(" ") ?? "";
    const avatarUrl: string | null = meta.avatar_url ?? meta.picture ?? null;

    // Chercher l'utilisateur existant dans la table applicative
    const { data: existing, error: findError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (findError) throw findError;

    let user = existing;

    if (user) {
      // Email déjà vérifié par Google : activer le compte si besoin
      if (!user.is_active) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("users")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", user.id)
          .select()
          .single();
        if (updateError) throw updateError;
        user = updated;
      }
    } else {
      // Créer le compte (client, actif immédiatement — email vérifié par Google)
      const { data: created, error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          email,
          password_hash: randomPasswordHash(),
          first_name: firstName || "Utilisateur",
          last_name: lastName || "Google",
          role: "client",
          is_active: true,
          is_company: false,
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      if (createError) throw createError;
      user = created;
    }

    return new Response(JSON.stringify({ success: true, user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[google-auth-sync] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
