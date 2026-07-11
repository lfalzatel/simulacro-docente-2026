import { useState, useEffect } from "react";
import { X, Shield } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import PerfilUsuarioModal from "./PerfilUsuarioModal";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  grupo: string;
  foto: string | null;
  active: boolean;
}

export default function GestionUsuariosModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

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
    });

    return () => unsub();
  }, []);

  const getInitials = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  const getRandomColor = (name: string) => {
    const colors = ['#fbb117', '#ffb6c1', '#add8e6', '#f08080', '#90ee90', '#d8bfd8'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (selectedUser) {
    return <PerfilUsuarioModal user={selectedUser} onBack={() => setSelectedUser(null)} onClose={onClose} />;
  }

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
        
        <div style={{ padding: '1.5rem', background: 'var(--bg-card, #f4f6f8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(46, 204, 113, 0.15)', color: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Gestión de Usuarios</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Administra el acceso y roles</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Cargando usuarios...</div>
          ) : (
            users.map(user => (
              <div 
                key={user.id} 
                onClick={() => setSelectedUser(user)}
                style={{
                  background: '#fff', borderRadius: '16px', padding: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {user.foto ? (
                    <img src={user.foto} alt={user.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: getRandomColor(user.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</p>
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                  fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'
                }}>
                  {user.role}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
