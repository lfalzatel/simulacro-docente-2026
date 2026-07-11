import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Menu() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  const showSoon = (title: string) => {
    alert(`Próximamente: ${title} estará disponible en breve.`);
  };

  return (
    <div className="page-content fade-in" style={{ paddingBottom: '100px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Menú Principal</h1>
      </div>

      <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div 
          onClick={() => navigate('/perfil')} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(0, 206, 201, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Mi Perfil</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Información de tu cuenta</div>
        </div>

        <div 
          onClick={() => navigate('/reportes')} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(0, 206, 201, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📊</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Estadísticas</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Resumen de tu actividad</div>
        </div>
        
        <div 
          onClick={() => navigate('/reportes')} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(0, 206, 201, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📈</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reportes</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Rendimiento por categoría</div>
        </div>

        <div 
          onClick={() => navigate('/documentacion')} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(0, 184, 148, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📚</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Documentación</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Material de estudio</div>
        </div>

        <div 
          onClick={() => navigate('/configuracion')} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(0, 206, 201, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Configuración</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Ajustes de la aplicación</div>
        </div>

        <div 
          onClick={() => navigate('/notas')} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer',
            gridColumn: 'span 2'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(241, 196, 15, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📌</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notas y Recordatorios</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Guarda ideas rápidas y pendientes</div>
        </div>

        <div 
          onClick={() => showSoon('Soporte')} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(0, 206, 201, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎧</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Soporte</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Ayuda y contacto</div>
        </div>

        <div 
          onClick={handleLogout} 
          className="menu-card"
          style={{
            background: 'var(--bg-card, white)', borderRadius: '20px', padding: '1.5rem 1rem', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', 
            border: '1px solid var(--glass-border, rgba(0,0,0,0.06))', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer'
          }}
        >
          <div className="menu-icon" style={{ fontSize: '2rem', background: 'rgba(239, 68, 68, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚪</div>
          <div className="menu-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444' }}>Cerrar sesión</div>
          <div className="menu-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Salir de tu cuenta</div>
        </div>
      </div>
    </div>
  );
}
