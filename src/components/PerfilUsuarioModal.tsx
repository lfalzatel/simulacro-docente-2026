import { useState } from "react";
import { X, ChevronLeft } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import Swal from "sweetalert2";

export default function PerfilUsuarioModal({ user, onBack, onClose }: { user: any, onBack: () => void, onClose: () => void }) {
  const [role, setRole] = useState(user.role);
  const [grupo, setGrupo] = useState(user.grupo || "");
  const [saving, setSaving] = useState(false);

  const getInitials = (name: string) => name.substring(0, 1).toUpperCase();
  const getRandomColor = (name: string) => {
    const colors = ['#fbb117', '#ffb6c1', '#add8e6', '#f08080', '#90ee90', '#d8bfd8'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const handleRoleChange = async (newRole: string) => {
    setRole(newRole);
    if (newRole !== 'estudiante') {
      await updateFirebase(newRole, "");
    }
  };

  const handleGrupoChange = async (newGrupo: string) => {
    setGrupo(newGrupo);
    await updateFirebase(role, newGrupo);
  };

  const updateFirebase = async (newRole: string, newGrupo: string) => {
    setSaving(true);
    try {
      const updateData: any = { role: newRole, rol: newRole };
      if (newRole === 'estudiante' && newGrupo) {
        updateData.grupo = newGrupo;
      } else {
        updateData.grupo = "";
      }
      
      await updateDoc(doc(db, 'usuarios', user.id), updateData);
      
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      Toast.fire({ icon: "success", title: "Rol actualizado" });
      
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo actualizar.", "error");
    }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(8px)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="slide-up" style={{
        background: 'var(--bg-card, #f4f6f8)', width: '90%', maxWidth: '400px',
        height: '85vh', borderRadius: '24px', display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ background: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Perfil del Usuario</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            {user.foto ? (
              <img src={user.foto} alt={user.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: getRandomColor(user.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {getInitials(user.name)}
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user.email}</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#ccc' }}>Registrado: {new Date().toLocaleDateString()}</p>
          </div>

          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Rol del Sistema
            </h4>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>Nivel de acceso</span>
              <select 
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={saving}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'transparent', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)',
                  outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="free">Usuario (Free)</option>
                <option value="premium">Premium</option>
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {role === 'estudiante' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>Grupo Asignado</span>
                <select 
                  value={grupo}
                  onChange={(e) => handleGrupoChange(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border)',
                    background: 'transparent', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)',
                    outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="">Selecciona...</option>
                  {['6A', '6B', '6C', '7A', '7B', '7C', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Estadísticas de Estudio
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Simulacros</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#2ecc71' }}>12 comp.</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Promedio</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#e74c3c' }}>4.2 / 5.0</p>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Aprobados</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#e67e22' }}>85%</p>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Puntaje Total</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#2ecc71' }}>2,450 XP</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
