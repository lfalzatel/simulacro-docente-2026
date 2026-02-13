const fs = require('fs');
const path = require('path');

const NEW_BATCH = [
    {
        "id": 121,
        "categoria": "Estrategias Pedagógicas",
        "pregunta": "El docente Leonardo busca fomentar el pensamiento crítico mediante debates. Para lograr una mayor participación activa y argumentada, ¿qué estrategia es la más pertinente?",
        "opciones": [
            "Organizar debates asignando roles específicos a cada estudiante obligatoriamente.",
            "Diseñar debates vinculados a los contenidos, proporcionando recursos y preguntas guía previas para estimular la reflexión.",
            "Implementar aprendizaje basado en problemas donde investiguen dilemas éticos.",
            "Proponer temas libres de interés general."
        ],
        "respuesta_correcta": 2,
        "explicacion": "La improvisación no garantiza pensamiento crítico. Proporcionar insumos (recursos y preguntas guía) asegura que el debate tenga fundamento teórico y profundidad argumentativa.",
        "fuente": "02 - CARTILLA DE PREGUNTAS DOCENTE PRIMARIA"
    },
    {
        "id": 122,
        "categoria": "Evaluación y Retroalimentación",
        "pregunta": "La docente Clara nota que Ana, una niña tímida, responde mejor a gestos que a palabras. Clara decide integrar técnicas de comunicación no verbal (gestos amplios, expresiones) en su clase de ciencias. Esta estrategia funcionó porque:",
        "opciones": [
            "Utilizó una planificación específica para mejorar la comprensión de todos.",
            "Integró la comunicación no verbal en todas las etapas creando una experiencia envolvente que incluyó a la estudiante.",
            "Evaluó el impacto de los gestos al final de la clase.",
            "Usó los gestos solo para reforzar a Ana."
        ],
        "respuesta_correcta": 1,
        "explicacion": "La comunicación multimodal (verbal y no verbal) enriquece el proceso de enseñanza-aprendizaje y atiende a la diversidad de estilos de recepción de información.",
        "fuente": "02 - CARTILLA DE PREGUNTAS DOCENTE PRIMARIA"
    },
    {
        "id": 123,
        "categoria": "Convivencia y Valores",
        "pregunta": "Catalina muestra desinterés y burla en clase. La docente Marta ha respondido confrontándola públicamente y ridiculizándola. La situación no mejora. Como mediador, ¿cuál es la mejor alternativa?",
        "opciones": [
            "Convocar a cada parte por separado para exigir el cumplimiento de pactos.",
            "Facilitar un espacio de diálogo privado donde ambas expresen sus sentimientos y necesidades, reconociendo errores mutuos (como la ridiculización) para reconstruir el vínculo.",
            "Sancionar a Catalina por falta de respeto.",
            "Cambiar a Catalina de salón."
        ],
        "respuesta_correcta": 1,
        "explicacion": "El conflicto ha escalado por la reacción reactiva de la docente. La mediación requiere restablecer la comunicación y la confianza, lo cual no se logra con confrontación pública ni sanciones unilaterales.",
        "fuente": "01 CARTILLA DE PREGUNTAS PRUEBA DOCENTE PEDAGÓGICA GENERAL"
    },
    {
        "id": 124,
        "categoria": "Razonamiento Lógico",
        "pregunta": "A 4 corredores se les asignan números consecutivos. Si la suma de estos números es 98, el tercer número más grande es:",
        "opciones": [
            "22",
            "24",
            "25",
            "28"
        ],
        "respuesta_correcta": 2,
        "explicacion": "Sea x el primer número. x + (x+1) + (x+2) + (x+3) = 98. 4x + 6 = 98 -> 4x = 92 -> x = 23. Los números son 23, 24, 25, 26. El tercer más grande (en orden ascendente) es 25.",
        "fuente": "RAZONAMIENTO CUANTITATIVO PREPARÁNDONOS PARA EL CONCURSO DOCENTE"
    },
    {
        "id": 125,
        "categoria": "Razonamiento Lógico",
        "pregunta": "Una ardilla sube 50 cm, baja 70 cm, sube 80 cm, baja 45 cm y baja 12 cm. Con respecto al punto inicial se encuentra:",
        "opciones": [
            "3 cm abajo",
            "3 cm arriba",
            "13 cm abajo",
            "13 cm arriba"
        ],
        "respuesta_correcta": 1,
        "explicacion": "Suma de movimientos: +50 - 70 + 80 - 45 - 12 = +3. Por tanto, está 3 cm arriba del punto inicial.",
        "fuente": "RAZONAMIENTO CUANTITATIVO PREPARÁNDONOS PARA EL CONCURSO DOCENTE"
    },
    {
        "id": 126,
        "categoria": "Competencias Específicas",
        "pregunta": "Antónimo de ESCASEZ:",
        "opciones": [
            "Inopia",
            "Pobreza",
            "Premura",
            "Opulencia"
        ],
        "respuesta_correcta": 3,
        "explicacion": "Escasez es falta de recursos. Opulencia es abundancia excesiva de recursos. Inopia y pobreza son sinónimos.",
        "fuente": "Prueba APTITUD VERBAL 2016"
    },
    {
        "id": 127,
        "categoria": "Competencias Específicas",
        "pregunta": "Sinónimo de LITIGIO:",
        "opciones": [
            "Acuerdo",
            "Defensa",
            "Controversia",
            "Batalla"
        ],
        "respuesta_correcta": 2,
        "explicacion": "Litigio refiere a una disputa o enfrentamiento legal/formal. El término más preciso en este contexto es controversia (disputa), no necesariamente física como batalla.",
        "fuente": "Prueba APTITUD VERBAL 2016"
    },
    {
        "id": 128,
        "categoria": "Competencias Específicas",
        "pregunta": "Ordene la oración: 1. destrezas 2. evalúa 3. analizar 4. información 5. lo que se 6. para 7. es la utilización de",
        "opciones": [
            "5, 2, 7, 1, 6, 3, 4",
            "2, 5, 7, 1, 6, 3, 4",
            "5, 7, 1, 6, 3, 4, 2",
            "1, 6, 3, 4, 5, 2, 7"
        ],
        "respuesta_correcta": 0,
        "explicacion": "Orden lógico: 'Lo que se (5) evalúa (2) es la utilización de (7) destrezas (1) para (6) analizar (3) la información (4)'.",
        "fuente": "Prueba APTITUD VERBAL 2016"
    },
    {
        "id": 129,
        "categoria": "Gestión Institucional",
        "pregunta": "La dirección debe elegir una campaña institucional. Opción A: Medio ambiente. Opción B: Violencia intrafamiliar. ¿Qué criterio debe primar para la selección?",
        "opciones": [
            "Impacto en la imagen y reputación de la escuela.",
            "Viabilidad económica y logística.",
            "Beneficios tangibles al bienestar y pertinencia con las necesidades críticas de la comunidad educativa.",
            "La que requiera menos inversión."
        ],
        "respuesta_correcta": 2,
        "explicacion": "La pertinencia social y el bienestar de la comunidad son los criterios rectores de la gestión comunitaria, por encima de la imagen o el simple ahorro de costos.",
        "fuente": "01 CARTILLA DE PREGUNTAS PRUEBA DOCENTE PEDAGÓGICA GENERAL"
    },
    {
        "id": 130,
        "categoria": "Planificación Curricular",
        "pregunta": "El equipo de Comunicación define como meta: 'Producir textos coherentes'. Las actividades propuestas son: 1. Leer obras clásicas. 2. Control de lectura. 3. Exposición de argumentos. ¿Es pertinente esta programación?",
        "opciones": [
            "SÍ, porque las obras clásicas son fundamentales.",
            "NO, porque las estrategias se enfocan en comprensión lectora y oralidad, no en la producción textual escrita (redacción).",
            "SÍ, porque leer ayuda a escribir.",
            "NO, porque las lecturas son aburridas."
        ],
        "respuesta_correcta": 1,
        "explicacion": "Existe una incoherencia curricular. La meta es 'producción de textos' (competencia escritora), pero las actividades evalúan comprensión y oralidad. Para aprender a escribir, se debe escribir.",
        "fuente": "60 preguntas para concurso de reubicación docente"
    },
    {
        "id": 131,
        "categoria": "Estrategias Pedagógicas",
        "pregunta": "En Matemáticas, un docente explica el procedimiento, hace que los alumnos resuelvan el libro y luego corrige errores en el tablero. Esta secuencia es:",
        "opciones": [
            "Adecuada porque guía paso a paso.",
            "No adecuada, porque presenta un único procedimiento mecánico y limita la exploración y resolución autónoma de problemas.",
            "Adecuada porque corrige errores.",
            "No adecuada porque usa el libro."
        ],
        "respuesta_correcta": 1,
        "explicacion": "Es un enfoque conductista/instruccional directo. La didáctica de la matemática actual promueve que el estudiante explore y construya estrategias antes de la formalización (Enfoque de Resolución de Problemas).",
        "fuente": "60 preguntas para concurso de reubicación docente"
    },
    {
        "id": 132,
        "categoria": "Desarrollo Cognitivo",
        "pregunta": "Para trabajar autoestima, la docente propone pegar un papel en la espalda de cada uno para que otros escriban cualidades y defectos. ¿Es adecuada la estrategia?",
        "opciones": [
            "No, porque los estudiantes lo tomarán a juego.",
            "Sí, porque es divertido.",
            "No, porque exponer 'defectos' anónimamente en un grupo con baja autoestima puede generar burlas y dañar más el autoconcepto (Riesgo Psicosocial).",
            "Sí, porque promueve la sinceridad."
        ],
        "respuesta_correcta": 2,
        "explicacion": "En grupos con dificultades de convivencia o baja autoestima, las dinámicas de 'juicio de pares' sin un control estricto pueden convertirse en escenarios de victimización.",
        "fuente": "60 preguntas para concurso de reubicación docente"
    },
    {
        "id": 133,
        "categoria": "Convivencia y Valores",
        "pregunta": "Durante la izada de bandera, llega un estudiante en muletas. Su compañero de fila reacciona solidariamente cuando:",
        "opciones": [
            "Le dice que se vaya atrás para no estorbar.",
            "Lo deja ingresar a la fila y le ofrece el apoyo físico/espacial que necesita.",
            "Lo ignora para mantener el orden.",
            "Le avisa al profesor para que se lo lleve."
        ],
        "respuesta_correcta": 1,
        "explicacion": "La solidaridad se manifiesta en la acción empática de inclusión y ayuda inmediata ante la dificultad del otro.",
        "fuente": "60 preguntas para concurso de reubicación docente"
    },
    {
        "id": 134,
        "categoria": "Razonamiento Lógico",
        "pregunta": "En un salón, el número de niñas duplica al de niños. Si se hacen grupos de 6, sobran 3 estudiantes y se forman 8 grupos. El número de niños es:",
        "opciones": [
            "15",
            "17",
            "26",
            "34"
        ],
        "respuesta_correcta": 1,
        "explicacion": "Total estudiantes = (8 grupos * 6) + 3 sobran = 51. Sean Niños=x, Niñas=2x. x + 2x = 51 -> 3x = 51 -> x = 17. Hay 17 niños.",
        "fuente": "Prueba Aptitud Numérica Final"
    },
    {
        "id": 135,
        "categoria": "Razonamiento Lógico",
        "pregunta": "Javier cambia aceite cada 7.500 km. El último fue a los 32.800 km. Ahora el odómetro marca 38.700 km. El próximo cambio debe ser en:",
        "opciones": [
            "700 km",
            "1.400 km",
            "1.600 km",
            "2.000 km"
        ],
        "respuesta_correcta": 2,
        "explicacion": "Próximo cambio programado: 32.800 + 7.500 = 40.300 km. Actual: 38.700. Faltan: 40.300 - 38.700 = 1.600 km.",
        "fuente": "Prueba Aptitud Numérica Final"
    },
    {
        "id": 136,
        "categoria": "Razonamiento Lógico",
        "pregunta": "Las clases inician a las 7:00 am y terminan a la 1:00 pm, con dos descansos de 30 minutos. Descontando descansos, el minutero del reloj recorrió un ángulo de:",
        "opciones": [
            "1800 grados",
            "1080 grados",
            "1440 grados",
            "180 grados"
        ],
        "respuesta_correcta": 0,
        "explicacion": "Tiempo total: 6 horas (7 a 1). Descansos: 1 hora total. Tiempo efectivo de clase: 5 horas. El minutero da 1 vuelta (360°) por hora. 5 horas * 360° = 1800°.",
        "fuente": "Prueba Aptitud Numérica Final"
    },
    {
        "id": 137,
        "categoria": "Planificación Curricular",
        "pregunta": "¿Cuál es la ventaja pedagógica de organizar el currículo por **Ciclos** (ej. 1°-2°, 3°-4°) en lugar de grados aislados?",
        "opciones": [
            "Facilita la repitencia escolar.",
            "Reconoce que el desarrollo de competencias es continuo y otorga flexibilidad en los tiempos de aprendizaje (2 años para lograr metas).",
            "Permite evaluar menos.",
            "Ahorra contratación de docentes."
        ],
        "respuesta_correcta": 1,
        "explicacion": "Los ciclos respetan los ritmos de aprendizaje, entendiendo que no todos logran la competencia en el corte exacto de un año lectivo (Decreto 1290/Normativa pedagógica).",
        "fuente": "Material de estudio Concurso docente 2026"
    },
    {
        "id": 138,
        "categoria": "Estrategias Pedagógicas",
        "pregunta": "Según Vygotsky, ¿cuál es el beneficio principal de asignar tareas complejas a grupos de niveles mixtos (heterogéneos)?",
        "opciones": [
            "Que los más listos hagan el trabajo rápido.",
            "Promueve la interacción donde los estudiantes más competentes actúan como andamios (mediadores) para sus pares en la Zona de Desarrollo Próximo.",
            "Reducir el ruido en el aula.",
            "Facilitar la calificación grupal."
        ],
        "respuesta_correcta": 1,
        "explicacion": "El aprendizaje cooperativo en grupos mixtos potencia el desarrollo cognitivo mediante la interacción social y el andamiaje entre pares.",
        "fuente": "Material de estudio Concurso docente 2026"
    },
    {
        "id": 139,
        "categoria": "Evaluación y Retroalimentación",
        "pregunta": "¿Cuál es el orden lógico formativo de la **Escalera de Retroalimentación** (Daniel Wilson)?",
        "opciones": [
            "Sugerir -> Criticar -> Calificar.",
            "Clarificar -> Valorar -> Expresar Inquietudes -> Sugerir.",
            "Juzgar -> Explicar -> Repetir.",
            "Valorar -> Felicitar -> Despedir."
        ],
        "respuesta_correcta": 1,
        "explicacion": "Primero se aclara la información (entender), luego se valoran los puntos fuertes, se expresan dudas/preocupaciones y finalmente se ofrecen sugerencias. Esto crea un clima receptivo.",
        "fuente": "Material de estudio Concurso docente 2026"
    },
    {
        "id": 140,
        "categoria": "Desarrollo Cognitivo",
        "pregunta": "Una estrategia efectiva para prevenir el **Burnout** (síndrome del quemado) en el equipo docente es:",
        "opciones": [
            "Aumentar la vigilancia y control.",
            "Fomentar una cultura de apoyo mutuo (redes de apoyo), reconocimiento y carga laboral razonable/equitativa.",
            "Exigir más resultados para mantenerlos ocupados.",
            "Ignorar las quejas para no darles poder."
        ],
        "respuesta_correcta": 1,
        "explicacion": "El bienestar laboral docente depende de factores psicosociales como el apoyo social y el clima organizacional positivo.",
        "fuente": "Material de estudio Concurso docente 2026"
    },
    {
        "id": 141,
        "categoria": "Estrategias Pedagógicas",
        "pregunta": "El propósito principal del **Conflicto Cognitivo** (Piaget) al inicio de una secuencia didáctica es:",
        "opciones": [
            "Frustrar al estudiante para que sepa que no sabe.",
            "Generar un desequilibrio entre los saberes previos y la nueva información, activando la necesidad de aprender para re-equilibrar.",
            "Demostrar la autoridad intelectual del docente.",
            "Hacer una evaluación diagnóstica sumativa."
        ],
        "respuesta_correcta": 1,
        "explicacion": "El desequilibrio o disonancia cognitiva es el motor que impulsa la reestructuración de esquemas mentales (aprendizaje profundo).",
        "fuente": "Material de estudio Concurso docente 2026"
    },
    {
        "id": 142,
        "categoria": "Situacional - Socioemocional",
        "pregunta": "Juan, ante una discusión, mantiene la calma y escucha. María, ante una crítica, grita y se pone defensiva. Esto indica que:",
        "opciones": [
            "Ambos tienen problemas de conducta.",
            "Juan demuestra habilidades socioemocionales fuertes (autorregulación), mientras María evidencia falta de control emocional ante la frustración.",
            "María es más auténtica que Juan.",
            "Juan es pasivo y María es líder."
        ],
        "respuesta_correcta": 1,
        "explicacion": "El caso evalúa competencias socioemocionales. La autorregulación y escucha activa (Juan) son indicadores de competencia alta; la reacción defensiva (María) indica necesidad de fortalecimiento.",
        "fuente": "01 CARTILLA DE PREGUNTAS PRUEBA DOCENTE PEDAGÓGICA GENERAL"
    },
    {
        "id": 143,
        "categoria": "Razonamiento Lógico",
        "pregunta": "Una guarnición de 400 soldados tiene víveres para 180 días (900g/hombre). Llegan 100 soldados más. No habrá víveres hasta dentro de 240 días. ¿A cuánto se debe reducir la ración diaria?",
        "opciones": [
            "540g",
            "720g",
            "420g",
            "450g"
        ],
        "respuesta_correcta": 0,
        "explicacion": "Total comida disponible = 400 * 180 * 900g. Nueva situación: 500 soldados * 240 días * X gramos. Igualamos: 400*180*900 = 500*240*X. Simplificando: X = (400*180*900)/(500*240) = 540g.",
        "fuente": "RAZONAMIENTO CUANTITATIVO PREPARÁNDONOS PARA EL CONCURSO DOCENTE"
    },
    {
        "id": 144,
        "categoria": "Inclusión y Diversidad",
        "pregunta": "Un estudiante con TDAH se distrae fácilmente. ¿Qué ajuste de **acceso** es prioritario en el aula?",
        "opciones": [
            "Sentarlo al fondo para que no moleste.",
            "Ubicarlo lejos de estímulos (ventanas/puertas), cerca del docente, y segmentar las instrucciones.",
            "Reprenderlo públicamente cada vez que se levante.",
            "Dejarlo salir del salón cuando quiera."
        ],
        "respuesta_correcta": 1,
        "explicacion": "El control de estímulos ambientales y la cercanía para monitoreo son ajustes razonables básicos para favorecer la atención sostenida.",
        "fuente": "Nuevos Maestros fase 2 entrega 6.2 (Inferido)"
    },
    {
        "id": 145,
        "categoria": "Gestión Institucional",
        "pregunta": "Para la actualización del Manual de Convivencia, el rector decide contratar a un abogado experto que redacte el documento solo. Esta decisión:",
        "opciones": [
            "Es eficiente porque ahorra tiempo y asegura legalidad.",
            "Es incorrecta, porque el Manual debe ser una construcción participativa de toda la comunidad educativa para tener legitimidad y enfoque pedagógico.",
            "Es correcta si el abogado es amigo del rector.",
            "Es necesaria porque los docentes no saben de leyes."
        ],
        "respuesta_correcta": 1,
        "explicacion": "La Ley 1620 y el Decreto 1965 exigen que el Manual de Convivencia sea construido, evaluado y ajustado participativamente por el Comité de Convivencia y la comunidad.",
        "fuente": "Manual de Funciones - Normatividad (Ley 1620)"
    }
];

