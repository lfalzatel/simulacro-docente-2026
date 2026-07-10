import re
import sys

def main():
    try:
        with open('app.js', 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open('app.js', 'r', encoding='iso-8859-1') as f:
            content = f.read()

    # 1. Remove globals
    content = re.sub(r'let supabaseApp = null;\r?\n', '', content)
    content = re.sub(r'let realtimeChannel = null;.*?\n', '', content)
    content = re.sub(r'const SUPABASE_URL = .*?\n', '', content)
    content = re.sub(r'const SUPABASE_KEY = .*?\n', '', content)

    # 2. Rewrite Auth Init in init()
    # Find the block starting with "if (typeof supabase !== 'undefined')" inside init
    pattern_init = re.compile(r'// Inicializar Supabase con Third-Party Auth usando Firebase Token \(Fase 0\).*?if \(roleData\) userRole = roleData\.role;\s*\}', re.DOTALL)
    replacement_init = """// Cargar o crear usuario en Firestore
                    if (window.db) {
                        try {
                            const userRef = window.db.collection('usuarios').doc(user.uid);
                            const userDoc = await userRef.get();
                            if (userDoc.exists) {
                                userRole = userDoc.data().rol || 'free';
                            } else {
                                userRole = 'free';
                                await userRef.set({
                                    email: user.email,
                                    nombre: user.displayName || '',
                                    rol: userRole,
                                    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
                                });
                                console.log("Usuario creado en Firestore");
                            }
                        } catch (err) {
                            console.error("Error al cargar rol desde Firestore:", err);
                        }
                    }"""
    content = pattern_init.sub(replacement_init, content)

    # 3. Rewrite loadAllUsers
    pattern_load = re.compile(r'async function loadAllUsers\(\) \{.*?\} catch \(err\) \{.*?\}\s*\}', re.DOTALL)
    replacement_load = """async function loadAllUsers() {
    const listContainer = document.getElementById('admin-user-list');
    if (!listContainer) return;
    try {
        listContainer.innerHTML = '<div class="loader-container"><div class="dot-loader"></div></div>';
        const snapshot = await window.db.collection('usuarios').orderBy('creadoEn', 'desc').get();
        const data = [];
        snapshot.forEach(doc => data.push({ user_id: doc.id, ...doc.data(), role: doc.data().rol }));
        allUsersCache = data;
        renderUserList(data);
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        listContainer.innerHTML = `<div class="error-msg">Error cargando usuarios: ${err.message}</div>`;
    }
}"""
    content = pattern_load.sub(replacement_load, content)

    # 4. Rewrite updateUserRole
    pattern_role = re.compile(r'async function updateUserRole\(userId, newRole\) \{.*?\} catch \(err\) \{.*?\}\s*\}', re.DOTALL)
    replacement_role = """async function updateUserRole(userId, newRole) {
    try {
        await window.db.collection('usuarios').doc(userId).update({ rol: newRole });
        Swal.fire('Éxito', 'Rol actualizado correctamente', 'success');
        loadAllUsers();
    } catch (err) {
        console.error("Error actualizando rol:", err);
        Swal.fire('Error', 'No se pudo actualizar el rol', 'error');
    }
}"""
    content = pattern_role.sub(replacement_role, content)

    # 5. Rewrite saveUserMetadata
    pattern_save_meta = re.compile(r'async function saveUserMetadata\(userId, phone, notes\) \{.*?\} catch \(err\) \{.*?\}\s*\}', re.DOTALL)
    replacement_save_meta = """async function saveUserMetadata(userId, phone, notes) {
    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await window.db.collection('usuarios').doc(userId).update({ phone, notes, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
        const index = allUsersCache.findIndex(u => u.user_id === userId);
        if (index > -1) {
            allUsersCache[index].phone = phone;
            allUsersCache[index].notes = notes;
        }
        Swal.fire('Éxito', 'Datos guardados correctamente', 'success');
        closeUserModal();
        renderUserList(allUsersCache);
    } catch (err) {
        console.error("Error guardando metadatos:", err);
        Swal.fire('Error', err.message, 'error');
    }
}"""
    content = pattern_save_meta.sub(replacement_save_meta, content)

    # 6. Rewrite deleteUser
    pattern_delete = re.compile(r'async function deleteUser\(userId\) \{.*?\} catch \(err\) \{.*?\}\s*\}', re.DOTALL)
    replacement_delete = """async function deleteUser(userId) {
    const confirm = await Swal.fire({
        title: "¿Estás seguro?",
        text: "Esta acción eliminará al usuario.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });
    if (!confirm.isConfirmed) return;
    try {
        await window.db.collection('usuarios').doc(userId).delete();
        Swal.fire('Éxito', 'Usuario eliminado', 'success');
        loadAllUsers();
    } catch (err) {
        console.error("Error eliminando usuario:", err);
        Swal.fire('Error', 'No se pudo eliminar el usuario', 'error');
    }
}"""
    content = pattern_delete.sub(replacement_delete, content)

    # 7. Rewrite exportUsersCSV
    pattern_export = re.compile(r'async function exportUsersCSV\(\) \{.*?\} catch \(err\) \{.*?\}\s*\}', re.DOTALL)
    replacement_export = """async function exportUsersCSV() {
    console.log("exportUsersCSV no implementado en Fase 1");
}"""
    content = pattern_export.sub(replacement_export, content)

    # 8. Rewrite getUserRole
    pattern_get_role = re.compile(r'async function getUserRole\(user\) \{.*?\n\}', re.DOTALL)
    replacement_get_role = """async function getUserRole(user) {
    if (!user) return 'free';
    if (user.email === 'lfalzatel@gmail.com') {
        console.log("Super Admin detectado");
        try {
            await window.db.collection('usuarios').doc(user.id).set({ rol: 'admin', email: user.email }, { merge: true });
        } catch(e) {}
        return 'admin';
    }
    try {
        const doc = await window.db.collection('usuarios').doc(user.id).get();
        if (doc.exists) return doc.data().rol || 'free';
    } catch (err) {
        console.error("Error getUserRole:", err);
    }
    return 'free';
}"""
    content = pattern_get_role.sub(replacement_get_role, content)

    # 9. Rewrite loadSimulacros
    pattern_load_sim = re.compile(r'async function loadSimulacros\(\) \{.*?renderSimulacrosList\(\);\r?\n\}', re.DOTALL)
    replacement_load_sim = """async function loadSimulacros() {
    console.log("loadSimulacros: usando datos locales (Fase 1)");
    simulacrosCatalog = [{
        id: 'd15c2a06-b97f-4349-817b-14e07377a0e6',
        titulo: RAW_QUIZ_DATA.quizTitle || 'Simulador Docente',
        descripcion: 'Simulador Principal',
        activo: true
    }];
    renderSimulacrosList();
}"""
    content = pattern_load_sim.sub(replacement_load_sim, content)

    # 10. Rewrite guardarProgresoCompleto
    pattern_guardar = re.compile(r'async function guardarProgresoCompleto\(silent = false\) \{.*?if \(!silent && statusEl\).*?statusEl\.classList\.remove\(''visible''\).*?\r?\n\s*\}\r?\n\}', re.DOTALL)
    replacement_guardar = """async function guardarProgresoCompleto(silent = false) {
    const statusEl = document.getElementById('save-status');
    if (!silent && statusEl) {
        statusEl.innerHTML = "Guardando...";
        statusEl.classList.add('visible');
    }

    const progressData = {
        lastIndex: currentQuestionIndex,
        score: score,
        answers: userProgress,
        timestamp: new Date().toISOString(),
        totalTime: userProgress.totalTime || 0
    };

    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(progressData));
    if (!silent) console.log(`Progreso completo guardado localmente en ${key}`);

    const isDefaultSim = !currentSimulacroId || (window.currentSimulacroNum === 1);
    if (isDefaultSim && !currentSimulacroId) {
        currentSimulacroId = 'd15c2a06-b97f-4349-817b-14e07377a0e6';
    }

    if (window.db && typeof auth !== 'undefined' && auth.currentUser) {
        try {
            const user = auth.currentUser;
            const docRef = window.db.collection('usuarios').doc(user.uid).collection('simulacros_progreso').doc(currentSimulacroId);
            await docRef.set({
                progress_data: userProgress,
                score: score,
                last_index: currentQuestionIndex,
                total_correctas: Object.values(userProgress).filter(a => a.isCorrect).length,
                total_incorrectas: Object.values(userProgress).filter(a => !a.isCorrect).length,
                total_respondidas: Object.values(userProgress).length,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            if (!silent && statusEl) statusEl.innerHTML = "Sincronizado";
        } catch (error) {
            console.error('Error al sincronizar con Firestore:', error);
            if (!silent && statusEl) statusEl.innerHTML = "Error Red";
        } finally {
            if (!silent && statusEl) setTimeout(() => statusEl.classList.remove('visible'), 2000);
        }
    } else {
        if (!silent && statusEl) {
            statusEl.innerHTML = "Guardado (Local)";
            setTimeout(() => statusEl.classList.remove('visible'), 2000);
        }
    }
}"""
    content = pattern_guardar.sub(replacement_guardar, content)

    # 11. Rewrite cargarProgreso
    pattern_cargar = re.compile(r'async function cargarProgreso\(user = null\) \{.*?\r?\n\s*\}\r?\n\s*\}\r?\n\}', re.DOTALL)
    replacement_cargar = """async function cargarProgreso(user = null) {
    console.log("Cargando progreso...", user ? `(user: ${user.email})` : "(sin user)");
    const statusEl = document.getElementById('save-status');

    const isSim1 = !window.currentSimulacroNum || window.currentSimulacroNum === 1;
    if (isSim1 && !currentSimulacroId) {
        currentSimulacroId = 'd15c2a06-b97f-4349-817b-14e07377a0e6';
    }

    if (window.db && user) {
        try {
            console.log("Consultando progreso en Firestore...");
            const docRef = window.db.collection('usuarios').doc(user.uid).collection('simulacros_progreso').doc(currentSimulacroId);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const data = docSnap.data();
                console.log("Progreso encontrado en Firestore");
                
                const localKey = getStorageKey();
                const localDataStr = localStorage.getItem(localKey);
                let localTimestamp = 0;
                if (localDataStr) {
                    try {
                        const localData = JSON.parse(localDataStr);
                        if (localData.timestamp) localTimestamp = new Date(localData.timestamp).getTime();
                    } catch(e) {}
                }

                const cloudTimestamp = data.updated_at ? data.updated_at.toMillis() : 0;

                if (cloudTimestamp > localTimestamp) {
                    console.log("Datos de la nube son más recientes. Sobrescribiendo local...");
                    const progressData = {
                        lastIndex: data.last_index,
                        score: data.score,
                        answers: data.progress_data || {},
                        timestamp: new Date(cloudTimestamp).toISOString(),
                        totalTime: 0
                    };
                    localStorage.setItem(localKey, JSON.stringify(progressData));
                    cargarProgresoLocal();
                } else {
                    console.log("Datos locales son más recientes o iguales. Usando local.");
                    cargarProgresoLocal();
                }
            } else {
                console.log("No hay progreso en Firestore, intentando local.");
                cargarProgresoLocal();
            }
        } catch (error) {
            console.error('Error al cargar progreso de Firestore:', error);
            cargarProgresoLocal();
        }
    } else {
        console.log("Carga local (Sin usuario/Firestore)");
        cargarProgresoLocal();
    }
}"""
    content = pattern_cargar.sub(replacement_cargar, content)
    
    # 12. Cleanup setupRealtimeSync
    content = re.sub(r'async function setupRealtimeSync\(user\) \{.*?\r?\n\s*\}\r?\n\s*\}\r?\n\s*\}\r?\n\s*\}\r?\n\s*\}\r?\n\s*\}\r?\n\}', 'async function setupRealtimeSync(user) {\n    console.log("Realtime sync (Firestore) pendiente Fase 3");\n}', content, flags=re.DOTALL)
    
    # Just in case, simpler fallback for setupRealtimeSync
    content = re.sub(r'async function setupRealtimeSync.*?\}\);.*?\}', 'async function setupRealtimeSync(user) {}', content, flags=re.DOTALL)
    
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()

