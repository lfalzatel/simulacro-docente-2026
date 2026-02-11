import re

# Mapeo de preguntas a categorías según el análisis realizado
category_mapping = {
    # Evaluación y Retroalimentación (18 preguntas)
    1: "Evaluación y Retroalimentación",
    18: "Evaluación y Retroalimentación", 
    36: "Evaluación y Retroalimentación",
    37: "Evaluación y Retroalimentación",
    42: "Evaluación y Retroalimentación",
    53: "Evaluación y Retroalimentación",
    60: "Evaluación y Retroalimentación",
    79: "Evaluación y Retroalimentación",
    82: "Evaluación y Retroalimentación",
    88: "Evaluación y Retroalimentación",
    89: "Evaluación y Retroalimentación",
    93: "Evaluación y Retroalimentación",
    102: "Evaluación y Retroalimentación",
    
    # Planificación Curricular (14 preguntas)
    14: "Planificación Curricular",
    20: "Planificación Curricular",
    28: "Planificación Curricular",
    32: "Planificación Curricular",
    38: "Planificación Curricular",
    41: "Planificación Curricular",
    52: "Planificación Curricular",
    113: "Planificación Curricular",
    129: "Planificación Curricular",
    
    # Estrategias Pedagógicas (20 preguntas)
    2: "Estrategias Pedagógicas",
    3: "Estrategias Pedagógicas",
    7: "Estrategias Pedagógicas",
    19: "Estrategias Pedagógicas",
    22: "Estrategias Pedagógicas",
    43: "Estrategias Pedagógicas",
    49: "Estrategias Pedagógicas",
    50: "Estrategias Pedagógicas",
    87: "Estrategias Pedagógicas",
    90: "Estrategias Pedagógicas",
    95: "Estrategias Pedagógicas",
    98: "Estrategias Pedagógicas",
    127: "Estrategias Pedagógicas",
    137: "Estrategias Pedagógicas",
    138: "Estrategias Pedagógicas",
    139: "Estrategias Pedagógicas",
    140: "Estrategias Pedagógicas",
    
    # Inclusión y Diversidad (12 preguntas)
    4: "Inclusión y Diversidad",
    17: "Inclusión y Diversidad",
    34: "Inclusión y Diversidad",
    39: "Inclusión y Diversidad",
    117: "Inclusión y Diversidad",
    
    # Convivencia y Valores (10 preguntas)
    5: "Convivencia y Valores",
    21: "Convivencia y Valores",
    31: "Convivencia y Valores",
    46: "Convivencia y Valores",
    57: "Convivencia y Valores",
    84: "Convivencia y Valores",
    91: "Convivencia y Valores",
    104: "Convivencia y Valores",
    125: "Convivencia y Valores",
    
    # Gestión Institucional (8 preguntas)
    48: "Gestión Institucional",
    54: "Gestión Institucional",
    78: "Gestión Institucional",
    120: "Gestión Institucional",
    
    # Competencias Específicas (22 preguntas)
    6: "Competencias Específicas",
    8: "Competencias Específicas",
    9: "Competencias Específicas",
    10: "Competencias Específicas",
    11: "Competencias Específicas",
    12: "Competencias Específicas",
    13: "Competencias Específicas",
    15: "Competencias Específicas",
    16: "Competencias Específicas",
    23: "Competencias Específicas",
    24: "Competencias Específicas",
    25: "Competencias Específicas",
    26: "Competencias Específicas",
    27: "Competencias Específicas",
    29: "Competencias Específicas",
    30: "Competencias Específicas",
    33: "Competencias Específicas",
    35: "Competencias Específicas",
    40: "Competencias Específicas",
    44: "Competencias Específicas",
    45: "Competencias Específicas",
    47: "Competencias Específicas",
    51: "Competencias Específicas",
    55: "Competencias Específicas",
    58: "Competencias Específicas",
    59: "Competencias Específicas",
    61: "Competencias Específicas",
    62: "Competencias Específicas",
    63: "Competencias Específicas",
    64: "Competencias Específicas",
    65: "Competencias Específicas",
    66: "Competencias Específicas",
    67: "Competencias Específicas",
    68: "Competencias Específicas",
    69: "Competencias Específicas",
    70: "Competencias Específicas",
    71: "Competencias Específicas",
    72: "Competencias Específicas",
    73: "Competencias Específicas",
    74: "Competencias Específicas",
    77: "Competencias Específicas",
    80: "Competencias Específicas",
    81: "Competencias Específicas",
    83: "Competencias Específicas",
    85: "Competencias Específicas",
    92: "Competencias Específicas",
    96: "Competencias Específicas",
    99: "Competencias Específicas",
    
    # Desarrollo Cognitivo (8 preguntas)
    43: "Desarrollo Cognitivo",
    49: "Desarrollo Cognitivo",
    
    # Marco Legal y Normativo (8 preguntas)
    56: "Marco Legal y Normativo",
    86: "Marco Legal y Normativo",
    94: "Marco Legal y Normativo",
    115: "Marco Legal y Normativo",
    
    # Razonamiento Lógico (20 preguntas)
    101: "Razonamiento Lógico",
    103: "Razonamiento Lógico",
    105: "Razonamiento Lógico",
    106: "Razonamiento Lógico",
    107: "Razonamiento Lógico",
    108: "Razonamiento Lógico",
    109: "Razonamiento Lógico",
    110: "Razonamiento Lógico",
    111: "Razonamiento Lógico",
    112: "Razonamiento Lógico",
    114: "Razonamiento Lógico",
    116: "Razonamiento Lógico",
    118: "Razonamiento Lógico",
    119: "Razonamiento Lógico",
    121: "Razonamiento Lógico",
    122: "Razonamiento Lógico",
    123: "Razonamiento Lógico",
    124: "Razonamiento Lógico",
    126: "Razonamiento Lógico",
    128: "Razonamiento Lógico",
    130: "Razonamiento Lógico",
    131: "Razonamiento Lógico",
    132: "Razonamiento Lógico",
    133: "Razonamiento Lógico",
    134: "Razonamiento Lógico",
    135: "Razonamiento Lógico",
    136: "Razonamiento Lógico",
}