// Map everything to the 10 FULL NAMES requested by the user
function mapToFullName(cat) {
    if (!cat) return "General";
    cat = cat.trim();

    // Pedagogía / Estrategias
    if (cat === 'Pedagogía' || cat.includes('Estrategias Pedagógicas') || cat.includes('Desarrollo Cognitivo')) return 'Estrategias Pedagógicas';

    // Evaluación
    if (cat === 'Evaluación' || cat.includes('Evaluación y Retroalimentación')) return 'Evaluación y Retroalimentación';

    // Convivencia
    if (cat === 'Convivencia' || cat.includes('Convivencia y Valores') || cat.includes('Socioemocional')) return 'Convivencia y Valores';

    // Gestión
    if (cat === 'Gestión' || cat.includes('Gestión Institucional')) return 'Gestión Institucional';

    // Planeación
    if (cat === 'Planeación' || cat.includes('Planificación Curricular')) return 'Planificación Curricular';

    // Inclusión
    if (cat === 'Inclusión' || cat.includes('Inclusión y Diversidad')) return 'Inclusión y Diversidad';

    // Normatividad
    if (cat === 'Normatividad' || cat.includes('Normatividad y Legislación')) return 'Normatividad y Legislación';

    // Lógico
    if (cat === 'Razonamiento Lógico' || cat.includes('Aptitud Numérica') || cat.includes('Lógico / Cuantitativo')) return 'Razonamiento Lógico / Cuantitativo';

    // Verbal
    if (cat === 'Razonamiento Verbal' || cat.includes('Aptitud Verbal')) return 'Aptitud Verbal';

    // Competencias
    if (cat === 'Competencias' || cat.includes('Competencias Específicas')) return 'Competencias Específicas';

    return cat;
}

