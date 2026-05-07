const fs = require('fs');
let content = fs.readFileSync('components/TriagemTable.tsx', 'utf8');
content = content.replace(/<MessageSquarePlus className="w-3 h-3" \/>/g, '<Plus className="w-3 h-3" />');
content = content.replace(/<MessageSquarePlus className="h-5 w-5/g, '<MessageSquare className="h-5 w-5');
fs.writeFileSync('components/TriagemTable.tsx', content);
