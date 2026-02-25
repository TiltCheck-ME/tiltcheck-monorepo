const fs = require('fs');
const file = process.argv[2];
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/^pick 3e20154 .*/m, 'drop 3e20154');
fs.writeFileSync(file, content);
