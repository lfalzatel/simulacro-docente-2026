import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { FileText, Clock, Calendar, CheckCircle2, XCircle } from "lucide-react";
import Swal from "sweetalert2";

export default function StudentExamsView() {
  const { currentUser } = useAuth();
  const [examenes, setExamenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for exam taking and review
  const [activeExam, setActiveExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "examenes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exams: any[] = [];
      snapshot.forEach((doc) => exams.push({ id: doc.id, ...doc.data() }));
      setExamenes(exams);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const calculateUrgency = (dateStr: string) => {
    const examDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const examDateOnly = new Date(examDate);
    examDateOnly.setHours(0,0,0,0);
    
    const diffTime = examDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays < 0) return { text: "EXPIRADO", color: "#e74c3c" };
    if (diffDays === 0) return { text: "HOY", color: "#e74c3c" };
    if (diffDays === 1) return { text: "MAÑANA", color: "#EAB308" };
    return { text: `EN ${diffDays} DÍAS`, color: "#2ecc71" };
  };

  const handleStartExam = (exam: any) => {
    if (!exam.questions || exam.questions.length === 0) {
      Swal.fire('Error', 'Este examen no tiene preguntas configuradas.', 'error');
      return;
    }
    setActiveExam(exam);
    setAnswers({});
    setIsReviewing(false);
  };

  const handleSelectOption = (qId: number, oId: number) => {
    if (isReviewing) return;
    setAnswers(prev => ({ ...prev, [qId]: oId }));
  };

  const handleSubmitExam = async () => {
    const totalQuestions = activeExam.questions.length;
    const answeredCount = Object.keys(answers).length;
    
    if (answeredCount < totalQuestions) {
      Swal.fire('Atención', `Faltan ${totalQuestions - answeredCount} preguntas por responder.`, 'warning');
      return;
    }

    // Calcular nota
    let correctCount = 0;
    activeExam.questions.forEach((q: any) => {
      if (answers[q.id] === q.correctOption) {
        correctCount++;
      }
    });
    const score = Math.round((correctCount / totalQuestions) * 100);
    setFinalScore(score);

    Swal.fire({
      title: 'Enviando respuestas...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // Guardar en Firebase
      await addDoc(collection(db, "respuestas_examenes"), {
        examId: activeExam.id,
        examTitle: activeExam.title,
        studentId: currentUser?.uid,
        studentEmail: currentUser?.email,
        studentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || "Estudiante",
        studentLastName: currentUser?.displayName?.split(' ').slice(1).join(' ') || "Sin Apellido", // Simple fallback
        group: activeExam.group,
        score: score,
        answers: answers,
        submittedAt: serverTimestamp()
      });

      Swal.fire({
        title: '¡Examen Enviado!',
        text: 'Tus respuestas han sido registradas.',
        icon: 'success',
        background: '#121212',
        color: '#fff',
        confirmButtonColor: '#FACC15',
        confirmButtonText: 'VER RESULTADOS'
      }).then(() => {
        setIsReviewing(true); // Cambiar a modo revisión
      });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar el examen', 'error');
    }
  };

  if (loading) {
    return <div className="page-content" style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>CARGANDO EXÁMENES...</div>;
  }

  // VISTA DEL EXAMEN ACTIVO o REVISIÓN
  if (activeExam) {
    return (
      <div className="page-content fade-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
        <div className="examen-card" style={{ borderTop: '8px solid var(--accent-primary)', marginBottom: '2rem' }}>
          <h1 className="flowi-title">{activeExam.title}</h1>
          <p className="flowi-subtitle" style={{ marginTop: '0.5rem' }}>{activeExam.date} · {activeExam.group}</p>
          
          {isReviewing && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(250,204,21,0.1)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
              <h2 style={{ color: 'var(--accent-primary)', fontFamily: 'monospace', fontSize: '1.5rem', margin: 0 }}>Calificación: {finalScore}/100</h2>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeExam.questions.map((q: any, index: number) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correctOption;

            return (
              <div key={q.id} className="examen-card" style={{ 
                padding: '1.5rem', 
                borderLeft: isReviewing ? (isCorrect ? '4px solid #00b894' : '4px solid #d63031') : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                    {index + 1}. {q.text}
                  </p>
                  {isReviewing && (
                    isCorrect ? <CheckCircle2 color="#00b894" /> : <XCircle color="#d63031" />
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {q.options.map((opt: any, optIndex: number) => {
                    const isSelected = userAnswer === opt.id;
                    const isActuallyCorrect = q.correctOption === opt.id;
                    
                    let bgStyle = 'transparent';
                    let borderStyle = '1px solid var(--glass-border)';
                    let colorStyle = 'var(--text-primary)';

                    if (isReviewing) {
                      if (isActuallyCorrect) {
                        bgStyle = 'rgba(0, 184, 148, 0.1)';
                        borderStyle = '1px solid #00b894';
                        colorStyle = '#00b894';
                      } else if (isSelected && !isActuallyCorrect) {
                        bgStyle = 'rgba(214, 48, 49, 0.1)';
                        borderStyle = '1px solid #d63031';
                        colorStyle = '#d63031';
                      } else {
                        colorStyle = 'var(--text-secondary)';
                      }
                    } else if (isSelected) {
                      bgStyle = 'rgba(250, 204, 21, 0.05)';
                      borderStyle = '1px solid var(--accent-primary)';
                      colorStyle = 'var(--accent-primary)';
                    }

                    return (
                      <div 
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '1rem', 
                          padding: '1rem', borderRadius: '8px', 
                          cursor: isReviewing ? 'default' : 'pointer',
                          border: borderStyle,
                          background: bgStyle,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          border: `2px solid ${isReviewing ? colorStyle : (isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)')}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isReviewing ? colorStyle : 'var(--accent-primary)' }} />}
                        </div>
                        <span style={{ fontFamily: 'monospace', color: colorStyle }}>
                          {['A', 'B', 'C', 'D'][optIndex]}) {opt.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          {isReviewing ? (
            <button className="start-btn" onClick={() => { setActiveExam(null); setIsReviewing(false); }} style={{ width: '100%' }}>
              VOLVER AL INICIO
            </button>
          ) : (
            <>
              <button className="flowi-btn-secondary" onClick={() => setActiveExam(null)} style={{ flex: 1 }}>
                ABANDONAR
              </button>
              <button className="start-btn" onClick={handleSubmitExam} style={{ flex: 2 }}>
                ENVIAR RESPUESTAS
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // VISTA DEL LISTADO DE EXÁMENES
  return (
    <div className="page-content fade-in" style={{ padding: '1.5rem', paddingBottom: '100px' }}>
      <div className="flowi-header-container">
        <h1 className="flowi-title">MIS EXÁMENES</h1>
        <p className="flowi-subtitle">EVALUACIONES ASIGNADAS Y PENDIENTES</p>
      </div>

      {examenes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(250, 204, 21, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-primary)' }}>
            <FileText size={40} />
          </div>
          <h3 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>¡ESTÁS AL DÍA!</h3>
          <p className="section-label">NO TIENES NINGÚN EXAMEN PENDIENTE POR RESOLVER.</p>
        </div>
      ) : (
        <div className="flowi-simulacros-grid">
          {examenes.map((exam) => {
            const urgency = calculateUrgency(exam.date);
            return (
              <div key={exam.id} className="flowi-sim-card">
                <div className="flowi-sim-content">
                  <div className="flowi-sim-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="flowi-sim-icon">📝</span>
                      <h3 className="flowi-sim-title">{exam.title.toUpperCase()}</h3>
                    </div>
                    {urgency.text !== "EXPIRADO" && (
                      <span className="flowi-badge" style={{ color: urgency.color, background: `${urgency.color}15` }}>
                        {urgency.text}
                      </span>
                    )}
                  </div>
                  <div className="flowi-sim-desc">
                    GRUPO: {exam.group}
                  </div>
                  <div className="flowi-sim-meta" style={{ gap: '1.5rem' }}>
                    <span className="flowi-sim-questions" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={14} /> {exam.date}
                    </span>
                    <span className="flowi-sim-questions" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} /> {exam.time}
                    </span>
                  </div>
                </div>
                
                <div className="flowi-sim-action">
                  <button className="flowi-btn-primary" onClick={() => handleStartExam(exam)}>
                    INICIAR EXAMEN
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
