const { appendItem } = require("./lib/store");

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  if (Buffer.isBuffer(req.body)) {
    try { return JSON.parse(req.body.toString("utf8")); } catch (_) { return {}; }
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
    const { ref, product = {}, query } = body;

    if (!product.category && !product.brand && !product.model && !ref) {
      return res.status(400).json({ success: false, message: "Missing product details to load." });
    }

    const item = ref
      ? { id: `buy${Date.now()}`, ...ref, ...product, model: product.model || query }
      : {
          id: `buy${Date.now()}`,
          category: product.category || "Device",
          brand: product.brand || String(query || "Unknown").split(/\s+/)[0],
          model: product.model || query || "Item",
          price: product.price || "",
          releaseYear: product.releaseYear || String(new Date().getFullYear()),
          ...product,
        };

    appendItem(item);
    return res.status(200).json({ success: true, item, message: "Product loaded to warehouse inventory." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Could not load purchase." });
  }
};