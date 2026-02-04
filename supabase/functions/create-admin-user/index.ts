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

  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashHex = uint8ArrayToHex(new Uint8Array(hashBuffer));

  return `${saltHex}:${hashHex}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email, phone, role, createdBy, loginUrl } = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!["admin", "manager"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Rôle invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Cet email est déjà utilisé" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify that the creator has admin role (if createdBy is provided)
    if (createdBy) {
      const { data: creatorRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", createdBy)
        .eq("role", "admin")
        .maybeSingle();

      // For manager creation, also check if the creator has manager role with permission
      if (!creatorRole && role === "manager") {
        const { data: managerRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", createdBy)
          .eq("role", "manager")
          .maybeSingle();

        if (managerRole) {
          const { data: permissions } = await supabase
            .from("manager_permissions")
            .select("can_create_managers")
            .eq("user_id", createdBy)
            .maybeSingle();

          if (!permissions?.can_create_managers) {
            return new Response(
              JSON.stringify({ error: "Permissions insuffisantes pour créer un manager" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: "Permissions insuffisantes" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (!creatorRole && role === "admin") {
        return new Response(
          JSON.stringify({ error: "Seul un administrateur peut créer un autre administrateur" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword(tempPassword);

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        phone: phone || null,
        password_hash: passwordHash,
        role: role,
        is_active: true,
        must_change_password: true,
      })
      .select("id")
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création de l'utilisateur" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add role to user_roles table
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: newUser.id,
      role: role,
      created_by: createdBy || null,
    });

    if (roleError) {
      console.error("Error adding role:", roleError);
      // Rollback - delete the created user
      await supabase.from("users").delete().eq("id", newUser.id);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'attribution du rôle" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created ${role} user:`, newUser.id);

    // Send welcome email with temporary password
    try {
      const emailResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-welcome-admin-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            firstName,
            lastName,
            role,
            tempPassword,
            loginUrl: loginUrl || `${Deno.env.get("SITE_URL") || "https://dpanpro.lovable.app"}/auth`,
          }),
        }
      );

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the user creation, just log the error
      } else {
        console.log("Welcome email sent successfully");
      }
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the user creation if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.id,
        tempPassword: tempPassword,
      }),
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
