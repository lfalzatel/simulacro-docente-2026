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

    // 1. Evaluación y Retroalimentación
    if (c.match(/Evaluación|Retroalimentación/i)) return "Evaluación y Retroalimentación";

    // 2. Estrategias Pedagógicas
    if (c.match(/Didáctica|Pedagógica|Aprendizaje|Metodología|Enseñanza|Aula|Motivación|Metacognición|TIC|Ética/i) && !c.match(/Inclusión|NEE|EIB|Planificación|Gestión/i)) return "Estrategias Pedagógicas";

    // 3. Inclusión y Diversidad
    if (c.match(/Inclusión|NEE|EIB|Diversidad|Diferenciación/i)) return "Inclusión y Diversidad";

    // 4. Convivencia y Valores
    if (c.match(/Convivencia|Restaurativas|Valores|Ciudadanía|Ambiente de Aula/i)) return "Convivencia y Valores";

    // 5. Marco Legal y Normativo
    if (c.match(/Normativo|Legislación|Decreto|Ley|Manual/i)) return "Marco Legal y Normativo";

    // 6. Gestión Institucional
    if (c.match(/Gestión|Rectoría|PEI|Liderazgo/i)) return "Gestión Institucional";

    // 7. Planificación Curricular
    if (c.match(/Planificación|Curriculum|Curricular/i)) return "Planificación Curricular";

    // 8. Razonamiento Lógico (Math/Abstract)
    if (c.match(/Razonamiento|Cuantitativo|Lógico|Matemático|Abstracto/i)) return "Razonamiento Lógico";

    // 9. Competencias Específicas (Subject Knowledge / Verbal / General Skills)
    if (c.match(/Aptitud Verbal|Comprensión|Sinónimos|Antónimos|Analogías|Oraciones|Ordenamiento/i)) return "Competencias Específicas";

    // 10. Desarrollo Cognitivo (Psychotech / Soft Skills)
    if (c.match(/Psicotécnica|Orientación|Trabajo en Equipo|Habilidades/i)) return "Desarrollo Cognitivo";

    // Fallbacks
    if (c.match(/Situacional/i)) return "Gestión Institucional"; // Often situational leadership/management

    return "Estrategias Pedagógicas"; // Default safe
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
