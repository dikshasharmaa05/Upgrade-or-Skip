const { getInventory, recordExtract, recordTransform } = require("./lib/store");
const { buildDemoResult } = require("./lib/demo");

const SYSTEM_PROMPT = `You are the enrichment engine in an ETL pipeline. The user has an INVENTORY of devices they already own (JSON, each with an "id"). They will type the NAME of a new product they are considering. Pick the single best inventory match, research the new product, compare spec by spec, and return ONLY JSON with keys matchedId, product, comparison, verdict, reason, note.`;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const query = String(body.query || "").trim();
    if (!query) return res.status(400).json({ success: false, message: "Enter a product name to research." });

    const inventory = getInventory();
    if (!inventory.length) return res.status(400).json({ success: false, message: "Warehouse is empty. Load inventory first." });

    recordExtract(query);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    let parsed;

    if (!apiKey) {
      parsed = buildDemoResult(inventory, query);
    } else {
      const userPrompt = `My inventory:\n${JSON.stringify(inventory, null, 2)}\n\nNew product: "${query}"\n\nReturn only JSON.`;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ success: false, message: data?.error?.message || "Research request failed." });
      }
      const raw = (data.content || []).filter((block) => block.type === "text").map((block) => block.text).join("").trim();
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    }

    recordTransform(query);
    const ref = inventory.find((item) => item.id === parsed.matchedId) || null;

    return res.status(200).json({
      success: true,
      query,
      ref,
      ...parsed,
      pipeline: {
        usedWarehouseRead: true,
        demoMode: Boolean(parsed.demoMode),
        note: parsed.demoMode
          ? "Workshop demo mode: warehouse READ worked. Add ANTHROPIC_API_KEY on Vercel for live research."
          : "Inventory was READ from the warehouse. Your spreadsheet was not opened again.",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "The pipeline could not complete this comparison." });
  }
};