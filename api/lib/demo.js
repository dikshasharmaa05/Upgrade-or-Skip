const { findBestInventoryMatch, inferProductStub } = require("./match");

function demoComparison(ref, query) {
  const keys = Object.keys(ref).filter((k) => k !== "id" && k !== "category");
  const comparison = keys.slice(0, 6).map((key, index) => {
    const oldVal = String(ref[key] || "n/a");
    let mark = "same";
    let newVal = oldVal;
    if (key === "price") { newVal = "Rs 89,999"; mark = "worse"; }
    else if (key === "releaseYear") { newVal = String(Number(ref.releaseYear || 2020) + 2); mark = "better"; }
    else if (/battery|ram|storage|speed|display/i.test(key)) { newVal = oldVal + " (upgraded)"; mark = "better"; }
    else if (index % 4 === 3) { mark = "worse"; newVal = oldVal + " (older gen)"; }
    return { spec: key, old: oldVal, new: newVal, mark };
  });
  const better = comparison.filter((r) => r.mark === "better").length;
  const worse = comparison.filter((r) => r.mark === "worse").length;
  let verdict = "tossup";
  if (better > worse) verdict = "upgrade";
  if (worse > better) verdict = "skip";
  const product = { ...ref };
  delete product.id;
  const parts = query.split(/\s+/);
  product.brand = parts[0] || "New";
  product.model = query;
  comparison.forEach((row) => { if (row.spec in product) product[row.spec] = row.new; });
  return { matchedId: ref.id, product, comparison, verdict, reason: "Demo comparison — add ANTHROPIC_API_KEY on Vercel for live online research.", note: "", demoMode: true };
}

function buildDemoResult(inventory, query) {
  const ref = findBestInventoryMatch(inventory, query);
  if (!ref) {
    const suggestedProduct = inferProductStub(query);
    return { matchedId: null, product: {}, suggestedProduct, comparison: [], verdict: "skip", reason: "", note: `No ${suggestedProduct.category} in your warehouse yet. Load one first, or add this product below.`, demoMode: true, canLoad: true };
  }
  return demoComparison(ref, query);
}

module.exports = { buildDemoResult };