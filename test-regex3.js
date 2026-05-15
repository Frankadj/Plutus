const fs = require('fs');
const text = fs.readFileSync('/tmp/gse_chart.js', 'utf8');
const regex = /\{name:'(GSE-(?:CI|FSI))',tooltip:\{[^}]*\},data:\[(.*?)\]\}/gs;
let match;
while ((match = regex.exec(text)) !== null) {
  console.log("Matched!", match[1], "length of data:", match[2].length);
}
console.log("Done");
