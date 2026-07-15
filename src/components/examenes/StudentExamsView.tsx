import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { FileText, Clock, Calendar, CheckCircle2, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import { Lock } from "lucide-react";

export default function StudentExamsView() {
  const { currentUser } = useAuth();
  const [examenes, setExamenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for exam taking and review
  const [activeExam, setActiveExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [pointsStats, setPointsStats] = useState({ earned: 0, total: 0 });
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);
  const [estadoIntento, setEstadoIntento] = useState<'en_curso' | 'bloqueado' | 'completado'>('en_curso');
  const [infracciones, setInfracciones] = useState(0);
  const [myAttempts, setMyAttempts] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, "examenes");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let exams: any[] = [];
      snapshot.forEach((doc) => exams.push({ id: doc.id, ...doc.data() }));
      exams.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setExamenes(exams);
      setLoading(false);
    });

    const attemptsQ = query(collection(db, "respuestas_examenes"), where("studentId", "==", currentUser.uid));
    const unsubscribeAttempts = onSnapshot(attemptsQ, (snapshot) => {
      const attempts: Record<string, any> = {};
      snapshot.forEach(doc => {
        attempts[doc.data().examId] = { id: doc.id, ...doc.data() };
      });
      setMyAttempts(attempts);
    });

    return () => {
      unsubscribe();
      unsubscribeAttempts();
    };
  }, [currentUser]);

  // Listen to active response for unblocking
  useEffect(() => {
    if (!activeResponseId) return;
    const unsubscribe = onSnapshot(doc(db, "respuestas_examenes", activeResponseId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEstadoIntento(data.estado);
        setInfracciones(data.infracciones || 0);
      }
    });
    return () => unsubscribe();
  }, [activeResponseId]);

  // Anti-fraud visibility listener
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && activeExam && activeResponseId && estadoIntento === 'en_curso' && !isReviewing) {
        await updateDoc(doc(db, "respuestas_examenes", activeResponseId), {
          estado: 'bloqueado',
          infracciones: infracciones + 1
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeExam, activeResponseId, estadoIntento, infracciones, isReviewing]);

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

  const handleStartExam = async (exam: any) => {
    if (!exam.questions || exam.questions.length === 0) {
      Swal.fire('Error', 'Este examen no tiene preguntas configuradas.', 'error');
      return;
    }
    
    let processedExam = { ...exam };
    if (processedExam.randomizeOptions && processedExam.questions) {
      processedExam.questions = processedExam.questions.map((q: any) => {
        let shuffledOptions = [...q.options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        return { ...q, options: shuffledOptions };
      });
    }

    Swal.fire({
      title: 'Iniciando Examen...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const existingAttempt = myAttempts[processedExam.id];
      if (existingAttempt) {
        // Resume or review existing attempt
        setActiveResponseId(existingAttempt.id);
        setActiveExam(processedExam);
        setAnswers(existingAttempt.answers || {});
        if (existingAttempt.estado === 'completado') {
          setIsReviewing(true);
          setFinalScore(existingAttempt.score || 0);
          
          let earnedPts = 0;
          let totalPts = 0;
          processedExam.questions?.forEach((q: any) => {
            const qPts = q.points !== undefined ? Number(q.points) : 10;
            totalPts += qPts;
            if (q.type === 'checkbox') {
              const studentAns = Array.isArray(existingAttempt.answers?.[q.id]) ? existingAttempt.answers[q.id] : [];
              const correctAns = Array.isArray(q.correctOption) ? q.correctOption : [q.correctOption];
              if (studentAns.length === correctAns.length && studentAns.every((val: number) => correctAns.includes(val))) earnedPts += qPts;
            } else {
              if (existingAttempt.answers?.[q.id] === q.correctOption) earnedPts += qPts;
            }
          });
          setPointsStats({ earned: earnedPts, total: totalPts });
        } else {
          setIsReviewing(false);
        }
        Swal.close();
        return;
      }

      const attemptData = {
        examId: processedExam.id,
        examTitle: processedExam.title,
        studentId: currentUser?.uid,
        studentEmail: currentUser?.email,
        studentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || "Estudiante",
        studentLastName: currentUser?.displayName?.split(' ').slice(1).join(' ') || "Sin Apellido",
        group: processedExam.group,
        estado: 'en_curso',
        infracciones: 0,
        answers: {},
        startedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "respuestas_examenes"), attemptData);
      setActiveResponseId(docRef.id);
      setActiveExam(processedExam);
      setAnswers({});
      setIsReviewing(false);
      Swal.close();
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo iniciar el examen.', 'error');
    }
  };

  const handleSelectOption = (q: any, oId: number) => {
    if (isReviewing) return;
    if (q.type === 'checkbox') {
      setAnswers(prev => {
        const current = Array.isArray(prev[q.id]) ? prev[q.id] : [];
        if (current.includes(oId)) {
          return { ...prev, [q.id]: current.filter((id: number) => id !== oId) };
        } else {
          return { ...prev, [q.id]: [...current, oId] };
        }
      });
    } else {
      setAnswers(prev => ({ ...prev, [q.id]: oId }));
    }
  };

  const handleSubmitExam = async () => {
    const totalQuestions = activeExam.questions.length;
    const answeredCount = Object.keys(answers).length;
    
    if (answeredCount < totalQuestions) {
      Swal.fire('Atención', `Faltan ${totalQuestions - answeredCount} preguntas por responder.`, 'warning');
      return;
    }

    // Calcular nota con puntos
    let earnedPts = 0;
    let totalPts = 0;

    activeExam.questions.forEach((q: any) => {
      const qPts = q.points !== undefined ? Number(q.points) : 10;
      totalPts += qPts;
      if (q.type === 'checkbox') {
        const studentAns = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const correctAns = Array.isArray(q.correctOption) ? q.correctOption : [q.correctOption];
        const isCorrect = studentAns.length === correctAns.length && studentAns.every((val: number) => correctAns.includes(val));
        if (isCorrect) earnedPts += qPts;
      } else {
        if (answers[q.id] === q.correctOption) {
          earnedPts += qPts;
        }
      }
    });
    
    // Prevent division by zero if totalPts is 0 for some reason
    const score = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0;
    
    setFinalScore(score);
    setPointsStats({ earned: earnedPts, total: totalPts });

    Swal.fire({
      title: 'Enviando respuestas...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      if (activeResponseId) {
        await updateDoc(doc(db, "respuestas_examenes", activeResponseId), {
          estado: 'completado',
          score: score,
          answers: answers,
          submittedAt: serverTimestamp()
        });
      }

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
      <div className="page-content fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '200px' }}>
        
        {estadoIntento === 'bloqueado' && !isReviewing && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
            <Lock size={64} color="#e74c3c" style={{ marginBottom: '2rem' }} />
            <h1 style={{ color: '#e74c3c', fontFamily: 'monospace', fontSize: '2.5rem', marginBottom: '1rem' }}>EXAMEN BLOQUEADO</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px' }}>
              Se detectó un cambio de pestaña o ventana. Esta es tu infracción número {infracciones}. <br/><br/>
              Levanta la mano y espera a que el profesor te desbloquee desde su panel para continuar.
            </p>
          </div>
        )}

        <button className="flowi-btn-secondary" onClick={() => { setActiveExam(null); setActiveResponseId(null); }} style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Volver a Mis Exámenes
        </button>

        <div className="examen-card" style={{ borderTop: '8px solid var(--accent-primary)', marginBottom: '2rem' }}>
          <h1 className="flowi-title">{activeExam.title}</h1>
          <p className="flowi-subtitle" style={{ marginTop: '0.5rem' }}>{activeExam.date} · {activeExam.group}</p>
          
          {isReviewing && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(250,204,21,0.1)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
              <h2 style={{ color: 'var(--accent-primary)', fontFamily: 'monospace', fontSize: '1.5rem', margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Calificación: {finalScore}%</span>
                <span style={{ fontSize: '1rem', opacity: 0.8 }}>({pointsStats.earned}/{pointsStats.total} pts)</span>
              </h2>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeExam.questions.map((q: any, index: number) => {
            const studentAns = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] !== undefined ? [answers[q.id]] : []);
            const correctAns = Array.isArray(q.correctOption) ? q.correctOption : [q.correctOption];
            
            const isCorrect = q.type === 'checkbox' 
              ? studentAns.length === correctAns.length && studentAns.every((val: number) => correctAns.includes(val))
              : answers[q.id] === q.correctOption;

            return (
              <div key={q.id} className="examen-card" style={{ 
                padding: '1.5rem', 
                borderLeft: isReviewing ? (isCorrect ? '4px solid #00b894' : '4px solid #d63031') : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                    {index + 1}. {q.text}
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Valor: {q.points !== undefined ? q.points : 10} puntos</span>
                  </p>
                  {isReviewing && (
                    isCorrect ? <CheckCircle2 color="#00b894" /> : <XCircle color="#d63031" />
                  )}
                </div>

                {q.imageBase64 && (
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <img src={q.imageBase64} alt={`Imagen para pregunta ${index + 1}`} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {q.options.map((opt: any, optIndex: number) => {
                    const isSelected = q.type === 'checkbox' ? studentAns.includes(opt.id) : answers[q.id] === opt.id;
                    const isActuallyCorrect = q.type === 'checkbox' ? correctAns.includes(opt.id) : q.correctOption === opt.id;
                    
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
                        onClick={() => handleSelectOption(q, opt.id)}
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
                          width: '20px', height: '20px', 
                          borderRadius: q.type === 'checkbox' ? '4px' : '50%',
                          border: `2px solid ${isReviewing ? colorStyle : (isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)')}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isSelected && q.type === 'checkbox' && <CheckCircle2 size={14} color={isReviewing ? colorStyle : 'var(--accent-primary)'} />}
                          {isSelected && q.type !== 'checkbox' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isReviewing ? colorStyle : 'var(--accent-primary)' }} />}
                        </div>
                        <span style={{ fontFamily: 'monospace', color: colorStyle }}>
                          {String.fromCharCode(65 + optIndex)}) {opt.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', padding: '1rem 0' }}>
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
    <div className="page-content fade-in" style={{ padding: '1.5rem', paddingBottom: '160px' }}>
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
                  {myAttempts[exam.id]?.estado === 'completado' ? (
                    <button className="flowi-btn-primary" onClick={() => handleStartExam(exam)}>
                      VER RESULTADOS
                    </button>
                  ) : exam.isLocked ? (
                    <button className="flowi-btn-primary" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'not-allowed', opacity: 0.7 }} disabled>
                      <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                      BLOQUEADO
                    </button>
                  ) : (
                    <button className="flowi-btn-primary" onClick={() => handleStartExam(exam)}>
                      {myAttempts[exam.id] ? 'REANUDAR EXAMEN' : 'INICIAR EXAMEN'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
