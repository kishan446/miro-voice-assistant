const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { topic, slideCount = 8, theme = "modern-dark" } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0 || topic.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid topic" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a presentation design expert. Generate a JSON array of slides for a presentation.

RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanation.
2. Each slide is an object with these fields:
   - "type": one of "title", "content", "two-column", "image-text", "bullet-list", "quote", "stats", "closing"
   - "title": string (slide heading)
   - "subtitle": string (optional, for title/closing slides)
   - "content": string (main text content, use \\n for line breaks)
   - "bullets": string[] (for bullet-list type)
   - "leftContent": string (for two-column type)
   - "rightContent": string (for two-column type)
   - "quote": string (for quote type)
   - "quoteAuthor": string (for quote type)
   - "stats": { "label": string, "value": string }[] (for stats type, max 4)
   - "notes": string (presenter notes)
   - "imageQuery": string (a search query for an unsplash image that fits this slide)
3. Generate exactly ${Math.min(Math.max(slideCount, 3), 15)} slides.
4. First slide must be type "title". Last slide must be type "closing".
5. Mix slide types for visual variety.
6. Content should be professional, insightful, and well-structured.
7. Keep bullet points concise (max 6 per slide).
8. Stats should have impressive, realistic numbers.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a presentation about: ${topic.trim()}` },
        ],
        max_tokens: 6000,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      await aiResponse.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Failed to generate" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";

    // Clean up markdown fences
    content = content.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let slides;
    try {
      slides = JSON.parse(content);
      if (!Array.isArray(slides)) throw new Error("Not an array");
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse slides" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ slides }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("PPT gen error:", e);
    return new Response(JSON.stringify({ error: "Failed to generate presentation" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
