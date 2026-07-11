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
      <div className="welcome-banner">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          ¡Hola, <span>{firstName}</span>! 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
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
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎯</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{stats.score}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Puntaje Total</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📈</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{stats.answered}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Preguntas Respondidas</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⏱️</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{stats.time}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tiempo Estudiado</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{stats.progress}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Progreso Total</div>
        </div>
      </div>

      {/* Selector de análisis */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Analizar progreso de:</label>
        <select 
          className="sim-select" 
          style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
        >
          {simulacrosCatalog.map(sim => (
            <option key={sim.id} value={sim.id}>{sim.titulo}</option>
          ))}
        </select>
      </div>

      {/* Tarjetas de simulacros */}
      <div className="simulacros-section">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Selecciona un Simulacro</h2>
        <div className="simulacros-grid">
          {simulacrosCatalog.map((sim) => {
            // Check access: ADMIN or FREE? If free, premium is locked.
            const userRole = appRole || 'FREE';
            const canAccess = !sim.es_premium || userRole === 'ADMIN';
            
            // Mock percentage for now, ideally fetched from localStorage or Firebase
            const pct = 0;
            const answered = 0;

            return (
              <div key={sim.id} className="simulacro-card" style={{ opacity: canAccess ? 1 : 0.8 }}>
                <div className="simulacro-card-left">
                  <div className="simulacro-card-emoji">{sim.emoji || '📋'}</div>
                  <div className="simulacro-card-title">{sim.titulo}</div>
                  <div className="simulacro-card-desc">{sim.descripcion || ''}</div>
                  <div className="simulacro-card-desc" style={{ marginTop: '0.35rem', fontSize: '0.72rem' }}>
                    📝 {sim.preguntas} preguntas
                    {sim.es_premium ? (
                      <span> · <span style={{ color: '#f59e0b', fontWeight: 700 }}>PREMIUM</span></span>
                    ) : (
                      <span> · <span style={{ color: '#00b894', fontWeight: 700 }}>GRATIS</span></span>
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
                    <button className="start-btn" style={{ background: '#b2bec3', cursor: 'not-allowed' }} disabled>
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
