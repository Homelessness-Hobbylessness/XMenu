import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const HCAPTCHA_SECRET = Deno.env.get("HCAPTCHA_SECRET") ?? "";
const HCAPTCHA_SITEKEY = "6304b98e-e316-4c90-a7c4-198c10b4d878";
const SITEVERIFY_URL = "https://api.hcaptcha.com/siteverify";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://xmenu.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!HCAPTCHA_SECRET) {
    return new Response(JSON.stringify({ success: false, error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let token: string | undefined;
  let remoteip: string | undefined;

  try {
    const body = await req.json();
    token = body.token;
    remoteip = body.remoteip;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ success: false, error: "Missing captcha token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const params = new URLSearchParams({
    secret: HCAPTCHA_SECRET,
    response: token,
    sitekey: HCAPTCHA_SITEKEY,
  });
  if (remoteip) params.set("remoteip", remoteip);

  const verifyRes = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const result = await verifyRes.json();

  return new Response(JSON.stringify({ success: result.success === true, "error-codes": result["error-codes"] ?? [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
