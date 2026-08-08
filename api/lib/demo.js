function inferProductStub(query) {
  const q = String(query || "").trim();
  const lower = q.toLowerCase();
  let category = "Device";
  let brand = q.split(/\s+/)[0] || "Unknown";
  let model = q;

  if (/macbook|mac book|laptop|thinkpad|xps/i.test(lower)) {
    category = "Laptop";
    brand = /macbook|mac book/i.test(lower) ? "Apple" : brand;
  } else if (/ipad|tablet|tab s/i.test(lower)) {
    category = "Tablet";
    brand = /ipad/i.test(lower) ? "Apple" : brand;
  } else if (/iphone|phone|pixel|galaxy|oneplus/i.test(lower)) {
    category = "Phone";
    brand = /iphone/i.test(lower) ? "Apple" : brand;
  } else if (/earbud|airpod|headphone/i.test(lower)) {
    category = "Wireless Earbuds";
  } else if (/watch|fitbit|garmin/i.test(lower)) {
    category = "Smartwatch";
  } else if (/speaker|soundbar/i.test(lower)) {
    category = "Bluetooth Speaker";
  }

  return { category, brand, model, price: "", releaseYear: String(new Date().getFullYear()) };
}

function pickMatch(inventory, query) {
  const q = query.toLowerCase();
  const rules = [
    { id: "ear", words: ["earbud", "airpod", "headphone", "buds", "sony wf", "boat"] },
    { id: "watch", words: ["watch", "fitbit", "garmin", "amazfit", "smartwatch"] },
    { id: "spkr", words: ["speaker", "jbl", "soundbar", "bluetooth speaker"] },
    { id: "bank", words: ["power bank", "charger", "anker", "10000mah"] },
    { id: "rtr", words: ["router", "wifi", "mesh", "tp-link"] }
  ];
  for (const rule of rules) {
    if (rule.words.some((word) => q.includes(word))) {
      return inventory.find((item) => item.id === rule.id) || null;
    }
  }
  return null;
}

function demoComparison(ref, query) {
  const keys = Object.keys(ref).filter((k) => k !== "id" && k !== "category");
  const comparison = keys.slice(0, 5).map((key, index) => {
    const oldVal = String(ref[key] || "n/a");
    let mark = "same";
    let newVal = oldVal;
    if (key === "price") { newVal = "Rs 12,999"; mark = "worse"; }
    else if (key === "releaseYear") { newVal = String(Number(ref.releaseYear || 2020) + 2); mark = "better"; }
    else if (index % 3 === 0) { newVal = oldVal + " (newer)"; mark = "better"; }
    else if (index % 3 === 1) { mark = "same"; }
    else { mark = "worse"; }
    return { spec: key, old: oldVal, new: newVal, mark };
  });
  const better = comparison.filter((r) => r.mark === "better").length;
  const worse = comparison.filter((r) => r.mark === "worse").length;
  let verdict = "tossup";
  if (better > worse + 1) verdict = "upgrade";
  if (worse > better + 1) verdict = "skip";
  const product = { ...ref };
  delete product.id;
  product.brand = query.split(" ")[0] || "New";
  product.model = query;
  comparison.forEach((row) => { if (row.spec in product) product[row.spec] = row.new; });
  return { matchedId: ref.id, product, comparison, verdict, reason: "Workshop demo comparison using warehouse data already on the server.", note: "", demoMode: true };
}

function buildDemoResult(inventory, query) {
  const ref = pickMatch(inventory, query);
  if (!ref) {
    const suggestedProduct = inferProductStub(query);
    return {
      matchedId: null,
      product: {},
      suggestedProduct,
      comparison: [],
      verdict: "skip",
      reason: "",
      note: `Your warehouse has no ${suggestedProduct.category.toLowerCase()} yet. You can still LOAD "${query}" into inventory for future comparisons.`,
      demoMode: true,
      canLoad: true,
    };
  }
  return demoComparison(ref, query);
}

module.exports = { buildDemoResult, inferProductStub };