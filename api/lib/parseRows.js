function parseDelimitedLine(line, sep) {
  if (sep !== ",") return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { cells.push(current.trim().replace(/^"|"$/g, "")); current = ""; continue; }
    current += ch;
  }
  cells.push(current.trim().replace(/^"|"$/g, ""));
  return cells;
}
function detectSeparator(headerLine) {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(",")) return ",";
  return /\s{2,}/.test(headerLine) ? /\s{2,}/ : null;
}
function parseRows(raw) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("Need a header row plus at least one device row.");
  const sep = detectSeparator(lines[0]);
  if (!sep) throw new Error("Use tab-separated paste from Excel/Sheets, or commas between columns.");
  const cut = (line) => parseDelimitedLine(line, sep);
  const headers = cut(lines[0]).map((h) => h.toLowerCase().trim()).filter(Boolean);
  const required = ["category", "brand", "model"];
  const missing = required.filter((k) => !headers.includes(k));
  if (missing.length) throw new Error(`Header row is missing: ${missing.join(", ")}.`);
  return lines.slice(1).map((line, i) => {
    const cells = cut(line);
    const obj = { id: `imp${i}` };
    headers.forEach((h, j) => { obj[h] = cells[j] !== undefined ? cells[j] : ""; });
    return obj;
  });
}
module.exports = { parseRows };