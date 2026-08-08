function normalizeCategory(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const CATEGORY_RULES = [
  { key: "laptop", words: ["laptop", "macbook", "mac book", "thinkpad", "xps", "notebook", "ultrabook", "chromebook"] },
  { key: "wireless earbuds", words: ["earbud", "airpod", "headphone", "buds", "tws", "airpods"] },
  { key: "smartwatch", words: ["watch", "fitbit", "garmin", "amazfit", "smartwatch"] },
  { key: "bluetooth speaker", words: ["speaker", "soundbar", "jbl", "bose"] },
  { key: "power bank", words: ["power bank", "charger", "anker", "mah"] },
  { key: "wi-fi router", words: ["router", "wifi", "mesh", "tp-link"] },
  { key: "phone", words: ["iphone", "phone", "pixel", "galaxy", "oneplus"] },
  { key: "tablet", words: ["ipad", "tablet", "tab s"] },
];

function inferQueryCategory(query) {
  const q = String(query || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((word) => q.includes(word))) return rule.key;
  }
  return "";
}

function categoriesAlign(itemCategory, queryCategory) {
  const a = normalizeCategory(itemCategory);
  const b = normalizeCategory(queryCategory);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function findBestInventoryMatch(inventory, query) {
  const inferred = inferQueryCategory(query);
  if (inferred) {
    const hit = inventory.find((item) => categoriesAlign(item.category, inferred));
    if (hit) return hit;
  }
  const q = String(query || "").toLowerCase();
  return inventory.find((item) => {
    const blob = `${item.category} ${item.brand} ${item.model}`.toLowerCase();
    return inferred ? categoriesAlign(item.category, inferred) : blob.split(" ").some((w) => w.length > 3 && q.includes(w));
  }) || null;
}

function inferProductStub(query) {
  const q = String(query || "").trim();
  const inferred = inferQueryCategory(q);
  let category = inferred ? inferred.replace(/\b\w/g, (c) => c.toUpperCase()) : "Device";
  if (category === "Wi-fi router") category = "Wi-Fi Router";
  if (category === "Wireless earbuds") category = "Wireless Earbuds";
  if (category === "Bluetooth speaker") category = "Bluetooth Speaker";
  if (category === "Power bank") category = "Power Bank";
  if (category === "Laptop") category = "Laptop";
  let brand = q.split(/\s+/)[0] || "Unknown";
  if (/macbook|mac book/i.test(q)) brand = "Apple";
  if (/iphone|ipad/i.test(q)) brand = "Apple";
  return { category, brand, model: q, price: "", releaseYear: String(new Date().getFullYear()) };
}

module.exports = { findBestInventoryMatch, inferProductStub, inferQueryCategory };