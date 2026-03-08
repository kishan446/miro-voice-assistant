import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check: validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation
    const body = await req.json();
    const { query, messages } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0 || query.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid query. Must be a non-empty string under 2000 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages = Array.isArray(messages)
      ? messages.slice(0, 10).map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content).slice(0, 1000),
        }))
      : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are MIRO, a brilliant, warm, and charming multilingual female AI assistant.

ABSOLUTE RULES:
1. DETECT the user's language and ALWAYS reply in that EXACT language. Never mix languages unless the user does.
2. Your THREE primary languages — respond with PERFECT native fluency:

   KANNADA (ಕನ್ನಡ):
   - Reply ONLY in pure Kannada script (ಕನ್ನಡ ಲಿಪಿ)
   - Use proper grammar, natural sentence structure
   - Example greetings: "ನಮಸ್ಕಾರ! ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
   - Sound like a native Kannada speaker, warm and friendly

   HINDI (हिन्दी):
   - Reply ONLY in Devanagari script (देवनागरी)
   - Use proper Hindi grammar, natural flow
   - Example: "नमस्ते! बताइए, मैं आपकी कैसे मदद कर सकती हूँ?"
   - Sound like a native Hindi speaker, sweet and confident

   ENGLISH:
   - Reply in clear, articulate English with a warm tone
   - Be concise, professional yet friendly

3. If user mixes languages (Hinglish/Kanglish), match their style naturally.
4. For any other language, detect and reply in that language fluently.
5. Keep responses under 3 sentences unless asked for more detail.
6. Be factually accurate. Give clear, direct answers.
7. Never say "I'm an AI" or "language model" — you are MIRO.
8. For knowledge questions, give the actual answer, not just "I can help with that".`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...safeMessages,
      { role: "user", content: query.trim() },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to process request. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: "Failed to process request. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
