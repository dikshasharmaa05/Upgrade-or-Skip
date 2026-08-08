const { getInventory, recordExtract, recordTransform } = require("./lib/store");
const { buildFreeResearch } = require("./lib/researchEngine");
const { findBestInventoryMatch, inferProductStub } = require("./lib/match");

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString("utf8")); } catch (_) { return {}; } }
  return req.body;
}

async function tryGemini(inventory, query, apiKey) {
  const prompt = `Inventory JSON:\n${JSON.stringify(inventory)}\n\nNew product: "${query}"\nReturn ONLY JSON with matchedId, product, comparison (array of spec/old/new/mark), verdict, reason, note.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed");
  const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
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

    const inventory = Array.isArray(body.inventory) && body.inventory.length ? body.inventory : getInventory();
    if (!inventory.length) return res.status(400).json({ success: false, message: "Warehouse is empty. Load inventory first." });

    recordExtract(query);

    let parsed;
    let engine = "free";
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        parsed = await tryGemini(inventory, query, geminiKey);
        engine = "gemini";
      } catch (_) {
        parsed = buildFreeResearch(inventory, query);
      }
    } else {
      parsed = buildFreeResearch(inventory, query);
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
        engine,
        note: engine === "gemini"
          ? "Researched with free Gemini API. Inventory READ from warehouse."
          : "Free built-in spec lookup (no paid API). Inventory READ from warehouse.",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "The pipeline could not complete this comparison." });
  }
};