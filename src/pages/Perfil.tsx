import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";

export default function Perfil() {
  const { currentUser } = useAuth();
  const [totalScore, setTotalScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    if (!currentUser) return;
    
    // Load local storage progress
    let correct = 0;
    let total = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`progreso_${currentUser.uid}`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          const answered = Object.keys(data).filter(k => k !== 'safeLastIndex' && k !== 'totalTime');
          total += answered.length;
          correct += Object.values(data).filter((v: any) => v?.isCorrect).length;
        } catch(e) {}
      }
    }
    setTotalScore({ correct, total });
  }, [currentUser]);

  const resetAllProgress = async () => {
    const res = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Se borrará TODO tu progreso local. No puedes deshacerlo.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, borrar'
    });

    if (res.isConfirmed) {
      if (!currentUser) return;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`progreso_${currentUser.uid}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      Swal.fire('¡Borrado!', 'Tu progreso se ha reiniciado.', 'success').then(() => {
        window.location.reload();
      });
    }
  };

  if (!currentUser) return <div className="page-content" style={{padding: '2rem'}}>Cargando...</div>;

  const name = currentUser.displayName || currentUser.email?.split('@')[0] || "Usuario";
  
  // Dummy calendar data
  const calendarDays = Array.from({ length: 35 }).map(() => (
    Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
  ));

  return (
    <div className="page-content fade-in">
      
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-primary)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          color: 'white', fontSize: '1.5rem', fontWeight: 700
        }}>
          {currentUser.photoURL ? (
            <img src={currentUser.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>Mi Perfil</h1>
          <p className="section-label" style={{ margin: 0 }}>{currentUser.email}</p>
        </div>
      </div>

      {/* Total Score */}
      <div className="stat-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ fontSize: '3rem' }}>🏆</div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Puntaje Global</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalScore.correct} / {totalScore.total}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Aciertos totales de todos los simulacros</div>
          </div>
        </div>
      </div>

      {/* Scoring System */}
      <div className="stat-card system-info" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--accent-primary)', fontWeight: 700 }}>ℹ️ Sistema de Puntuación</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0, 184, 148, 0.1)', borderRadius: '12px', color: '#00b894' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>+1</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Correcta</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(214, 48, 49, 0.1)', borderRadius: '12px', color: '#d63031' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>+0</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Incorrecta</div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="stat-card" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>📅 Actividad Reciente</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Días en los que has respondido preguntas.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {calendarDays.map((intensity, i) => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: '4px',
              background: intensity === 0 ? 'rgba(0,0,0,0.05)' :
                          intensity === 1 ? 'rgba(0, 206, 201, 0.3)' :
                          intensity === 2 ? 'rgba(0, 206, 201, 0.6)' : 'rgba(0, 206, 201, 1)'
            }}></div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Menos</span>
          <div style={{ width: '12px', height: '12px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px' }}></div>
          <div style={{ width: '12px', height: '12px', background: 'rgba(0,206,201,0.3)', borderRadius: '3px' }}></div>
          <div style={{ width: '12px', height: '12px', background: 'rgba(0,206,201,1)', borderRadius: '3px' }}></div>
          <span>Más</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="stat-card danger-zone" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Zona de Peligro</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Borra permanentemente tu historial y progreso local para iniciar los simulacros desde cero.
        </p>
        <button 
          onClick={resetAllProgress}
          style={{
            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444',
            padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', width: '100%',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
        >
          🗑️ Restablecer todo el progreso
        </button>
      </div>

    </div>
  );
}
