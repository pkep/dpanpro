import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, canCreateManagers, grantedBy } = await req.json();

    // Validate required fields
    if (!userId || canCreateManagers === undefined) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify that the granter has admin role
    if (grantedBy) {
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", grantedBy)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: "Seul un administrateur peut modifier les permissions" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify that the target user is a manager
    const { data: managerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "manager")
      .maybeSingle();

    if (!managerRole) {
      return new Response(
        JSON.stringify({ error: "L'utilisateur n'est pas un manager" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert manager permissions
    const { error } = await supabase.from("manager_permissions").upsert(
      {
        user_id: userId,
        can_create_managers: canCreateManagers,
        granted_by: grantedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error updating permissions:", error);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la mise à jour des permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updated permissions for manager ${userId}: canCreateManagers=${canCreateManagers}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
