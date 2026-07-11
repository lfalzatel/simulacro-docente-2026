import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { simulacrosCatalog } from "../data/simulacrosCatalog";

// Módulos de datos (evitamos importarlos de golpe si fueran muy pesados, pero aquí lo haremos directo)
import { quizData1 } from "../data/quizData1";
import { quizData2 } from "../data/quizData2";
import { quizData3 } from "../data/quizData3";

export default function Examenes() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Estados del selector
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  
  // Estados del quiz
  const [quizData, setQuizData] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userProgress, setUserProgress] = useState<any>({});
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Iniciar simulacro
  const startSimulacro = (simId: string) => {
    setSelectedSimId(simId);
    let data: any[] = [];
    if (simId === 'sim1') data = quizData1.questions;
    if (simId === 'sim2') data = quizData2.questions;
    if (simId === 'sim3') data = quizData3.questions;
    
    setQuizData(data);
    
    // Cargar progreso (simplificado)
    const key = `progreso_${currentUser?.uid || 'guest'}_${simId}`;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (Object.keys(saved).length > 0) {
      setUserProgress(saved);
      const computedScore = Object.values(saved).filter((v: any) => v?.isCorrect).length;
      setScore(computedScore);
      setCurrentQuestionIndex(saved.safeLastIndex || 0);
    } else {
      setUserProgress({});
      setScore(0);
      setCurrentQuestionIndex(0);
    }
    setIsFinished(false);
    setShowHint(false);
  };

  // Guardar progreso automáticamente
  useEffect(() => {
    if (selectedSimId) {
      const key = `progreso_${currentUser?.uid || 'guest'}_${selectedSimId}`;
      const dataToSave = { ...userProgress, safeLastIndex: currentQuestionIndex };
      localStorage.setItem(key, JSON.stringify(dataToSave));
    }
  }, [userProgress, currentQuestionIndex, selectedSimId, currentUser]);

  const handleSelectAnswer = (index: number, isCorrect: boolean) => {
    if (userProgress[currentQuestionIndex] !== undefined) return; // Ya respondida

    const newProgress = { ...userProgress, [currentQuestionIndex]: { selectedIndex: index, isCorrect } };
    setUserProgress(newProgress);
    
    if (isCorrect) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    setShowHint(false);
    if (currentQuestionIndex + 1 >= quizData.length) {
      setIsFinished(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    setShowHint(false);
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  };

  const exitQuiz = () => {
    setSelectedSimId(null);
    navigate('/');
  };

  // ----------------------------------------------------
  // VISTA SI NO HAY SIMULACRO SELECCIONADO
  // ----------------------------------------------------
  if (!selectedSimId) {
    return (
      <div className="page-content fade-in">
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Mis Exámenes</h1>
        </div>
        <div className="simulacros-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {simulacrosCatalog.map(sim => (
            <div 
              key={sim.id} 
              onClick={() => startSimulacro(sim.id)}
              style={{
                background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px',
                border: '1px solid var(--border)', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{sim.titulo}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{sim.descripcion}</div>
              <button style={{
                  marginTop: '1rem', width: '100%', padding: '0.75rem', 
                  background: 'var(--accent-color)', color: 'white', border: 'none', 
                  borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
              }}>
                Iniciar / Continuar
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VISTA DE RESULTADOS
  // ----------------------------------------------------
  if (isFinished) {
    const total = quizData.length;
    const answered = Object.keys(userProgress).filter(k => k !== 'safeLastIndex').length;
    const pct = Math.round((score / total) * 100);

    return (
      <div className="results-container" style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
            width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-color)', 
            color: 'white', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 24px rgba(0,206,201,0.3)'
        }}>
            {pct}%
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>¡Resultados Listos!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Respondiste {answered} de {total} preguntas. Aciertos: {score}.
        </p>
        <button 
            onClick={() => { setUserProgress({}); setScore(0); setCurrentQuestionIndex(0); setIsFinished(false); }}
            style={{ width: '100%', padding: '1rem', background: 'var(--accent-color)', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 600, marginBottom: '0.75rem', cursor: 'pointer' }}
        >
            Reiniciar Simulacro
        </button>
        <button 
            onClick={exitQuiz}
            style={{ width: '100%', padding: '1rem', background: '#636e72', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        >
            Volver al Inicio
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // VISTA DEL EXAMEN (QUIZ)
  // ----------------------------------------------------
  const q = quizData[currentQuestionIndex];
  if (!q) return <div>Cargando...</div>;

  const total = quizData.length;
  const saved = userProgress[currentQuestionIndex];
  const isAnswered = saved !== undefined;
  const progressPct = ((currentQuestionIndex + 1) / total) * 100;

  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      {/* Quiz Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={exitQuiz} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', marginRight: '1rem' }}>⬅️</button>
        <span style={{ fontWeight: 700, flex: 1, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {simulacrosCatalog.find(s => s.id === selectedSimId)?.titulo || 'Simulacro'}
        </span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Pregunta {currentQuestionIndex + 1} de {total}</span>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '4px', background: 'var(--border)' }}>
        <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.3s ease' }}></div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Question Text */}
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          {q.question || q.questionText}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {(q.answerOptions || []).map((opt: any, idx: number) => {
            const isCorrectOption = opt.isCorrect || opt.correct;
            let btnStyle: React.CSSProperties = {
                width: '100%', textAlign: 'left', padding: '1rem', background: 'var(--bg-card)',
                border: '1.5px solid var(--border)', borderRadius: '14px', fontSize: '0.95rem',
                color: 'var(--text-primary)', cursor: isAnswered ? 'default' : 'pointer',
                transition: 'all 0.2s'
            };

            if (isAnswered) {
                if (idx === saved.selectedIndex) {
                    if (saved.isCorrect) {
                        btnStyle.borderColor = '#00b894'; btnStyle.background = 'rgba(0,184,148,0.1)'; btnStyle.color = '#00b894'; btnStyle.fontWeight = 700;
                    } else {
                        btnStyle.borderColor = '#d63031'; btnStyle.background = 'rgba(214,48,49,0.1)'; btnStyle.color = '#d63031'; btnStyle.fontWeight = 700;
                    }
                }
                if (isCorrectOption && idx !== saved.selectedIndex) {
                    btnStyle.borderColor = '#00b894'; btnStyle.background = 'rgba(0,184,148,0.1)'; btnStyle.color = '#00b894'; btnStyle.fontWeight = 700;
                }
            }

            return (
              <button 
                key={idx} 
                disabled={isAnswered}
                onClick={() => handleSelectAnswer(idx, isCorrectOption)}
                style={btnStyle}
              >
                {opt.answerText || opt.text || opt}
              </button>
            );
          })}
        </div>

        {/* Hint */}
        {showHint && q.hint && (
            <div style={{ margin: '0 0 1rem', padding: '0.75rem 1rem', background: 'rgba(253,203,110,0.15)', borderRadius: '12px', fontSize: '0.9rem', color: '#b7860b', borderLeft: '3px solid #fdcb6e' }}>
                💡 <b>Pista:</b> {q.hint}
            </div>
        )}

        {/* Rationale */}
        {isAnswered && q.rationale && (
            <div style={{ margin: '0 0 1rem', padding: '1rem', background: 'rgba(0,206,201,0.07)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, borderLeft: '3px solid var(--accent-color)' }}>
                {q.rationale}
            </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            {currentQuestionIndex > 0 && (
                <button onClick={prevQuestion} style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                    ← Anterior
                </button>
            )}
            
            {!isAnswered && q.hint && (
                <button onClick={() => setShowHint(!showHint)} style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: 'none', background: 'rgba(253,203,110,0.2)', color: '#b7860b', fontWeight: 600, cursor: 'pointer' }}>
                    Ver Pista
                </button>
            )}

            {isAnswered && (
                <button onClick={nextQuestion} style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                    {currentQuestionIndex + 1 >= total ? 'Ver Resultados' : 'Siguiente →'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
}