function convertNewQuestion(q, newNum) {
    return {
        questionNumber: newNum,
        category: mapToFullName(q.categoria),
        difficulty: "Experto",
        question: q.pregunta,
        answerOptions: q.opciones,
        correctAnswer: q.respuesta_correcta,
        rationale: q.explicacion,
        hint: q.fuente
    };
}

const quizPath = path.join(process.cwd(), 'quizData2.js');
const tempPath = path.join(process.cwd(), 'temp_quizData2_batch2.js');

try {
    const rawContent = fs.readFileSync(quizPath, 'utf8');

    // Improved CJS conversion: remove 'const RAW_QUIZ_DATA_2 =' and replace with 'module.exports ='
    // We also need to be careful if there's a 'window' assignment at the end
    let cjsContent = rawContent.trim();
    if (cjsContent.startsWith('const RAW_QUIZ_DATA_2 =')) {
        cjsContent = cjsContent.replace('const RAW_QUIZ_DATA_2 =', 'module.exports =');
    }

    // Remove the window assignment if it exists to avoid reference errors in Node
    cjsContent = cjsContent.replace(/if \(typeof window !== 'undefined'\) \{[\s\S]*\}/, '');

    fs.writeFileSync(tempPath, cjsContent);

    const existingData = require(tempPath);
    console.log(`Found ${existingData.questions.length} existing questions. Normalizing...`);

    // Complete normalization to Full Names for ALL questions
    existingData.questions = existingData.questions.map((q, i) => ({
        ...q,
        questionNumber: i + 1,
        category: mapToFullName(q.category)
    }));

    // Convert and add new 25
    const nextNum = existingData.questions.length + 1;
    const addedQuestions = NEW_BATCH.map((q, i) => convertNewQuestion(q, nextNum + i));

    existingData.questions = existingData.questions.concat(addedQuestions);

    // Final check to ensure all 180 questions have full category names
    existingData.questions.forEach((q, i) => {
        q.category = mapToFullName(q.category);
    });

    // Save back
    const output = `const RAW_QUIZ_DATA_2 = ${JSON.stringify(existingData, null, 4)};\n\nif (typeof window !== 'undefined') {\n    window.RAW_QUIZ_DATA_2 = RAW_QUIZ_DATA_2;\n}`;
    fs.writeFileSync(quizPath, output);
    console.log(`Success: quizData2.js updated and fully normalized. Total questions: ${existingData.questions.length}`);

} catch (err) {
    console.error('Error:', err);
} finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}
