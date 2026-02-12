const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'quizData2.js');
const rawContent = fs.readFileSync(filePath, 'utf8');

// Extract the JS object string
const match = rawContent.match(/RAW_QUIZ_DATA_2\s*=\s*(\{[\s\S]*?\});/);

if (!match) {
    console.error("Could not find RAW_QUIZ_DATA_2 object.");
    process.exit(1);
}

const data = eval('(' + match[1] + ')');

// Mapping Logic
function getNewCategory(oldCat) {
    if (!oldCat) return "Sin Categoría";
    const c = oldCat.trim();

    // 1. Pedagogía y Didáctica (Priority to clear pedagogical topics first)
    // Specific exclusions first
    if (c.match(/Evaluación|Retroalimentación/i)) return "Evaluación";
    if (c.match(/Inclusión|NEE|EIB|Diversidad/i)) return "Inclusión y Diversidad";
    if (c.match(/Normativo|Legislación|Decreto|Ley|Manual/i)) return "Marco Normativo y Gestión";
    if (c.match(/Gestión|Rectoría|PEI/i)) return "Marco Normativo y Gestión";
    if (c.match(/Convivencia|Restaurativas/i)) return "Marco Normativo y Gestión"; // Convivencia often goes with Normativo/Gestión in this context

    // Core Pedagogical
    if (c.match(/Pedagogía|Didáctica|Aprendizaje|Enseñanza|Metodología|Planificación|Curriculum|Aula|Motivación|Metacognición|TIC|Ética/i)) return "Pedagogía y Didáctica";
    if (c.startsWith("Pedagógica -")) return "Pedagogía y Didáctica"; // Catch-all for "Pedagógica - *"

    // 5. Habilidades Transversales
    if (c.match(/Habilidades|Aptitud|Razonamiento|Psicotécnica|Liderazgo|Orientación|Trabajo en Equipo|Comprensión/i)) return "Habilidades Transversales";

    // Fallback for tricky ones
    if (c.match(/Situacional/i)) return "Marco Normativo y Gestión"; // "Situacional - Rectoría", "Situacional - Convivencia"

    return "Pedagogía y Didáctica"; // Default safe
}

// Transform
let changedCount = 0;
data.questions.forEach(q => {
    const newCat = getNewCategory(q.category);
    if (q.category !== newCat) {
        // console.log(`Changing "${q.category}" -> "${newCat}"`);
        q.category = newCat;
        changedCount++;
    }
});

console.log(`Updated ${changedCount} categories.`);

// Reconstruct file content
const newContent = `const RAW_QUIZ_DATA_2 = ${JSON.stringify(data, null, 4)};

// Metadata for export
if (typeof module !== 'undefined') {
    module.exports = RAW_QUIZ_DATA_2;
}`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log("File saved.");
