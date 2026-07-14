import { useState, useEffect } from "react";
import { PlusCircle, Users, Clock, Calendar, CheckCircle2, Trash2, FileSpreadsheet, List, ChevronLeft } from "lucide-react";
import Swal from "sweetalert2";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

type Option = { id: number; text: string };
type Question = { id: number; text: string; options: Option[]; correctOption: number };

export default function TeacherExamsView() {
  const { currentUser } = useAuth();
  
  // Tabs: 'dashboard' | 'create' | 'results'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'results'>('dashboard');
  
  // Data states
  const [myExams, setMyExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examResponses, setExamResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [form, setForm] = useState({ title: "", date: "", time: "", group: "6A" });
  const [questions, setQuestions] = useState<Question[]>([
    { id: Date.now(), text: "", options: [{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }, { id: 4, text: "" }], correctOption: 1 }
  ]);

  // Fetch Exams
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "examenes"), where("teacherId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exams: any[] = [];
      snapshot.forEach((doc) => exams.push({ id: doc.id, ...doc.data() }));
      setMyExams(exams);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Responses for selected exam
  useEffect(() => {
    if (!selectedExam) return;
    const q = query(collection(db, "respuestas_examenes"), where("examId", "==", selectedExam.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const responses: any[] = [];
      snapshot.forEach((doc) => responses.push({ id: doc.id, ...doc.data() }));
      
      // Ordenar por apellido alfabéticamente
      responses.sort((a, b) => {
        const nameA = (a.studentLastName || a.studentName || "").toLowerCase();
        const nameB = (b.studentLastName || b.studentName || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setExamResponses(responses);
    });
    return () => unsubscribe();
  }, [selectedExam]);


  // ---- CREATION LOGIC ----
  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now(), text: "", options: [{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }, { id: 4, text: "" }], correctOption: 1 }
    ]);
  };

  const handleRemoveQuestion = (id: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionText = (id: number, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const updateOptionText = (qId: number, oId: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.map(o => o.id === oId ? { ...o, text } : o) };
      }
      return q;
    }));
  };

  const setCorrectOption = (qId: number, oId: number) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, correctOption: oId } : q));
  };

  const handleCreateExam = async () => {
    if (!form.title || !form.date || !form.time) {
      Swal.fire('Error', 'Completa los detalles del examen', 'error');
      return;
    }

    const invalidQ = questions.find(q => !q.text.trim() || q.options.some(o => !o.text.trim()));
    if (invalidQ) {
      Swal.fire('Error', 'Todas las preguntas y opciones deben tener texto', 'error');
      return;
    }

    try {
      await addDoc(collection(db, "examenes"), {
        title: form.title,
        date: form.date,
        time: form.time,
        group: form.group,
        teacherId: currentUser?.uid,
        questions: questions,
        createdAt: serverTimestamp()
      });

      Swal.fire({
        title: '¡Examen Creado!',
        text: 'El examen se ha programado correctamente.',
        icon: 'success',
        background: '#121212', color: '#fff', confirmButtonColor: '#FACC15'
      });
      
      setActiveTab('dashboard');
      setForm({ title: "", date: "", time: "", group: "6A" });
      setQuestions([{ id: Date.now(), text: "", options: [{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }, { id: 4, text: "" }], correctOption: 1 }]);

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo crear el examen', 'error');
    }
  };


  // ---- EXPORT LOGIC ----
  const exportToCSV = () => {
    if (examResponses.length === 0) {
      Swal.fire('Atención', 'No hay respuestas para exportar', 'warning');
      return;
    }

    // Cabeceras CSV
    const headers = ["Apellidos", "Nombres", "Grupo", "Calificacion (%)", "Fecha"];
    
    const rows = examResponses.map(res => {
      const lastName = res.studentLastName || "Sin apellido";
      const name = res.studentName || "Sin nombre";
      const group = res.group || "N/A";
      const score = res.score || 0;
      
      // Format date if available
      let dateStr = "N/A";
      if (res.submittedAt?.toDate) {
        dateStr = res.submittedAt.toDate().toLocaleString();
      }

      return `"${lastName}","${name}","${group}","${score}","${dateStr}"`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Resultados_${selectedExam.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // ---- RENDER VIEWS ----

  if (activeTab === 'create') {
    return (
      <div className="page-content fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <button className="theme-btn" onClick={() => setActiveTab('dashboard')} style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', padding: '0.5rem 1rem', width: 'fit-content' }}>
          <ChevronLeft size={18} /> VOLVER
        </button>
        <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Constructor de Examen</h2>
        
        {/* Generales */}
        <div className="examen-card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
          <h3 className="section-label" style={{ marginBottom: '1rem' }}>Detalles Generales</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <input 
              type="text" placeholder="TÍTULO DEL EXAMEN" 
              className="form-input"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0 1rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <Calendar size={18} color="var(--accent-secondary)" />
                <input type="date" className="form-input" style={{ border: 'none', background: 'transparent' }} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0 1rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <Clock size={18} color="var(--accent-secondary)" />
                <input type="time" className="form-input" style={{ border: 'none', background: 'transparent', width: '100%' }} value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0 1rem', borderRadius: '4px' }}>
                <Users size={18} color="var(--accent-secondary)" style={{ marginRight: '0.5rem' }} />
                <select className="form-select" style={{ border: 'none', background: 'transparent' }} value={form.group} onChange={e => setForm({...form, group: e.target.value})}>
                  {['6A', '6B', '7A', '7B', '8A', '9A'].map(g => <option key={g} value={g}>GRUPO {g}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Preguntas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.map((q, index) => (
            <div key={q.id} className="examen-card" style={{ padding: '1.5rem', position: 'relative', borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="section-label" style={{ color: 'var(--text-primary)' }}>PREGUNTA {index + 1}</h3>
                {questions.length > 1 && (
                  <button onClick={() => handleRemoveQuestion(q.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              
              <input type="text" placeholder="Escribe la pregunta aquí..." className="form-input" style={{ marginBottom: '1rem', fontSize: '1.1rem' }} value={q.text} onChange={(e) => updateQuestionText(q.id, e.target.value)} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem' }}>
                {q.options.map((opt, optIndex) => (
                  <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div onClick={() => setCorrectOption(q.id, opt.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', border: q.correctOption === opt.id ? '2px solid var(--accent-primary)' : '2px solid var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: q.correctOption === opt.id ? 'var(--accent-primary)' : 'transparent' }}>
                      {q.correctOption === opt.id && <CheckCircle2 size={16} color="#000" />}
                    </div>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{['A','B','C','D'][optIndex]})</span>
                    <input type="text" placeholder={`Opción ${['A','B','C','D'][optIndex]}`} className="form-input" style={{ flex: 1, padding: '0.5rem', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, background: 'transparent' }} value={opt.text} onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="theme-btn" onClick={handleAddQuestion} style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}>+ AÑADIR PREGUNTA</button>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <button className="start-btn" onClick={handleCreateExam} style={{ width: '100%', padding: '1rem' }}>GUARDAR Y PUBLICAR EXAMEN</button>
        </div>
      </div>
    );
  }

  if (activeTab === 'results' && selectedExam) {
    return (
      <div className="page-content fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <button className="theme-btn" onClick={() => setActiveTab('dashboard')} style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', padding: '0.5rem 1rem', width: 'fit-content' }}>
          <ChevronLeft size={18} /> VOLVER A EXÁMENES
        </button>
        
        <div className="flowi-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="flowi-title">{selectedExam.title}</h2>
            <p className="flowi-subtitle">RESPUESTAS DEL GRUPO {selectedExam.group}</p>
          </div>
          <button className="start-btn" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            <FileSpreadsheet size={16} /> EXPORTAR CSV
          </button>
        </div>

        <div className="examen-card" style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
          {examResponses.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontFamily: 'monospace' }}>Aún no hay respuestas para este examen.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                <span>ESTUDIANTE</span>
                <span style={{ textAlign: 'center' }}>GRUPO</span>
                <span style={{ textAlign: 'right' }}>CALIFICACIÓN</span>
              </div>
              
              {examResponses.map((res, i) => (
                <div key={res.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '1rem', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)', borderRadius: '8px', alignItems: 'center', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{res.studentLastName || ""}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{res.studentName || ""}</span>
                  </div>
                  <span style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{res.group}</span>
                  <span style={{ textAlign: 'right', color: res.score >= 60 ? '#00b894' : '#d63031', fontWeight: 'bold', fontSize: '1.2rem' }}>{res.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // DEFAULT DASHBOARD
  return (
    <div className="page-content fade-in" style={{ padding: '2rem' }}>
      
      <div className="flowi-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="flowi-title">MIS EXÁMENES</h1>
          <p className="flowi-subtitle">PANEL DE DOCENTE</p>
        </div>
        <button className="start-btn" onClick={() => setActiveTab('create')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
          <PlusCircle size={18} /> CREAR EXAMEN
        </button>
      </div>
      
      <div className="flowi-simulacros-grid" style={{ marginTop: '2rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
        ) : myExams.length === 0 ? (
          <div className="flowi-sim-card">
            <div className="flowi-sim-content">
              <p style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>Aún no has creado ningún examen.</p>
            </div>
          </div>
        ) : (
          myExams.map(exam => (
            <div key={exam.id} className="flowi-sim-card" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flowi-sim-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 className="flowi-sim-title">{exam.title}</h3>
                  <span className="flowi-badge" style={{ background: 'rgba(250,204,21,0.1)', color: 'var(--accent-primary)' }}>{exam.group}</span>
                </div>
                <div className="flowi-sim-meta" style={{ gap: '1rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} /> {exam.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {exam.time}</span>
                </div>
              </div>
              <div className="flowi-sim-action" style={{ display: 'flex', gap: '0.5rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button 
                  className="flowi-btn-primary" 
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
                  onClick={() => { setSelectedExam(exam); setActiveTab('results'); }}
                >
                  <List size={16} /> VER RESULTADOS
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
