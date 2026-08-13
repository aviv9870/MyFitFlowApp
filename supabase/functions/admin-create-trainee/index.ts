import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Single-admin gate: only this account can create trainee accounts.
const ADMIN_EMAIL = "aviv9870@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller and that they are the admin.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller?.email || caller.email.toLowerCase() !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "אין הרשאה" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, fullName, redirectTo } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "יש לספק אימייל" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: fullName ? { full_name: fullName } : undefined,
        redirectTo,
      },
    );
    if (inviteError) throw inviteError;

    const traineeId = invited.user.id;

    const { error: permError } = await adminClient.from("coach_permissions").insert({
      trainee_id: traineeId,
      coach_email: caller.email,
    });
    if (permError) throw permError;

    return new Response(JSON.stringify({ trainee_id: traineeId, email: invited.user.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-create-trainee error:", err);
    let message = err instanceof Error ? err.message : "שגיאה לא ידועה";
    if (/rate limit/i.test(message)) {
      message = "הגעת למגבלת שליחת מיילים של Supabase (השירות המובנה מוגבל מאוד) — נסה שוב בעוד כמה דקות, או הגדר SMTP מותאם אישית ב-Dashboard לשליחה אמינה";
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
