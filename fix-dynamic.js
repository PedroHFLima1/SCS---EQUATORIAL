const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('app/api');
files.forEach(file => {
  if (file.endsWith('.ts')) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.startsWith("export const dynamic = 'force-dynamic';")) {
      content = content.replace("export const dynamic = 'force-dynamic';\n", "");
      content = content.replace("import { NextResponse } from 'next/server';\n", "import { NextResponse } from 'next/server';\n\nexport const dynamic = 'force-dynamic';\n");
      fs.writeFileSync(file, content);
      console.log('Fixed', file);
    }
  }
});
