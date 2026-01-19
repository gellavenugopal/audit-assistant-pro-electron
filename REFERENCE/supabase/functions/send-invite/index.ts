import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Canonical request body - supports both old and new formats
interface InviteRequest {
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  inviterName?: string;
  appUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
      console.error("Validation error: email is required");
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!body.role || typeof body.role !== 'string' || !body.role.trim()) {
      console.error("Validation error: role is required");
      return new Response(
        JSON.stringify({ error: "role is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract fields with safe defaults for backward compatibility
    const email = body.email.trim();
    const role = body.role.trim();
    const fullName = body.full_name?.trim() || null;
    const phone = body.phone?.trim() || null;
    const inviterName = body.inviterName?.trim() || "Admin";
    
    // Derive appUrl from request origin header or use safe default
    let appUrl = body.appUrl?.trim();
    if (!appUrl) {
      const origin = req.headers.get("origin");
      appUrl = origin || "https://app.lovable.dev";
    }

    console.log(`[send-invite] Sending invite to: ${email}, role: ${role}, inviter: ${inviterName}`);
    if (fullName) console.log(`[send-invite] Full name provided: ${fullName}`);

    const roleName = role.charAt(0).toUpperCase() + role.slice(1);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Audit Platform <onboarding@resend.dev>",
        to: [email],
        subject: "You've been invited to join the Audit Platform",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Audit Platform Invitation</h1>
              </div>
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hello${fullName ? ` ${fullName}` : ''},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  <strong>${inviterName}</strong> has invited you to join the Audit Platform as a <strong>${roleName}</strong>.
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Click the button below to create your account and get started:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${appUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Join Now
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
              <div style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Audit Platform. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("[send-invite] Resend API error:", errorData);
      throw new Error(errorData.message || "Failed to send email");
    }

    const data = await res.json();
    console.log("[send-invite] Email sent successfully:", data.id);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[send-invite] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
