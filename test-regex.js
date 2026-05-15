const fs = require('fs');
const text = fs.readFileSync('/tmp/gse_chart.js', 'utf8');
const regex = /name:'(GSE-(?:CI|FSI))'/g;
console.log(text.match(regex));
const regex2 = /\{name:'(GSE-(?:CI|FSI))'(.*?)\} \}/g;
const match = /\{name:'(GSE-(?:CI|FSI))'(.*?data:\[.*?\])\}/g.exec(text);
if(match) { console.log(match[1]); }
