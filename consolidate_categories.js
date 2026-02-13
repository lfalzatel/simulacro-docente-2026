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
    if (!oldCat) return "Estrategias Pedagógicas"; // Default for nulls
    const c = oldCat.trim();

    // 1. Evaluación y Retroalimentación
    if (c.match(/Evaluación|Retroalimentación/i)) return "Evaluación y Retroalimentación";

    // 2. Inclusión y Diversidad
    if (c.match(/Inclusión|NEE|EIB|Diversidad|Diferenciación|Equidad|Acceso/i)) return "Inclusión y Diversidad";

    // 3. Convivencia y Valores
    if (c.match(/Convivencia|Restaurativas|Valores|Ciudadanía|Ambiente de Aula|Democracia|Paz/i)) return "Convivencia y Valores";

    // 4. Marco Legal y Normativo
    if (c.match(/Normativo|Legislación|Decreto|Ley|Manual|Estatuto|Constitu/i)) return "Marco Legal y Normativo";

    // 5. Gestión Institucional
    if (c.match(/Gestión|Rectoría|PEI|Liderazgo|Organización|Administrativa|Situacional/i)) return "Gestión Institucional";

    // 6. Planificación Curricular
    if (c.match(/Planificación|Curriculum|Curricular|Diseño|Secuencia/i)) return "Planificación Curricular";

    // 7. Razonamiento Lógico
    if (c.match(/Razonamiento|Cuantitativo|Lógico|Matemático|Abstracto|Números|Series/i)) return "Razonamiento Lógico";

    // 8. Competencias Específicas
    if (c.match(/Aptitud Verbal|Comprensión|Saber|Disciplina|Contenido|Científica|Sociales|Lenguaje/i)) return "Competencias Específicas";

    // 9. Desarrollo Cognitivo
    if (c.match(/Psicotécnica|Orientación|Soft Skills|Socioemocional|Neuro|Cognitivo|Habilidades/i)) return "Desarrollo Cognitivo";

    // 10. Estrategias Pedagógicas (The broad bucket)
    // Default for everything else pedagogy related
    return "Estrategias Pedagógicas";
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
// Use window.RAW_QUIZ_DATA_2 if strictly browser, or just const. 
// But safely:
const newContent = `const RAW_QUIZ_DATA_2 = ${JSON.stringify(data, null, 4)};

// Metadata for export (Node.js)
if (typeof module !== 'undefined') {
    module.exports = RAW_QUIZ_DATA_2;
}

// Metadata for browser global (if needed explicitly, though const in global scope works)
if (typeof window !== 'undefined') {
    window.RAW_QUIZ_DATA_2 = RAW_QUIZ_DATA_2;
}
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log("File saved.");
