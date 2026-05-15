const fs = require('fs');
const text = fs.readFileSync('/tmp/gse_chart.js', 'utf8');
const match = text.match(/\{name:'GSE-CI'.{0,150}/);
console.log(match ? match[0] : 'no match');
