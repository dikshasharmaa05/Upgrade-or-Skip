const { loadInventory } = require("./lib/store");
const { parseRows } = require("./lib/parseRows");

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (_) { return { raw: req.body }; }
  }
  if (Buffer.isBuffer(req.body)) {
    try { return JSON.parse(req.body.toString("utf8")); } catch (_) { return { raw: req.body.toString("utf8") }; }
  }
  return req.body;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  try {
    const body = readBody(req);
    const raw = String(body.raw || "").trim();
    if (!raw) {
      return res.status(400).json({
        success: false,
        message: "Paste your spreadsheet rows first, then click Load inventory.",
      });
    }

    const rows = parseRows(raw);
    const items = loadInventory(rows, body.source || "spreadsheet paste");

    return res.status(200).json({
      success: true,
      items,
      loaded: rows.length,
      message: `LOAD complete - ${rows.length} device(s) stored in the warehouse. Future comparisons will READ this data, not re-parse your sheet.`,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Could not load inventory." });
  }
};