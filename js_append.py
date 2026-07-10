import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update switchView
pattern_switch = re.compile(r'(function switchView\(viewId\) \{.*?)(document\.getElementById\(''docs-view''\)\.classList\.add\(''hidden''\);)(.*?\})', re.DOTALL)
replacement_switch = r"\1\2\n    const profView = document.getElementById('profesor-examenes-view');\n    if(profView) profView.classList.add('hidden');\3"

content = pattern_switch.sub(replacement_switch, content)

# Add show logic in switchView
pattern_show = re.compile(r'if \(viewId === \'dashboard\'\) \{.*?\} else if \(viewId === \'quiz\'\) \{', re.DOTALL)
replacement_show = """if (viewId === 'dashboard') {
        document.getElementById('dashboard').classList.remove('hidden');
    } else if (viewId === 'profesor-examenes') {
        const profView = document.getElementById('profesor-examenes-view');
        if(profView) profView.classList.remove('hidden');
        renderProfesorExamenes();
    } else if (viewId === 'quiz') {"""
    
content = pattern_show.sub(replacement_show, content)

js_append = """
// ==========================================
// FASE 3: PANEL DEL PROFESOR (EXÁMENES)
// ==========================================

function openCreateExamenModal() {
    document.getElementById('create-examen-modal').classList.remove('hidden');
}

function closeCreateExamenModal() {
    document.getElementById('create-examen-modal').classList.add('hidden');
    document.getElementById('form-crear-examen').reset();
}

async function submitCrearExamen() {
    if (!window.db || typeof auth === 'undefined' || !auth.currentUser) return;
    
    const titulo = document.getElementById('new-examen-title').value.trim();
    const grupoId = document.getElementById('new-examen-grupo').value;
    const bancoPreguntas = document.getElementById('new-examen-banco').value;
    const numPreguntasRaw = document.getElementById('new-examen-num-preg').value;
    const duracionRaw = document.getElementById('new-examen-duracion').value;
    
    const numPreguntas = numPreguntasRaw ? parseInt(numPreguntasRaw) : null;
    const duracionMinutos = duracionRaw ? parseInt(duracionRaw) : null;
    
    try {
        Swal.fire({ title: 'Creando examen...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        await window.db.collection('examenes').add({
            titulo: titulo,
            grupoId: grupoId,
            profesorId: auth.currentUser.uid,
            bancoPreguntas: bancoPreguntas,
            numPreguntas: numPreguntas,
            duracionMinutos: duracionMinutos,
            estado: 'inactivo',
            creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
            activadoEn: null
        });
        
        Swal.fire('Éxito', 'Examen creado correctamente', 'success');
        closeCreateExamenModal();
        renderProfesorExamenes();
    } catch (err) {
        console.error("Error creando examen:", err);
        Swal.fire('Error', 'No se pudo crear el examen: ' + err.message, 'error');
    }
}

async function renderProfesorExamenes() {
    const listContainer = document.getElementById('profesor-examenes-list');
    if (!listContainer || !window.db || typeof auth === 'undefined' || !auth.currentUser) return;
    
    const filtroGrupo = document.getElementById('filtroGrupo').value;
    listContainer.innerHTML = '<div class="loader-container"><div class="dot-loader"></div></div>';
    
    try {
        let query = window.db.collection('examenes')
            .where('profesorId', '==', auth.currentUser.uid)
            .orderBy('creadoEn', 'desc');
            
        const snapshot = await query.get();
        let examenes = [];
        snapshot.forEach(doc => examenes.push({ id: doc.id, ...doc.data() }));
        
        if (filtroGrupo !== 'todos') {
            examenes = examenes.filter(ex => ex.grupoId === filtroGrupo);
        }
        
        if (examenes.length === 0) {
            listContainer.innerHTML = '<p class="empty-state" style="text-align:center; color:var(--text-secondary);">No hay exámenes para este grupo.</p>';
            return;
        }
        
        let html = '';
        examenes.forEach(ex => {
            const isChecked = ex.estado === 'activo' ? 'checked' : '';
            const numPreg = ex.numPreguntas ? `${ex.numPreguntas} preg.` : 'Todas las preg.';
            const tiempo = ex.duracionMinutos ? `${ex.duracionMinutos} min` : 'Sin límite';
            
            html += `
                <div class="examen-card">
                    <div class="examen-card-header">
                        <div>
                            <div class="examen-title">${ex.titulo}</div>
                            <span class="examen-group-badge">${ex.grupoId}</span>
                        </div>
                        <label class="switch">
                          <input type="checkbox" ${isChecked} onchange="toggleEstadoExamen('${ex.id}', this.checked)">
                          <span class="slider"></span>
                        </label>
                    </div>
                    <div class="examen-meta">
                        <span>📚 ${ex.bancoPreguntas}</span>
                        <span>⏱️ ${tiempo}</span>
                        <span>📝 ${numPreg}</span>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
    } catch (err) {
        console.error("Error cargando exámenes:", err);
        listContainer.innerHTML = `<div class="error-msg">Error cargando exámenes: ${err.message}</div>`;
    }
}

async function toggleEstadoExamen(examenId, isActive) {
    if (!window.db) return;
    try {
        const nuevoEstado = isActive ? 'activo' : 'inactivo';
        const updateData = { estado: nuevoEstado };
        if (isActive) {
            updateData.activadoEn = firebase.firestore.FieldValue.serverTimestamp();
        }
        await window.db.collection('examenes').doc(examenId).update(updateData);
        // console.log(`Examen ${examenId} cambiado a ${nuevoEstado}`);
    } catch (err) {
        console.error("Error cambiando estado:", err);
        Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
        renderProfesorExamenes(); // revert toggle visually
    }
}
"""

content = content + "\n" + js_append

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
