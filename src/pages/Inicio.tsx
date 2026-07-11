import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { simulacrosCatalog } from "../data/simulacrosCatalog";

export default function Inicio() {
  const { currentUser, appRole } = useAuth();
  const navigate = useNavigate();
  const firstName = currentUser?.displayName?.split(" ")[0] || "Estudiante";

  // Mock stats - in the future this will load from localStorage/Firebase
  const [stats] = useState({
    score: '-',
    answered: 0,
    time: '00:00:00',
    progress: '0%'
  });

  return (
    <div className="page-content fade-in">
      
      {/* Banner de bienvenida */}
      <div className="welcome-banner" style={{ marginBottom: '2rem' }}>
        <h1 className="welcome-title">
          ¡Hola, <span>{firstName}</span>! 👋
        </h1>
        <p className="welcome-subtitle">
          Continúa tu preparación para el concurso docente 2026. Tu progreso se guarda automáticamente.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="feature-pill">📝 200+ preguntas</span>
          <span className="feature-pill">🎯 3 Simulacros</span>
          <span className="feature-pill">☁️ Progreso en la nube</span>
          <span className="feature-pill">💡 Retroalimentación profunda</span>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="stats-grid">
        <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value">{stats.score}</div>
            <div className="stat-label">Puntaje Total</div>
        </div>
        <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value">{stats.answered}</div>
            <div className="stat-label">Preguntas Respondidas</div>
        </div>
        <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-value">{stats.time}</div>
            <div className="stat-label">Tiempo Estudiado</div>
        </div>
        <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.progress}</div>
            <div className="stat-label">Progreso Total</div>
        </div>
      </div>

      {/* Selector de análisis */}
      <div className="section-container">
        <label className="section-label">Analizar progreso de:</label>
        <select className="sim-select form-input">
          {simulacrosCatalog.map(sim => (
            <option key={sim.id} value={sim.id}>{sim.titulo}</option>
          ))}
        </select>
      </div>

      {/* Tarjetas de simulacros */}
      <div className="simulacros-section">
        <h2 className="section-title">Selecciona un Simulacro</h2>
        <div className="simulacros-grid">
          {simulacrosCatalog.map((sim) => {
            // Check access: ADMIN or FREE? If free, premium is locked.
            const userRole = (appRole || 'free').toLowerCase();
            const canAccess = !sim.es_premium || userRole === 'admin' || userRole === 'premium';
            
            // Mock percentage for now, ideally fetched from localStorage or Firebase
            const pct = 0;
            const answered = 0;

            return (
              <div key={sim.id} className={`simulacro-card ${!canAccess ? 'locked' : ''}`}>
                <div className="simulacro-card-left">
                  <div className="simulacro-card-emoji">{sim.emoji || '📋'}</div>
                  <div className="simulacro-card-title">{sim.titulo}</div>
                  <div className="simulacro-card-desc">{sim.descripcion || ''}</div>
                  <div className="simulacro-card-meta">
                    📝 {sim.preguntas} preguntas
                    {sim.es_premium ? (
                      <span> · <span className="badge-premium">PREMIUM</span></span>
                    ) : (
                      <span> · <span className="badge-free">GRATIS</span></span>
                    )}
                  </div>
                </div>
                <div className="simulacro-card-progress">
                  <div className="progress-ring-text">{pct}%</div>
                  <div className="progress-bar-mini">
                    <div className="progress-bar-mini-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                  {canAccess ? (
                    <button className="start-btn" onClick={() => navigate('/examenes')}>
                      {answered > 0 ? 'Continuar' : 'Iniciar'}
                    </button>
                  ) : (
                    <button className="start-btn locked-btn" disabled>
                      🔒 Premium
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
