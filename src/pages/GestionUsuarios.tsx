import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import Swal from "sweetalert2";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  grupo: string;
  foto: string | null;
  active: boolean;
}

export default function GestionUsuarios() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentTab, setCurrentTab] = useState("estudiantes");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("grupos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const usersData: UserData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          name: data.nombre || data.displayName || data.name || "Sin nombre",
          email: data.email || "",
          role: data.rol || data.role || "free",
          grupo: data.grupo || data.grupoId || "",
          foto: data.foto || data.photoURL || null,
          active: data.active !== false,
        });
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading users", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openRoleEditor = async (user: UserData) => {
    // Exact same logic as before for Swal
    const roles = {
      free: "FREE (Básico)",
      estudiante: "ESTUDIANTE",
      docente: "DOCENTE",
      admin: "ADMINISTRADOR",
    };

    const groupHtml = `
      <div id="swal-grupo-container" style="margin-top: 15px; text-align: left; display: ${user.role === 'estudiante' || user.grupo ? 'block' : 'none'};">
        <label style="font-size: 0.85rem; color: #666; font-weight: 600; margin-bottom: 5px; display: block;">
          GRUPO DEL ESTUDIANTE
        </label>
        <select id="swal-grupo" class="swal2-select" style="width: 100%; font-size: 14px; padding: 10px; border-radius: 12px; border: 2px solid #e0e0e0;">
          <option value="">Selecciona un grupo</option>
          ${['6A', '6B', '6C', '6D', '7A', '7B', '7C', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'].map(g => 
            `<option value="${g}" ${user.grupo === g ? 'selected' : ''}>${g}</option>`
          ).join('')}
        </select>
      </div>
    `;

    const { value: formValues } = await Swal.fire({
      title: "Editar Rol de Usuario",
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <strong style="color: #333;">Usuario:</strong> <span style="color: #666;">${user.name}</span><br>
          <strong style="color: #333;">Email:</strong> <span style="color: #666;">${user.email}</span>
        </div>
        <div style="text-align: left;">
          <label style="font-size: 0.85rem; color: #666; font-weight: 600; margin-bottom: 5px; display: block;">
            NUEVO ROL
          </label>
          <select id="swal-rol" class="swal2-select" style="width: 100%; font-size: 14px; padding: 10px; border-radius: 12px; border: 2px solid #e0e0e0;">
            ${Object.entries(roles).map(([k, v]) => `<option value="${k}" ${user.role === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        ${groupHtml}
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar Cambios",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#00cec9",
      didOpen: () => {
        const rolSelect = document.getElementById('swal-rol') as HTMLSelectElement;
        const grupoContainer = document.getElementById('swal-grupo-container');
        if (rolSelect && grupoContainer) {
          rolSelect.addEventListener('change', (e: any) => {
            grupoContainer.style.display = e.target.value === 'estudiante' ? 'block' : 'none';
          });
        }
      },
      preConfirm: () => {
        const rolSelect = document.getElementById('swal-rol') as HTMLSelectElement;
        const grupoSelect = document.getElementById('swal-grupo') as HTMLSelectElement;
        
        return {
          rol: rolSelect.value,
          grupoId: grupoSelect ? grupoSelect.value : null
        };
      }
    });

    if (formValues) {
      if (formValues.rol === 'estudiante' && !formValues.grupoId) {
        Swal.fire("Error", "Debes seleccionar un grupo para el estudiante.", "error");
        return;
      }
      
      try {
        const updateData: any = { role: formValues.rol };
        if (formValues.rol === 'estudiante' && formValues.grupoId) {
          updateData.grupo = formValues.grupoId;
        } else {
          updateData.grupo = "";
        }
        
        await updateDoc(doc(db, 'usuarios', user.id), updateData);
        Swal.fire({
          icon: 'success',
          title: 'Rol actualizado',
          showConfirmButton: false,
          timer: 1500
        });
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudo actualizar el rol.", "error");
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    // 1. Filtrar por pestaña
    if (currentTab === "estudiantes" && u.role !== "estudiante") return false;
    if (currentTab === "docentes" && u.role !== "docente") return false;
    // Si es "usuarios", muestra todos

    // 2. Filtrar por búsqueda
    const term = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
    if (!matchSearch) return false;

    // 3. Filtrar por grupo (solo si estamos en estudiantes y hay un grupo seleccionado)
    if (currentTab === "estudiantes" && groupFilter !== "grupos") {
      if (u.grupo !== groupFilter) return false;
    }

    return true;
  });

  return (
    <div className="container slide-up" style={{ padding: "0 1.5rem" }}>
      <h2 className="section-title">Gestión de Usuarios</h2>
      
      <div className="admin-tabs" style={{ marginTop: '1.5rem' }}>
        <button className={`admin-tab ${currentTab === "estudiantes" ? "active" : ""}`} onClick={() => setCurrentTab("estudiantes")}>ESTUDIANTES</button>
        <button className={`admin-tab ${currentTab === "docentes" ? "active" : ""}`} onClick={() => setCurrentTab("docentes")}>DOCENTES</button>
        <button className={`admin-tab ${currentTab === "usuarios" ? "active" : ""}`} onClick={() => setCurrentTab("usuarios")}>USUARIOS</button>
      </div>

      <div className="filters-container">
        {currentTab === "estudiantes" && (
          <div className="select-wrapper" style={{ flex: 1 }}>
            <select className="filter-select" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="grupos">TODOS LOS GRUPOS</option>
              {['6A', '6B', '6C', '6D', '7A', '7B', '7C', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        )}
        <input 
          type="text" 
          className="filter-search" 
          placeholder="🔍 Buscar por nombre o email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="users-list-container">
        {loading ? (
          <div className="empty-state-light"><p>Cargando usuarios...</p></div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state-light">
            <div className="empty-icon">👥</div>
            <h3>No hay resultados</h3>
            <p>No se encontraron usuarios con esos filtros.</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} onEdit={() => openRoleEditor(user)} />
          ))
        )}
      </div>
    </div>
  );
}

function UserCard({ user, onEdit }: { user: UserData; onEdit: () => void }) {
  const avatarSrc = user.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff&size=100`;

  return (
    <div className="user-card">
      <div className="user-avatar">
        <img src={avatarSrc} className="avatar-img" alt="Avatar" />
      </div>
      <div className="user-content">
        <div className="user-info">
          <h3 className="user-name" onClick={onEdit} style={{ cursor: 'pointer' }}>{user.name}</h3>
          <p className="user-email">{user.email}</p>
          {user.role === 'estudiante' && user.grupo && (
            <div className="user-group-badge" style={{ display: 'inline-block' }}>{user.grupo}</div>
          )}
        </div>
        <div className="user-actions">
          <button className="btn-actividad">ACTIVIDAD</button>
          <button className="btn-role-badge btn-edit" title="Cambiar Rol" onClick={onEdit}>
            <svg className="role-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span className="role-text">{user.role.toUpperCase()}</span>
          </button>
          <button className="btn-icon btn-download" title="Descargar Reporte">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