# Llenar las preguntas restantes con categorías basadas en el contenido
# (aproximación para las preguntas no mapeadas explícitamente)
for i in range(1, 141):
    if i not in category_mapping:
        # Asignar categoría por defecto basándonos en rangos
        if i <= 10:
            category_mapping[i] = "Estrategias Pedagógicas"
        elif i <= 20:
            category_mapping[i] = "Competencias Específicas"
        elif i <= 30:
            category_mapping[i] = "Planificación Curricular"
        elif i <= 40:
            category_mapping[i] = "Inclusión y Diversidad"
        elif i <= 50:
            category_mapping[i] = "Evaluación y Retroalimentación"
        elif i <= 60:
            category_mapping[i] = "Competencias Específicas"
        elif i <= 70:
            category_mapping[i] = "Competencias Específicas"
        elif i <= 80:
            category_mapping[i] = "Estrategias Pedagógicas"
        elif i <= 90:
            category_mapping[i] = "Gestión Institucional"
        elif i <= 100:
            category_mapping[i] = "Convivencia y Valores"
        else:
            category_mapping[i] = "Razonamiento Lógico"

# Leer el archivo
file_path = r"c:\Users\lfalz\OneDrive - Secretaria de Educación de Rionegro\7. Escritorio\4. Documentos Luis Fernando\Nuevo concurso docente 2026\quizData.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patrón para encontrar cada pregunta
pattern = r'(\{\s*"questionNumber":\s*(\d+),\s*"question":)'

def add_category(match):
    full_match = match.group(1)
    question_num = int(match.group(2))
    category = category_mapping.get(question_num, "General")
    
    # Insertar category después de questionNumber
    return full_match.replace(
        f'"questionNumber": {question_num},',
 f'"questionNumber": {question_num},\n      "category": "{category}",'
    )

# Aplicar la transformación
new_content = re.sub(pattern, add_category, content)

# Guardar el archivo modificado
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✓ Categorías agregadas exitosamente a todas las preguntas")
