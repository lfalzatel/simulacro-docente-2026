import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { simulacrosCatalog } from '../data/simulacrosCatalog';

export default function Simulacro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const simulacro = simulacrosCatalog.find(s => s.id === id);

  if (!simulacro) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <h2>Simulacro no encontrado</h2>
        <button className="theme-btn active" onClick={() => navigate('/')}>Volver al Inicio</button>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <button 
        onClick={() => navigate('/')}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', cursor: 'pointer' }}
      >
        <ArrowLeft size={18} />
        Volver
      </button>

      <div style={{ padding: '2rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>{simulacro.titulo}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{simulacro.descripcion}</p>
        
        <div style={{ padding: '3rem 1rem', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
          <h2 style={{ opacity: 0.5, marginBottom: '1rem', fontFamily: 'monospace' }}>🚧 Zona de Evaluación 🚧</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Aquí se cargará el motor de evaluación para {simulacro.preguntas} preguntas.</p>
        </div>
      </div>
    </div>
  );
}
