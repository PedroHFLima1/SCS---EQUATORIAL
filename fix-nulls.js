const fs = require('fs');
let file = fs.readFileSync('components/DrillDownTable.tsx', 'utf8');

file = file.replace(/value=\{protocolForm\.([\w]+)\}/g, "value={protocolForm.$1 || ''}");

fs.writeFileSync('components/DrillDownTable.tsx', file);
