const { findBestInventoryMatch, inferProductStub } = require("./match");
const { lookupProduct, buildProductForRef, buildComparison, verdictFromComparison, reasonFromVerdict } = require("./catalog");

function buildFreeResearch(inventory, query) {
  const ref = findBestInventoryMatch(inventory, query);
  if (!ref) {
    const suggestedProduct = inferProductStub(query);
    return {
      matchedId: null,
      product: {},
      suggestedProduct,
      comparison: [],
      verdict: "skip",
      reason: "",
      note: `No ${suggestedProduct.category} in your warehouse yet. Add one below to compare next time.`,
      canLoad: true,
    };
  }

  const hit = lookupProduct(query);
  const product = buildProductForRef(ref, query, hit);
  const comparison = buildComparison(ref, product);
  const verdict = verdictFromComparison(comparison);

  return {
    matchedId: ref.id,
    product,
    comparison,
    verdict,
    reason: reasonFromVerdict(verdict, hit ? hit.model : query, ref),
    note: "",
    source: hit ? "catalog" : "inferred",
  };
}

module.exports = { buildFreeResearch };