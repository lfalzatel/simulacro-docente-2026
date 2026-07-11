// Lógica de administración de usuarios (Estudiantes, Docentes, Usuarios)

let allUsers = [];
let currentTab = 'estudiantes';

function initUsersAdmin() {
    // 1. Configurar listeners de las pestañas
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Quitar clase active de todas
            tabs.forEach(t => t.classList.remove('active'));
            // Agregar a la actual
            e.target.classList.add('active');
            
            currentTab = e.target.dataset.tab;
            
            // Mostrar/ocultar filtro de grupos
            const groupFilter = document.getElementById('filter-group-container');
            if (groupFilter) {
                groupFilter.style.display = (currentTab === 'estudiantes') ? 'block' : 'none';
            }
            
            renderUsers();
        });
    });

    // 2. Escuchar cambios en la búsqueda
    document.getElementById('search-input').addEventListener('input', renderUsers);

    // 3. Cargar usuarios desde Firestore
    loadUsers();
}

function loadUsers() {
    const db = firebase.firestore();
    
    // Escuchar cambios en tiempo real
    db.collection('usuarios').onSnapshot((snapshot) => {
        allUsers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allUsers.push({
                id: doc.id,
                name: data.displayName || data.name || 'Sin nombre',
                email: data.email || '',
                role: data.role || 'free',
                grupo: data.grupo || '',
                active: data.active !== false // Por defecto true
            });
        });
        renderUsers();
    }, (error) => {
        console.error("Error cargando usuarios: ", error);
        document.getElementById('users-list-container').innerHTML = `
            <div class="empty-state-light">
                <p>Error al cargar los usuarios. Verifica tus permisos.</p>
            </div>
        `;
    });
}

function renderUsers() {
    const container = document.getElementById('users-list-container');
    const template = document.getElementById('user-card-template');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    // Filtrar por pestaña actual
    let filteredUsers = allUsers.filter(user => {
        if (currentTab === 'estudiantes') {
            return user.role === 'estudiante';
        } else if (currentTab === 'docentes') {
            return user.role === 'profesor' || user.role === 'admin';
        } else if (currentTab === 'usuarios') {
            return user.role === 'free' || user.role === 'basico' || user.role === 'premium';
        }
        return false;
    });

    // Filtrar por búsqueda
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            user.name.toLowerCase().includes(searchTerm) || 
            user.email.toLowerCase().includes(searchTerm)
        );
    }

    container.innerHTML = '';

    if (filteredUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state-light">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <h3>No hay resultados</h3>
                <p>No se encontraron usuarios en esta categoría.</p>
            </div>
        `;
        return;
    }

    filteredUsers.forEach(user => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.user-card');
        
        clone.querySelector('.user-name').innerText = user.name;
        clone.querySelector('.user-email').innerText = user.email;
        
        // Configurar Avatar
        const avatarImg = clone.querySelector('.avatar-img');
        if (avatarImg) {
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff&size=100`;
        }
        
        // Configurar Badge de Rol
        const roleText = clone.querySelector('.role-text');
        if (roleText) {
            roleText.innerText = user.role.toUpperCase();
        }
        
        // Mostrar grupo si es estudiante
        const groupBadge = clone.querySelector('.user-group-badge');
        if (user.role === 'estudiante' && user.grupo) {
            groupBadge.innerText = user.grupo;
            groupBadge.style.display = 'inline-block';
        }

        // Botón Editar -> Cambiar Rol
        const btnEdit = clone.querySelector('.btn-edit');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => openRoleEditor(user));
        }
        
        // También hacer clic en el nombre abre el editor
        const nameLabel = clone.querySelector('.user-name');
        if (nameLabel) {
            nameLabel.addEventListener('click', () => openRoleEditor(user));
        }

        container.appendChild(clone);
    });
}

function openRoleEditor(user) {
    Swal.fire({
        title: 'Asignar Rol',
        html: `
            <p style="margin-bottom: 15px; font-size: 0.9rem;">Usuario: <strong>${user.name}</strong></p>
            <select id="swal-role" class="swal2-select" style="display: flex; margin: 0 auto; width: 80%;">
                <option value="free" ${user.role === 'free' ? 'selected' : ''}>Usuario Normal (Free)</option>
                <option value="basico" ${user.role === 'basico' ? 'selected' : ''}>Usuario Básico</option>
                <option value="premium" ${user.role === 'premium' ? 'selected' : ''}>Usuario Premium</option>
                <option value="estudiante" ${user.role === 'estudiante' ? 'selected' : ''}>Estudiante</option>
                <option value="profesor" ${user.role === 'profesor' ? 'selected' : ''}>Docente</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
            </select>
            
            <div id="group-selector-container" style="display: ${user.role === 'estudiante' ? 'block' : 'none'}; margin-top: 15px;">
                <p style="font-size: 0.9rem; margin-bottom: 5px;">Asignar a Grupo:</p>
                <select id="swal-group" class="swal2-select" style="display: flex; margin: 0 auto; width: 80%;">
                    <option value="">Seleccione un grupo...</option>
                    ${['6A', '6B', '6C', '6D', '7A', '7B', '7C', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'].map(g => 
                        `<option value="${g}" ${user.grupo === g ? 'selected' : ''}>${g}</option>`
                    ).join('')}
                </select>
            </div>
        `,
        didOpen: () => {
            const roleSelect = document.getElementById('swal-role');
            const groupContainer = document.getElementById('group-selector-container');
            
            roleSelect.addEventListener('change', (e) => {
                if (e.target.value === 'estudiante') {
                    groupContainer.style.display = 'block';
                } else {
                    groupContainer.style.display = 'none';
                }
            });
        },
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#00cec9',
        preConfirm: () => {
            const newRole = document.getElementById('swal-role').value;
            const newGroup = document.getElementById('swal-group').value;
            
            if (newRole === 'estudiante' && !newGroup) {
                Swal.showValidationMessage('Debe seleccionar un grupo para el estudiante');
                return false;
            }
            
            return { role: newRole, grupo: newRole === 'estudiante' ? newGroup : null };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            updateUserRole(user.id, result.value.role, result.value.grupo);
        }
    });
}

function updateUserRole(userId, newRole, newGroup) {
    const db = firebase.firestore();
    const updateData = {
        role: newRole,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Si hay grupo, lo actualizamos; si no, lo podemos borrar o poner null
    if (newGroup) {
        updateData.grupo = newGroup;
    } else {
        updateData.grupo = firebase.firestore.FieldValue.delete();
    }

    db.collection('usuarios').doc(userId).update(updateData)
    .then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'El rol del usuario ha sido actualizado correctamente.',
            timer: 1500,
            showConfirmButton: false
        });
    })
    .catch((error) => {
        console.error("Error al actualizar rol: ", error);
        Swal.fire('Error', 'No se pudo actualizar el rol. Verifica tus permisos.', 'error');
    });
}
