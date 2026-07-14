import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { simulacrosCatalog } from "../data/simulacrosCatalog";

export default function Inicio() {
  const { currentUser, appRole } = useAuth();
  const navigate = useNavigate();

  // Mock stats - in the future this will load from localStorage/Firebase
  const [stats] = useState({
    score: '-',
    answered: 0,
    time: '00:00:00',
    progress: '0%'
  });

  return (
    <div className="page-content fade-in">
      
      {/* Banner de bienvenida estilo Flowi */}
      <div className="flowi-header-container">
        <h1 className="flowi-title">MIS SIMULACROS</h1>
        <p className="flowi-subtitle">HISTORIAL COMPLETO DE TUS PRÁCTICAS</p>
      </div>

      {/* Tabs estilo Flowi */}
      <div className="flowi-tabs">
        <button className="flowi-tab active">TODO</button>
        <button className="flowi-tab">NUEVOS</button>
        <button className="flowi-tab">EN CURSO</button>
        <button className="flowi-tab">COMPLETADOS</button>
      </div>

      {/* Selector de análisis estilo Flowi */}
      <div className="flowi-search-bar">
        <span className="flowi-search-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <span className="flowi-search-prefix">SIM_QUERY &gt;</span>
        <select className="flowi-select">
          <option value="">TODOS LOS SIMULACROS</option>
          {simulacrosCatalog.map(sim => (
            <option key={sim.id} value={sim.id}>{sim.titulo.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Estadísticas rápidas estilo Flowi */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="flowi-total-card">
          <div className="flowi-total-header">
            <span className="flowi-trend-icon">🎯</span>
            <span className="flowi-total-label">PUNTAJE</span>
          </div>
          <div className="flowi-total-value">{stats.score}</div>
          <div className="flowi-total-sub">ACUMULADO</div>
        </div>
        
        <div className="flowi-total-card">
          <div className="flowi-total-header">
            <span className="flowi-trend-icon">📈</span>
            <span className="flowi-total-label">PREGUNTAS</span>
          </div>
          <div className="flowi-total-value">{stats.answered}</div>
          <div className="flowi-total-sub">RESPONDIDAS</div>
        </div>
        
        <div className="flowi-total-card">
          <div className="flowi-total-header">
            <span className="flowi-trend-icon">⏱️</span>
            <span className="flowi-total-label">TIEMPO</span>
          </div>
          <div className="flowi-total-value" style={{ fontSize: '1.8rem' }}>{stats.time}</div>
          <div className="flowi-total-sub">ESTUDIADO</div>
        </div>
        
        <div className="flowi-total-card">
          <div className="flowi-total-header">
            <span className="flowi-trend-icon">📊</span>
            <span className="flowi-total-label">PROGRESO</span>
          </div>
          <div className="flowi-total-value">
            {stats.progress.replace('%','')} <span className="flowi-total-currency">%</span>
          </div>
          <div className="flowi-total-sub">TOTAL</div>
        </div>
      </div>

      {/* Tarjetas de simulacros */}
      <div className="simulacros-section" style={{ marginTop: '2rem' }}>
        <div className="flowi-simulacros-grid">
          {simulacrosCatalog.map((sim) => {
            const userRole = (appRole || 'free').toLowerCase();
            const canAccess = !sim.es_premium || userRole === 'admin' || userRole === 'premium';
            const answered = 0;

            return (
              <div key={sim.id} className={`flowi-sim-card ${!canAccess ? 'locked' : ''}`}>
                <div className="flowi-sim-content">
                  <div className="flowi-sim-header">
                    <span className="flowi-sim-icon">{sim.emoji || '📋'}</span>
                    <h3 className="flowi-sim-title">{sim.titulo.toUpperCase()}</h3>
                  </div>
                  <div className="flowi-sim-desc">{sim.descripcion.toUpperCase()}</div>
                  
                  <div className="flowi-sim-meta">
                    <span className="flowi-sim-questions">📝 {sim.preguntas} PREGUNTAS</span>
                    {sim.es_premium ? (
                      <span className="flowi-badge flowi-badge-premium">PREMIUM</span>
                    ) : (
                      <span className="flowi-badge flowi-badge-free">GRATIS</span>
                    )}
                  </div>
                </div>
                
                <div className="flowi-sim-action">
                  {canAccess ? (
                    <button className="flowi-btn-primary" onClick={() => navigate('/simulacro/' + sim.id)}>
                      {answered > 0 ? 'CONTINUAR' : 'INICIAR'}
                    </button>
                  ) : (
                    <button className="flowi-btn-locked" disabled>
                      🔒 BLOQUEADO
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
