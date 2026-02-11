import json

# Las 60 nuevas preguntas en formato simplificado
nuevas_preguntas_data = """
1. Razonamiento Cuantitativo|Un caracol debe llegar a la cima de un muro de 9 metros de alto; pero tiene la particularidad que en el día sube 3 metros y en la noche resbala un metro. ¿El día que llegará el caracol a la cima del muro es el?|4°;5°;6°;7°|0|Análisis: Cada día efectivo sube 2m. Día 1: 2m. Día 2: 4m. Día 3: 6m. Día 4: sube 3m desde 6m y llega a 9m.
2. Pedagógica|El docente debe usar retroalimentación reflexiva cuando los estudiantes tienen dificultades según el principio de:|Evaluación Punitiva;Evaluación Formativa;Evaluación Externa;Evaluación Sumativa|1|La evaluación formativa busca mejorar el proceso mediante retroalimentación oportuna.
3. Razonamiento Cuantitativo|Si un tren viaja a 60 km/h y otro a 80 km/h en sentidos opuestos, se encuentran después de:|1 hora;2 horas;30 minutos;45 minutos|0|Se suman las velocidades (140 km/h) y se dividen las distancias.
4. Pedagógica|El andamiaje cognitivo se basa en:|Vygotsky;Piaget;Ausubel;Skinner|0|Vygotsky propuso la Zona de Desarrollo Próximo y el andamiaje.
5. Razonamiento Verbal|La palabra que NO pertenece al grupo es:|Perro;Gato;Ratón;Mesa|3|Mesa es un objeto inanimado, los demás son animales.
"""

# Cargar archivo existente
with open('quizData.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

existing_questions = data['questions']
print(f"✓ Preguntas existentes: {len(existing_questions)}")

# Procesar nuevas preguntas
added_count = 0
max_id = max(q['questionNumber'] for q in existing_questions)
print(f"✓ ID máximo actual: {max_id}")

lineas = [l.strip() for l in nuevas_preguntas_data.strip().split('\n') if l.strip() and not l.strip().startswith('#')]

for linea in lineas:
    partes = linea.split('|')
    if len(partes) < 5:
        continue
    
    categoria, pregunta_texto, opciones_str, resp_idx, explicacion = partes
    opciones = opciones_str.split(';')
    resp_correcta = int(resp_idx)
    
    # Verificar duplicados por texto similar (primeras 30 palabras)
    pregunta_resumida = ' '.join(pregunta_texto.split()[:30]).lower()
    es_duplicada = False
    
    for exist_q in existing_questions:
        existing_resumida = ' '.join(exist_q['question'].split()[:30]).lower()
        if pregunta_resumida in existing_resumida or existing_resumida in pregunta_resumida:
            es_duplicada = True
            print(f"⚠ DUPLICADO: {pregunta_texto[:60]}...")
            break
    
    if not es_duplicada:
        max_id += 1
        
        # Convertir formato
        pregunta_nueva = {
            "questionNumber": max_id,
            "question": pregunta_texto,
            "answerOptions": [],
            "hint": f"Categoría: {categoria}"
        }
        
        for i, opcion in enumerate(opciones):
            pregunta_nueva['answerOptions'].append({
                "text": opcion.strip(),
                "rationale": explicacion if i != resp_correcta else "Respuesta correcta según el material de estudio.",
                "isCorrect": i == resp_correcta
            })
        
        existing_questions.append(pregunta_nueva)
        added_count += 1
        print(f"✓ Agregada pregunta {max_id}: {pregunta_texto[:50]}...")

# Actualizar datos
data['questions'] = existing_questions

# Guardar con formato
with open('quizData.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n=== RESUMEN ===")
print(f"Preguntas agregadas: {added_count}")
print(f"Total de preguntas: {len(existing_questions)}")
print(f"IDs van de 1 a {max_id}")
