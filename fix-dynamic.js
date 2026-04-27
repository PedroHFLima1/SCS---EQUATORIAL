const fs = require('fs');
const glob = require('glob'); // Note: we can just use pure js for finding files or child_process
const path = require('path');
const execSync = require('child_process').execSync;

const files = execSync('find app/api -name "route.ts"').toString().trim().split('\n');
files.forEach(f => {
  if (f) {
    const content = fs.readFileSync(f, 'utf8');
    if (!content.includes("export const dynamic = 'force-dynamic';")) {
       fs.writeFileSync(f, "export const dynamic = 'force-dynamic';\n" + content);
    }
  }
});
