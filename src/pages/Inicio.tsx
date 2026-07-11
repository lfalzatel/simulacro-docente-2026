import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Inicio() {
  const { currentUser, appRole } = useAuth();
  const firstName = currentUser?.displayName?.split(" ")[0] || "Usuario";

  return (
    <div className="container slide-up" style={{ padding: "1.5rem" }}>
      <div className="welcome-banner glass">
        <h2>Hola, {firstName} 👋</h2>
        <p>Bienvenido a EvaluaSeguro. Tu rol actual es <strong>{appRole.toUpperCase()}</strong>.</p>
      </div>
      
      <div className="dashboard-grid">
        <Link to="/examenes" className="dash-card glass" style={{ textDecoration: 'none' }}>
          <div className="dash-icon">📝</div>
          <h3>Exámenes</h3>
          <p>Gestiona y resuelve cuestionarios</p>
        </Link>
        <Link to="/gestion" className="dash-card glass" style={{ textDecoration: 'none' }}>
          <div className="dash-icon">👥</div>
          <h3>Gestión</h3>
          <p>Administra usuarios y roles</p>
        </Link>
        <Link to="/reportes" className="dash-card glass" style={{ textDecoration: 'none' }}>
          <div className="dash-icon">📊</div>
          <h3>Reportes</h3>
          <p>Visualiza estadísticas</p>
        </Link>
      </div>

      <style>{`
        .welcome-banner {
          padding: 2rem;
          border-radius: 20px;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(0,206,201,0.1), rgba(255,255,255,0.05));
          border-left: 4px solid var(--accent-color);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .dash-card {
          padding: 1.5rem;
          border-radius: 20px;
          transition: all 0.3s ease;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .dash-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .dash-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
