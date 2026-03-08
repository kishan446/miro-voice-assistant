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
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        max_tokens: 800,
        temperature: 0.7,
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
