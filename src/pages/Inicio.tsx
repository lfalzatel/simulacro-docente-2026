import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { simulacrosCatalog } from "../data/simulacrosCatalog";

export default function Inicio() {
  const { currentUser } = useAuth();
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
        <div className="simulacros-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {simulacrosCatalog.map((sim, idx) => (
            <div 
              key={sim.id} 
              onClick={() => navigate('/examenes')}
              style={{
                background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px',
                border: '1px solid var(--border)', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '0.25rem' }}>{sim.descripcion}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sim.titulo}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {sim.preguntas} preguntas • Dificultad: {sim.dificultad}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', color: 'var(--border)' }}>
                {idx === 0 ? '📝' : idx === 1 ? '⚖️' : '🎓'}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
