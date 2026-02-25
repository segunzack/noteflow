// api/news.js — Vercel serverless function
// Calls Claude with web_search tool to fetch live Nigeria macro news
// Returns: { items: [{ headline, summary }] }

export default async function handler(req, res) {
  // CORS — allow requests from your Vercel deployment and localhost
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  try {
    // ── Step 1: Ask Claude to search for today's Nigeria macro news ──
    const searchResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          }
        ],
        messages: [
          {
            role: "user",
            content: `Today is ${today}. Search the web for the latest Nigeria macroeconomic news from today or the past 48 hours. Focus on: CBN policy and interest rates, naira exchange rate, inflation data, oil production (NNPC), GDP forecasts, government bonds, FDI, and Nigerian capital markets. Use sources like BusinessDay Nigeria, Nairametrics, Reuters Africa, Bloomberg Africa, and The Punch.

After searching, respond with ONLY a valid JSON array of exactly 5 objects. Each object must have:
- "headline": a specific, factual headline (max 12 words)
- "summary": one sentence of factual context with numbers where available (max 25 words)

No preamble, no markdown, no explanation. Return only the raw JSON array.`
          }
        ]
      })
    });

    if (!searchResponse.ok) {
      const err = await searchResponse.text();
      console.error("Claude API error:", searchResponse.status, err);
      res.status(502).json({ error: "Claude API request failed", detail: err });
      return;
    }

    const data = await searchResponse.json();

    // ── Step 2: Extract the text content from Claude's response ──
    // Claude may return a mix of tool_use, tool_result, and text blocks
    let textContent = "";
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "text") {
          textContent += block.text;
        }
      }
    }

    // ── Step 3: Parse the JSON array from the response ──
    const match = textContent.match(/\[[\s\S]*?\]/);
    if (!match) {
      console.error("No JSON array found in response:", textContent);
      res.status(502).json({ error: "Could not parse news from Claude response", raw: textContent });
      return;
    }

    let items;
    try {
      items = JSON.parse(match[0]);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, match[0]);
      res.status(502).json({ error: "JSON parse failed", raw: match[0] });
      return;
    }

    // Validate shape
    if (!Array.isArray(items) || items.length === 0) {
      res.status(502).json({ error: "Invalid items array", raw: textContent });
      return;
    }

    // Normalise — ensure each item has headline and summary
    const normalised = items.slice(0, 5).map(item => ({
      headline: item.headline || item.title || item.h || "Nigeria Market Update",
      summary:  item.summary || item.body || item.s  || "See full story for details.",
    }));

    // Cache hint — tell the CDN/browser to cache for 1 hour
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=1800");
    res.status(200).json({ items: normalised, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error("Unhandled error in /api/news:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
