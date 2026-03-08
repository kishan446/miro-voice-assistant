import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SEARCH_API_KEY = Deno.env.get("SEARCH_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Check if query needs real-time search
    let searchContext = "";
    const needsSearch = /news|weather|latest|current|today|stock|price|score|who is|what happened|how much|trending/i.test(query);

    if (needsSearch && SEARCH_API_KEY) {
      try {
        const searchRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SEARCH_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query, num: 5 }),
        });
        const searchData = await searchRes.json();
        const results = searchData.organic?.slice(0, 5) || [];
        if (results.length > 0) {
          searchContext = "\n\nHere are recent search results for context:\n" +
            results.map((r: any, i: number) => `${i + 1}. ${r.title}: ${r.snippet}`).join("\n");
        }
      } catch (e) {
        console.error("Search error:", e);
      }
    }

    const systemPrompt = `You are MIRO, an advanced AI assistant with a futuristic, confident personality inspired by JARVIS from Iron Man. You are helpful, concise, and slightly witty. You speak with authority and sophistication. Keep responses under 3 sentences unless the user asks for detail. When greeting, say something like "At your service" or "Online and ready". Never say you are an AI language model — you are MIRO.${searchContext}`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: query },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
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
