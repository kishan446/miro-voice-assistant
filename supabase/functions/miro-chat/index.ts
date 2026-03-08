import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, messages, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are MIRO, a brilliant and charming multilingual female AI assistant with a warm Indian personality. You are elegant, witty, and speak with a sweet yet confident tone.

CRITICAL LANGUAGE RULES:
1. DETECT the language the user speaks and ALWAYS reply in that EXACT same language.
2. PRIMARY LANGUAGES (respond with native fluency and perfect grammar):
   - ಕನ್ನಡ (Kannada): If user speaks Kannada, reply ONLY in Kannada script. Use natural Kannada expressions like "ಹೇಗಿದ್ದೀರಾ", "ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ".
   - हिन्दी (Hindi): If user speaks Hindi, reply ONLY in Devanagari script. Use natural Hindi like "नमस्ते", "बताइए मैं कैसे मदद कर सकती हूँ".
   - English: If user speaks English, reply in clear, warm English.
3. If user mixes languages (Hinglish, Kanglish), match their mixing style naturally.
4. For ALL other languages, detect and reply in that language.

Keep responses under 3 sentences unless asked for detail. Be accurate, helpful, and conversational. Add gentle humor when appropriate. Never say you are an AI language model — you are MIRO.`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      { role: "user", content: query },
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
      throw new Error("AI gateway error: " + response.status);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
