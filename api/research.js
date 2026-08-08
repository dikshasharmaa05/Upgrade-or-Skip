const { getInventory, recordExtract, recordTransform } = require("./lib/store");
const { buildDemoResult } = require("./lib/demo");
const { findBestInventoryMatch, inferProductStub } = require("./lib/match");

const SYSTEM_PROMPT = `You are the enrichment engine in an ETL pipeline. The user has an INVENTORY of devices they already own (JSON, each with an "id"). They type a NEW product they are considering.

Your job:
1. Identify the new product category, then pick the SINGLE inventory item in the same (or closest) category. Use its exact "id" as matchedId.
2. Research the new product real-world specs (use web search when available) and express them using EXACTLY the same keys as the matched item (excluding "id").
3. Compare spec by spec from the users point of view.

Return ONLY a JSON object (no markdown, no code fences):
{
  "matchedId": "<inventory id or null if nothing comparable>",
  "product": { <same keys as matched item, excluding id> },
  "comparison": [ { "spec": "<label>", "old": "<value you own>", "new": "<new value>", "mark": "better|worse|same|na" } ],
  "verdict": "upgrade|skip|tossup",
  "reason": "<one sentence, max 22 words>",
  "note": "<if matchedId is null: friendly sentence; otherwise empty>"
}

Rules:
- matchedId MUST be one of the inventory ids, or null.
- If matchedId is null: product {}, comparison [], fill note.
- mark is from users perspective. Cheaper price = better.
- 4-6 comparison rows. Short values, same units as matched item.`;

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString("utf8")); } catch (_) { return {}; } }
  return req.body;
}

function extractText(data) {
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  try {
    const body = readBody(req);
    const query = String(body.query || "").trim();
    if (!query) return res.status(400).json({ success: false, message: "Enter a product name to research." });

    const inventory = getInventory();
    if (!inventory.length) return res.status(400).json({ success: false, message: "Warehouse is empty. Load inventory first." });

    recordExtract(query);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let parsed;
    let demoMode = false;

    if (!apiKey) {
      parsed = buildDemoResult(inventory, query);
      demoMode = true;
    } else {
      const userPrompt = `My inventory (things I already own):\n${JSON.stringify(inventory, null, 2)}\n\nNew product I am considering: "${query}"\n\nResearch real specs online if needed. Return only JSON.`;
      const payload = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: userPrompt }],
      };
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ success: false, message: data?.error?.message || "Research request failed." });
      }
      const raw = extractText(data);
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (!parsed.matchedId) {
        const fallback = findBestInventoryMatch(inventory, query);
        if (fallback) parsed.matchedId = fallback.id;
      }
    }

    recordTransform(query);
    let ref = inventory.find((item) => item.id === parsed.matchedId) || null;
    if (!ref) ref = findBestInventoryMatch(inventory, query);
    const suggestedProduct = parsed.suggestedProduct || (!ref ? inferProductStub(query) : null);

    return res.status(200).json({
      success: true,
      query,
      ref,
      ...parsed,
      matchedId: ref ? ref.id : parsed.matchedId,
      suggestedProduct,
      canLoad: !ref,
      pipeline: {
        usedWarehouseRead: true,
        demoMode,
        note: demoMode
          ? "Live research needs ANTHROPIC_API_KEY on Vercel. Showing demo comparison for now."
          : "LLM researched online specs. Inventory was READ from warehouse — spreadsheet not reopened.",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "The pipeline could not complete this comparison." });
  }
};