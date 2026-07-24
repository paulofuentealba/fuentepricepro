const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
  });
  return results;
}

const files = walk('./src');
let c = 0;
files.forEach(f => {
  let t = fs.readFileSync(f, 'utf8');
  if (t.includes('.replace(/\\.SA$/i, "")')) {
    t = t.replaceAll('.replace(/\\.SA$/i, "")', '');
    fs.writeFileSync(f, t);
    c++;
  }
});
console.log('Modified files:', c);
