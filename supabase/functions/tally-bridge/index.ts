import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
};

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const payload = await req.json();
    const { action, sessionCode, xmlRequest } = payload as {
      action?: string;
      sessionCode?: string;
      xmlRequest?: string;
      requestId?: string;
      responseData?: string;
      errorMessage?: string;
    };

    if (action === "check-session") {
      // Check database for active session
      const { data, error } = await supabase
        .from("tally_bridge_sessions")
        .select("session_code, last_heartbeat")
        .eq("session_code", sessionCode)
        .single();
      
      let isConnected = false;
      if (data && !error) {
        // Check if heartbeat is recent (within last 60 seconds)
        const lastHeartbeat = new Date(data.last_heartbeat);
        const now = new Date();
        const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;
        isConnected = diffSeconds < 60;
        
        // Clean up stale session if needed
        if (!isConnected) {
          await supabase
            .from("tally_bridge_sessions")
            .delete()
            .eq("session_code", sessionCode);
        }
      }
      
      console.log(`Session check for ${sessionCode}: ${isConnected}`);
      
      return new Response(
        JSON.stringify({ connected: isConnected }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register-session") {
      // Desktop app registers its session
      const { error } = await supabase
        .from("tally_bridge_sessions")
        .upsert({
          session_code: sessionCode,
          connected_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
        }, { onConflict: "session_code" });
      
      if (error) {
        console.error("Error registering session:", error);
        return new Response(
          JSON.stringify({ error: "Failed to register session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Session registered: ${sessionCode}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "heartbeat") {
      // Update heartbeat
      await supabase
        .from("tally_bridge_sessions")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("session_code", sessionCode);
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unregister-session") {
      // Desktop app disconnecting
      await supabase
        .from("tally_bridge_sessions")
        .delete()
        .eq("session_code", sessionCode);
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send-request") {
      // Create request and return immediately (client will poll). This avoids edge runtime timeouts.
      const waitForResponse = Boolean((payload as any)?.waitForResponse);

      // Check if session exists
      const { data: sessionData } = await supabase
        .from("tally_bridge_sessions")
        .select("session_code")
        .eq("session_code", sessionCode)
        .maybeSingle();

      if (!sessionData) {
        return new Response(
          JSON.stringify({ error: "Bridge not connected. Check if Tally Bridge app is running." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert request into database for the bridge app to pick up
      const { data: requestData, error: insertError } = await supabase
        .from("tally_bridge_requests")
        .insert({
          session_code: sessionCode,
          xml_request: xmlRequest,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !requestData) {
        console.error("Error inserting request:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Request created: ${requestData.id}`);

      // Optional: legacy blocking mode (kept for compatibility), but should be avoided.
      if (waitForResponse) {
        const startTime = Date.now();
        const timeout = 30000;

        while (Date.now() - startTime < timeout) {
          const { data: responseRow } = await supabase
            .from("tally_bridge_requests")
            .select("status, response_data, error_message")
            .eq("id", requestData.id)
            .maybeSingle();

          if (responseRow?.status === "completed") {
            await supabase.from("tally_bridge_requests").delete().eq("id", requestData.id);
            return new Response(
              JSON.stringify({ success: true, data: responseRow.response_data }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (responseRow?.status === "failed") {
            await supabase.from("tally_bridge_requests").delete().eq("id", requestData.id);
            return new Response(
              JSON.stringify({ error: responseRow.error_message || "Request failed" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await supabase.from("tally_bridge_requests").delete().eq("id", requestData.id);
        return new Response(
          JSON.stringify({ error: "Request timeout - Tally did not respond in 30 seconds" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, requestId: requestData.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-request-status") {
      const requestId = (payload as any)?.requestId as string | undefined;

      if (!requestId) {
        return new Response(
          JSON.stringify({ error: "Missing requestId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: row, error } = await supabase
        .from("tally_bridge_requests")
        .select("status, response_data, error_message")
        .eq("id", requestId)
        .maybeSingle();

      if (error) {
        console.error("Error reading request status:", { requestId, error });
        return new Response(
          JSON.stringify({ error: "Failed to read request status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!row) {
        return new Response(
          JSON.stringify({ error: "Request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (row.status === "completed") {
        await supabase.from("tally_bridge_requests").delete().eq("id", requestId);
        return new Response(
          JSON.stringify({ status: "completed", data: row.response_data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (row.status === "failed") {
        await supabase.from("tally_bridge_requests").delete().eq("id", requestId);
        return new Response(
          JSON.stringify({ status: "failed", error: row.error_message || "Request failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ status: "pending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-pending-requests") {
      // Desktop app polls for pending requests
      const { data } = await supabase
        .from("tally_bridge_requests")
        .select("id, xml_request")
        .eq("session_code", sessionCode)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

      return new Response(
        JSON.stringify({ requests: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "complete-request") {
      // Desktop app submits response
      const requestId = payload?.requestId as string | undefined;
      const responseData = payload?.responseData as string | undefined;
      const errorMessage = payload?.errorMessage as string | undefined;

      if (!requestId) {
        return new Response(
          JSON.stringify({ error: "Missing requestId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Completing request", { requestId, hasResponse: !!responseData, hasError: !!errorMessage });

      const updateData: Record<string, unknown> = {
        status: errorMessage ? "failed" : "completed",
        completed_at: new Date().toISOString(),
      };

      if (responseData) updateData.response_data = responseData;
      if (errorMessage) updateData.error_message = errorMessage;

      const { error } = await supabase
        .from("tally_bridge_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) {
        console.error("Failed to complete request", { requestId, error });
        return new Response(
          JSON.stringify({ error: "Failed to update request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error processing request:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
