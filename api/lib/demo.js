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
  return inventory[0] || null;
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
  if (/macbook|laptop|computer|ipad|tablet|phone/i.test(query)) {
    return { matchedId: null, product: {}, comparison: [], verdict: "skip", reason: "", note: `Your warehouse has no laptops/tablets. "${query}" cannot be matched — but the backend still READ stored inventory instead of reloading your sheet.`, demoMode: true };
  }
  const ref = pickMatch(inventory, query);
  if (!ref) {
    return { matchedId: null, product: {}, comparison: [], verdict: "skip", reason: "", note: `You do not own anything comparable to "${query}" yet.`, demoMode: true };
  }
  return demoComparison(ref, query);
}
module.exports = { buildDemoResult };