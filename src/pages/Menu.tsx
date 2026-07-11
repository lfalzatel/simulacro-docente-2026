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
    <div className="page-content fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}>Menú Principal</h1>
      </div>

      <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div 
          onClick={() => navigate('/perfil')} 
          className="menu-card"
        >
          <div className="menu-icon">👤</div>
          <div className="menu-label">Mi Perfil</div>
          <div className="menu-desc">Información de tu cuenta</div>
        </div>

        <div 
          onClick={() => navigate('/reportes')} 
          className="menu-card"
        >
          <div className="menu-icon">📊</div>
          <div className="menu-label">Estadísticas</div>
          <div className="menu-desc">Resumen de tu actividad</div>
        </div>
        
        <div 
          onClick={() => navigate('/reportes')} 
          className="menu-card"
        >
          <div className="menu-icon">📈</div>
          <div className="menu-label">Reportes</div>
          <div className="menu-desc">Rendimiento por categoría</div>
        </div>

        <div 
          onClick={() => navigate('/documentacion')} 
          className="menu-card"
        >
          <div className="menu-icon">📚</div>
          <div className="menu-label">Documentación</div>
          <div className="menu-desc">Material de estudio</div>
        </div>

        <div 
          onClick={() => navigate('/configuracion')} 
          className="menu-card"
        >
          <div className="menu-icon">⚙️</div>
          <div className="menu-label">Configuración</div>
          <div className="menu-desc">Ajustes de la aplicación</div>
        </div>

        <div 
          onClick={() => navigate('/notas')} 
          className="menu-card"
        >
          <div className="menu-icon">📌</div>
          <div className="menu-label">Notas y Recordatorios</div>
          <div className="menu-desc">Guarda ideas rápidas y pendientes</div>
        </div>

        <div 
          onClick={() => showSoon('Soporte Técnico')} 
          className="menu-card"
        >
          <div className="menu-icon">🎧</div>
          <div className="menu-label">Soporte</div>
          <div className="menu-desc">Ayuda y contacto</div>
        </div>

        <div 
          onClick={handleLogout} 
          className="menu-card"
        >
          <div className="menu-icon">🚪</div>
          <div className="menu-label" style={{ color: '#ef4444' }}>Cerrar sesión</div>
          <div className="menu-desc">Salir de tu cuenta</div>
        </div>
      </div>
    </div>
  );
}
