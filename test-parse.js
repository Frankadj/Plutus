const fs = require('fs');

function normalizeGseIndexCode(raw) {
  const code = String(raw || "").toUpperCase().trim();
  if (code.includes("FSI")) return "GSE-FSI";
  if (code.includes("CI")) return "GSE-CI";
  return code;
}

function parseGseIndexChartSeries(scriptText) {
  const seriesPattern =
    /\{name:'(GSE-(?:CI|FSI))',tooltip:\{[^}]*\},data:\[(.*?)\]\}/gs;
  const pointPattern =
    /\[d\("(\d{4}-\d{2}-\d{2})"\),\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\]/g;
  const historyByCode = {};
  let seriesMatch;

  while ((seriesMatch = seriesPattern.exec(String(scriptText || ""))) !== null) {
    const code = normalizeGseIndexCode(seriesMatch[1]);
    const dataBlock = String(seriesMatch[2] || "");
    const rows = [];
    const seenDates = new Set();
    let pointMatch;

    pointPattern.lastIndex = 0;

    while ((pointMatch = pointPattern.exec(dataBlock)) !== null) {
      const date = String(pointMatch[1] || "");
      const value = Number(pointMatch[2]);

      if (!date || !Number.isFinite(value) || seenDates.has(date)) {
        continue;
      }

      seenDates.add(date);
      rows.push({
        date,
        value,
        change: 0,
        changePercent: 0,
        volume: 0,
        source: "KwayisiChart",
      });
    }

    rows.sort((left, right) => left.date.localeCompare(right.date));

    if (rows.length > 0) {
      historyByCode[code] = rows;
    }
  }

  return historyByCode;
}

const text = fs.readFileSync('/tmp/gse_chart.js', 'utf8');
const history = parseGseIndexChartSeries(text);
console.log(Object.keys(history));
