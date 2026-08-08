const CATALOG = [
  { match: ["dell xps 15", "xps 15"], category: "Laptop", brand: "Dell", model: "XPS 15", price: "Rs 1,45,000", processor: "Intel Core Ultra 7", ram: "16GB", storage: "512GB SSD", display: "15.6 inch OLED", battery: "13 hours", releaseYear: "2024" },
  { match: ["macbook air m3", "macbook air"], category: "Laptop", brand: "Apple", model: "MacBook Air M3", price: "Rs 1,14,900", processor: "Apple M3", ram: "8GB", storage: "256GB SSD", display: "13.6 inch Liquid Retina", battery: "18 hours", releaseYear: "2024" },
  { match: ["macbook pro m3", "macbook pro"], category: "Laptop", brand: "Apple", model: "MacBook Pro 14 M3", price: "Rs 1,99,900", processor: "Apple M3 Pro", ram: "18GB", storage: "512GB SSD", display: "14.2 inch Liquid Retina XDR", battery: "17 hours", releaseYear: "2024" },
  { match: ["thinkpad x1", "thinkpad"], category: "Laptop", brand: "Lenovo", model: "ThinkPad X1 Carbon", price: "Rs 1,35,000", processor: "Intel Core i7", ram: "16GB", storage: "512GB SSD", display: "14 inch IPS", battery: "12 hours", releaseYear: "2023" },
  { match: ["airpods pro", "airpods pro 2"], category: "Wireless Earbuds", brand: "Apple", model: "AirPods Pro 2", price: "Rs 24,900", battery: "6h (+30h case)", noiseCancelling: "Yes", bluetooth: "5.3", releaseYear: "2023" },
  { match: ["boat airdopes", "airdopes 141", "airdopes 300"], category: "Wireless Earbuds", brand: "boAt", model: "Airdopes 300", price: "Rs 1,999", battery: "40h total", noiseCancelling: "No", bluetooth: "5.3", releaseYear: "2024" },
  { match: ["sony wf-c700", "sony wf"], category: "Wireless Earbuds", brand: "Sony", model: "WF-C700N", price: "Rs 8,990", battery: "10h (+20h case)", noiseCancelling: "Yes", bluetooth: "5.0", releaseYear: "2023" },
  { match: ["amazfit bip", "amazfit"], category: "Smartwatch", brand: "Amazfit", model: "Bip 5", price: "Rs 7,999", display: "1.91 inch TFT", battery: "10 days", gps: "Built-in GPS", releaseYear: "2023" },
  { match: ["apple watch", "watch se"], category: "Smartwatch", brand: "Apple", model: "Watch SE", price: "Rs 24,900", display: "1.78 inch OLED", battery: "18 hours", gps: "Built-in GPS", releaseYear: "2024" },
  { match: ["jbl flip 6", "jbl flip"], category: "Bluetooth Speaker", brand: "JBL", model: "Flip 6", price: "Rs 9,999", power: "30W", battery: "12h", waterproof: "IP67", releaseYear: "2022" },
  { match: ["mi power bank", "power bank 10000"], category: "Power Bank", brand: "Mi", model: "Power Bank 3i", price: "Rs 1,199", capacity: "10000mAh", output: "18W", ports: "2 out / 1 in", releaseYear: "2023" },
  { match: ["archer ax50", "tp-link router"], category: "Wi-Fi Router", brand: "TP-Link", model: "Archer AX50", price: "Rs 4,999", speed: "3000 Mbps", bands: "Dual-band", wifi: "Wi-Fi 6", releaseYear: "2023" },
];

function lookupProduct(query) {
  const q = String(query || "").toLowerCase();
  for (const item of CATALOG) {
    if (item.match.some((m) => q.includes(m) || m.includes(q))) return { ...item };
  }
  return null;
}

function parsePrice(value) {
  const n = String(value || "").replace(/[^0-9.]/g, "");
  return n ? Number(n) : null;
}

function compareValues(key, oldVal, newVal) {
  const o = String(oldVal || "").toLowerCase();
  const n = String(newVal || "").toLowerCase();
  if (!o || !n || o === "n/a" || n === "n/a") return "na";
  if (key === "price") {
    const op = parsePrice(o); const np = parsePrice(n);
    if (op && np) return np < op ? "better" : np > op ? "worse" : "same";
  }
  if (key === "releaseYear") {
    const oy = Number(o); const ny = Number(n);
    if (oy && ny) return ny > oy ? "better" : ny < oy ? "worse" : "same";
  }
  if (/battery|ram|storage|speed|display|processor|capacity|power/i.test(key)) {
    if (n.length > o.length || /\d+/.test(n) && parseInt(n.replace(/\D/g,""),10) > parseInt(o.replace(/\D/g,""),10)) return "better";
    if (n === o) return "same";
    return "worse";
  }
  if (n === o) return "same";
  return "na";
}

function buildProductForRef(ref, query, hit) {
  const product = {};
  const keys = Object.keys(ref).filter((k) => k !== "id");
  if (hit) {
    keys.forEach((k) => { product[k] = hit[k] !== undefined ? hit[k] : ref[k]; });
    product.brand = hit.brand;
    product.model = hit.model;
    return product;
  }
  const stubBrand = query.split(/\s+/)[0] || "New";
  keys.forEach((k) => {
    if (k === "category") product[k] = ref[k];
    else if (k === "brand") product[k] = stubBrand;
    else if (k === "model") product[k] = query;
    else if (k === "price") product[k] = "Rs 12,999";
    else if (k === "releaseYear") product[k] = String(new Date().getFullYear());
    else product[k] = "Upgraded";
  });
  return product;
}

function buildComparison(ref, product) {
  const keys = Object.keys(ref).filter((k) => !["id", "category"].includes(k));
  return keys.slice(0, 6).map((key) => ({
    spec: key,
    old: String(ref[key] || "n/a"),
    new: String(product[key] || "n/a"),
    mark: compareValues(key, ref[key], product[key]),
  }));
}

function verdictFromComparison(rows) {
  const better = rows.filter((r) => r.mark === "better").length;
  const worse = rows.filter((r) => r.mark === "worse").length;
  if (better > worse + 1) return "upgrade";
  if (worse > better + 1) return "skip";
  return "tossup";
}

function reasonFromVerdict(verdict, query, ref) {
  if (verdict === "upgrade") return `${query} beats your ${ref.brand} ${ref.model} on enough specs to justify an upgrade.`;
  if (verdict === "skip") return `Stick with your ${ref.brand} ${ref.model}; the new option is not a clear win.`;
  return `Mixed bag versus your ${ref.brand} ${ref.model}; depends what you value most.`;
}

module.exports = { lookupProduct, buildProductForRef, buildComparison, verdictFromComparison, reasonFromVerdict };