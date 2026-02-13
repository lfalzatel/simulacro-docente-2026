const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/lfalz/OneDrive - Secretaria de Educación de Rionegro/7. Escritorio/4. Documentos Luis Fernando/Nuevo concurso docente 2026/quizData2.js';
const content = fs.readFileSync(filePath, 'utf8');

const counts = {};
const matches = content.matchAll(/"category":\s*"(.*?)"/g);
for (const m of matches) {
    counts[m[1]] = (counts[m[1]] || 0) + 1;
}

// Also check for nulls
const nulls = content.match(/"category":\s*null/g);
if (nulls) counts['null'] = nulls.length;

console.log(JSON.stringify(counts, null, 2));
