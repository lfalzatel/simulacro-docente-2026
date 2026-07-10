import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

profesor_view_html = """
        <!-- Profesor View: Mis Exámenes -->
        <div id="profesor-examenes-view" class="dashboard hidden">
            <div class="welcome-section admin-hero">
                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h1 class="welcome-title">Mis Exámenes</h1>
                        <p class="welcome-text">Crea y gestiona exámenes y simulacros para tus grupos.</p>
                    </div>
                    <button class="primary-btn" onclick="openCreateExamenModal()">
                        <span class="btn-icon">+</span> Nuevo Examen
                    </button>
                </div>
            </div>

            <div class="section-container" style="margin-top: 1rem;">
                <div class="filter-bar" style="margin-bottom: 1rem; display: flex; gap: 1rem;">
                    <select id="filtroGrupo" class="form-select" onchange="renderProfesorExamenes()">
                        <option value="todos">Todos los grupos</option>
                        <option value="7A">Grupo 7A</option>
                        <option value="8B">Grupo 8B</option>
                        <option value="10A">Grupo 10A</option>
                    </select>
                </div>
                
                <div id="profesor-examenes-list" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div class="loader-container"><div class="dot-loader"></div></div>
                </div>
            </div>
        </div>
"""

modal_html = """
    <!-- Modal: Crear Examen -->
    <div id="create-examen-modal" class="modal-overlay hidden">
        <div class="modal-content glass-modal">
            <div class="modal-header">
                <h2>Crear Nuevo Examen</h2>
                <button class="close-modal" onclick="closeCreateExamenModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="form-crear-examen" onsubmit="event.preventDefault(); submitCrearExamen();">
                    <div class="form-group">
                        <label for="new-examen-title">Título del Examen</label>
                        <input type="text" id="new-examen-title" class="form-input" placeholder="Ej: Simulacro Final 7A" required>
                    </div>
                    <div class="form-group">
                        <label for="new-examen-grupo">Grupo Asignado</label>
                        <select id="new-examen-grupo" class="form-select" required>
                            <option value="" disabled selected>Selecciona un grupo</option>
                            <option value="7A">7A</option>
                            <option value="8B">8B</option>
                            <option value="10A">10A</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="new-examen-banco">Banco de Preguntas</label>
                        <select id="new-examen-banco" class="form-select" required>
                            <option value="quizData">Simulador Docente (Principal)</option>
                            <option value="quizData2">Conocimientos Pedagógicos</option>
                            <option value="quizData3">Razonamiento Lógico</option>
                        </select>
                    </div>
                    <div class="form-row" style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label for="new-examen-num-preg">Cant. Preguntas</label>
                            <input type="number" id="new-examen-num-preg" class="form-input" placeholder="Todas">
                            <small>Deja vacío para usar el banco completo</small>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="new-examen-duracion">Tiempo (Minutos)</label>
                            <input type="number" id="new-examen-duracion" class="form-input" placeholder="Sin límite">
                        </div>
                    </div>
                    
                    <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem;">
                        <button type="button" class="secondary-btn" onclick="closeCreateExamenModal()">Cancelar</button>
                        <button type="submit" class="primary-btn">Crear y Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
"""

# Insert profesor_view_html before <div id="docs-view"
content = content.replace('        <div id="docs-view"', profesor_view_html + '\n        <div id="docs-view"')

# Insert modal before </body>
content = content.replace('</body>', modal_html + '\n</body>')

# Update bottom nav links to point to the new view instead of alert
content = re.sub(r'data-view="mis-examenes" onclick="alert\(.*?\'\)"', 'data-view="profesor-examenes"', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
