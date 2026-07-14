import { useState, useEffect } from "react";
import { PlusCircle, Users, Clock, Calendar, CheckCircle2, Trash2, FileSpreadsheet, List, ChevronLeft, ImagePlus, X, Copy, Edit2 } from "lucide-react";
import Swal from "sweetalert2";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

type Option = { id: number; text: string };
type Question = { id: number; text: string; options: Option[]; correctOption: number | number[]; points: number; imageBase64?: string; type: 'radio' | 'checkbox' };

export default function TeacherExamsView() {
  const { currentUser } = useAuth();
  
  // Tabs: 'dashboard' | 'create' | 'results'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'results'>('dashboard');
  
  // Data states
  const [myExams, setMyExams] = useState<any[]>([]);
  const [examStats, setExamStats] = useState<Record<string, { total: number, approved: number, failed: number, assigned: number }>>({});
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examResponses, setExamResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [form, setForm] = useState({ title: "", date: "", time: "", group: "6A", randomizeOptions: false });
  const [questions, setQuestions] = useState<Question[]>([
    { id: Date.now(), text: "", type: 'radio', options: [{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }, { id: 4, text: "" }], correctOption: 1, points: 10 }
  ]);

  // Fetch Exams
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "examenes"), where("teacherId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exams: any[] = [];
      snapshot.forEach((doc) => exams.push({ id: doc.id, ...doc.data() }));
      exams.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setMyExams(exams);
      setLoading(false);
      
      // Fetch stats for each exam (for the mini summary)
      exams.forEach(exam => {
        // Fetch how many students are assigned to this group
        const assignedQ = query(collection(db, "usuarios"), where("rol", "==", "estudiante"), where("grupo", "==", exam.group || "6A"));
        onSnapshot(assignedQ, (assignedSnap) => {
          const assigned = assignedSnap.docs.length;
          setExamStats(prev => {
            const current = prev[exam.id] || { total: 0, approved: 0, failed: 0, assigned: 0 };
            return { ...prev, [exam.id]: { ...current, assigned } };
          });
        });

        // Fetch how many students have taken the exam
        const statsQ = query(collection(db, "respuestas_examenes"), where("examId", "==", exam.id));
        onSnapshot(statsQ, (statsSnap) => {
          let approved = 0;
          let failed = 0;
          let total = 0;
          statsSnap.forEach(doc => {
            const data = doc.data();
            if (data.estado === 'completado' || data.score !== undefined) {
              total++;
              if ((data.score || 0) >= 60) approved++;
              else failed++;
            }
          });
          setExamStats(prev => {
            const current = prev[exam.id] || { total: 0, approved: 0, failed: 0, assigned: 0 };
            return { ...prev, [exam.id]: { ...current, total, approved, failed } };
          });
        });
      });

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

  const handleUnlockStudent = async (responseId: string) => {
    try {
      await updateDoc(doc(db, "respuestas_examenes", responseId), {
        estado: 'en_curso'
      });
      Swal.fire({ title: 'Desbloqueado', text: 'El estudiante puede continuar.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#121212', color: '#fff' });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo desbloquear', 'error');
    }
  };


  // ---- CREATION LOGIC ----
  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now(), text: "", type: 'radio', options: [{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }, { id: 4, text: "" }], correctOption: 1, points: 10 }
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
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        if (q.type === 'checkbox') {
          const current = Array.isArray(q.correctOption) ? q.correctOption : [q.correctOption];
          if (current.includes(oId)) {
            return { ...q, correctOption: current.filter(id => id !== oId) };
          } else {
            return { ...q, correctOption: [...current, oId] };
          }
        } else {
          return { ...q, correctOption: oId };
        }
      }
      return q;
    }));
  };

  const updateQuestionType = (qId: number, type: 'radio' | 'checkbox') => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        // Reset correctOption when switching types
        return { ...q, type, correctOption: type === 'checkbox' ? [1] : 1 };
      }
      return q;
    }));
  };

  const addOption = (qId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptionId = q.options.length > 0 ? Math.max(...q.options.map(o => o.id)) + 1 : 1;
        return { ...q, options: [...q.options, { id: newOptionId, text: "" }] };
      }
      return q;
    }));
  };

  const removeOption = (qId: number, oId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.filter(o => o.id !== oId) };
      }
      return q;
    }));
  };

  const updateQuestionPoints = (qId: number, points: number) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, points } : q));
  };

  const handleImageUpload = (qId: number, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to base64 JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setQuestions(questions.map(q => q.id === qId ? { ...q, imageBase64: dataUrl } : q));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (qId: number) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, imageBase64: undefined } : q));
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
      if (editingExamId) {
        await updateDoc(doc(db, "examenes", editingExamId), {
          title: form.title,
          date: form.date,
          time: form.time,
          group: form.group,
          randomizeOptions: form.randomizeOptions,
          questions: questions,
        });
        Swal.fire({ title: '¡Examen Actualizado!', text: 'Los cambios se han guardado.', icon: 'success', background: '#121212', color: '#fff', confirmButtonColor: '#FACC15' });
      } else {
        await addDoc(collection(db, "examenes"), {
          title: form.title,
          date: form.date,
          time: form.time,
          group: form.group,
          teacherId: currentUser?.uid,
          randomizeOptions: form.randomizeOptions,
          questions: questions,
          createdAt: serverTimestamp()
        });
        Swal.fire({ title: '¡Examen Creado!', text: 'El examen se ha programado correctamente.', icon: 'success', background: '#121212', color: '#fff', confirmButtonColor: '#FACC15' });
      }
      
      setActiveTab('dashboard');
      setEditingExamId(null);
      setForm({ title: "", date: "", time: "", group: "6A", randomizeOptions: false });
      setQuestions([{ id: Date.now(), text: "", type: 'radio', options: [{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }, { id: 4, text: "" }], correctOption: 1, points: 10 }]);

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar el examen', 'error');
    }
  };

  const handleEditExam = (exam: any) => {
    setEditingExamId(exam.id);
    setForm({
      title: exam.title,
      date: exam.date,
      time: exam.time,
      group: exam.group || "6A",
      randomizeOptions: exam.randomizeOptions || false
    });
    setQuestions(exam.questions || []);
    setActiveTab('create');
  };

  const handleDuplicateExam = async (exam: any) => {
    try {
      await addDoc(collection(db, "examenes"), {
        ...exam,
        id: undefined,
        title: exam.title + " (Copia)",
        createdAt: serverTimestamp()
      });
      Swal.fire({ title: '¡Examen Duplicado!', icon: 'success', background: '#121212', color: '#fff', confirmButtonColor: '#FACC15', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', 'No se pudo duplicar', 'error');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar examen?',
      text: "No podrás revertir esto. También se perderán los accesos de los estudiantes.",
      icon: 'warning',
      showCancelButton: true,
      background: '#121212', color: '#fff', confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "examenes", examId));
        Swal.fire({ title: 'Eliminado', icon: 'success', background: '#121212', color: '#fff', timer: 1500, showConfirmButton: false });
      } catch (e) {
        Swal.fire('Error', 'No se pudo eliminar', 'error');
      }
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
      <div className="page-content fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '150px' }}>
        <button className="flowi-btn-secondary" onClick={() => { setActiveTab('dashboard'); setEditingExamId(null); }} style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', padding: '0.5rem 1rem', width: 'fit-content' }}>
          <ChevronLeft size={18} /> VOLVER
        </button>
        <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>{editingExamId ? 'Editar Examen' : 'Constructor de Examen'}</h2>
        
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
                  {['6A', '6B', '6C', '6D', '7A', '7B', '7C', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'].map(g => <option key={g} value={g}>GRUPO {g}</option>)}
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer', marginTop: '1rem' }}>
              <input type="checkbox" checked={form.randomizeOptions} onChange={(e) => setForm({ ...form, randomizeOptions: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }} />
              <span>Mezclar orden de las opciones para los estudiantes</span>
            </label>
          </div>
        </div>

        {/* Preguntas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.map((q, index) => (
            <div key={q.id} className="examen-card" style={{ padding: '1.5rem', position: 'relative', borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <h3 className="section-label" style={{ color: 'var(--text-primary)', margin: 0 }}>PREGUNTA {index + 1}</h3>
                  <select 
                    className="form-input" 
                    value={q.type || 'radio'} 
                    onChange={(e) => updateQuestionType(q.id, e.target.value as 'radio' | 'checkbox')}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <option value="radio" style={{ color: '#000' }}>Varias opciones (1 correcta)</option>
                    <option value="checkbox" style={{ color: '#000' }}>Casillas (Varias correctas)</option>
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.2rem 0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>PUNTOS:</span>
                    <input type="number" min="0" className="form-input" style={{ width: '60px', padding: '0.2rem', textAlign: 'center', fontSize: '0.9rem', border: 'none', borderBottom: '1px solid var(--accent-primary)', borderRadius: 0, background: 'transparent' }} value={q.points || 0} onChange={(e) => updateQuestionPoints(q.id, parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => handleRemoveQuestion(q.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <input type="text" placeholder="Escribe la pregunta aquí..." className="form-input" style={{ flex: 1, fontSize: '1.1rem' }} value={q.text} onChange={(e) => updateQuestionText(q.id, e.target.value)} />
                <label style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                  <ImagePlus size={20} />
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if(e.target.files && e.target.files[0]) handleImageUpload(q.id, e.target.files[0]) }} />
                </label>
              </div>

              {q.imageBase64 && (
                <div style={{ position: 'relative', marginBottom: '1rem', display: 'inline-block' }}>
                  <img src={q.imageBase64} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button onClick={() => removeImage(q.id)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem' }}>
                {q.options.map((opt, optIndex) => {
                  const isChecked = q.type === 'checkbox' 
                    ? (Array.isArray(q.correctOption) && q.correctOption.includes(opt.id))
                    : q.correctOption === opt.id;
                    
                  return (
                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                      <div 
                        onClick={() => setCorrectOption(q.id, opt.id)}
                        title="Marcar como respuesta correcta"
                        style={{ 
                          width: '24px', height: '24px', 
                          borderRadius: q.type === 'checkbox' ? '4px' : '50%', 
                          border: isChecked ? '2px solid var(--accent-primary)' : '2px solid rgba(255,255,255,0.3)',
                          background: isChecked ? 'var(--accent-primary)' : 'rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isChecked && <CheckCircle2 size={16} color="#000" />}
                      </div>
                      <input type="text" placeholder={`Opción ${optIndex + 1}`} className="form-input" style={{ flex: 1, padding: '0.5rem', border: 'none', borderBottom: isChecked ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 0, background: isChecked ? 'rgba(250,204,21,0.05)' : 'transparent', fontWeight: isChecked ? 'bold' : 'normal', color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)' }} value={opt.text} onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)} />
                      {isChecked && <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', background: 'rgba(250,204,21,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>✔️ CORRECTA</span>}
                      {q.options.length > 2 && (
                        <button onClick={() => removeOption(q.id, opt.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button 
                  onClick={() => addOption(q.id)} 
                  style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', marginTop: '0.5rem', fontSize: '0.8rem' }}
                >
                  + Añadir opción
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button className="theme-btn" onClick={handleAddQuestion} style={{ padding: '0.75rem 2rem', borderRadius: '50px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
            <PlusCircle size={18} /> AÑADIR PREGUNTA
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2.5rem' }}>
          <button className="start-btn" onClick={handleCreateExam} style={{ width: '100%', padding: '1rem' }}>
            {editingExamId ? 'ACTUALIZAR EXAMEN' : 'GUARDAR Y PUBLICAR EXAMEN'}
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === 'results' && selectedExam) {
    return (
      <div className="page-content fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
        <button className="flowi-btn-secondary" onClick={() => setActiveTab('dashboard')} style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', padding: '0.5rem 1rem', width: 'fit-content' }}>
          <ChevronLeft size={18} /> VOLVER A EXÁMENES
        </button>
        
        {(() => {
          const completedResponses = examResponses.filter(r => r.estado === 'completado' || r.score !== undefined);
          const averageScore = completedResponses.length > 0 ? Math.round(completedResponses.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedResponses.length) : 0;
          const totalEvaluated = completedResponses.length;
          
          return (
            <>
              <div className="flowi-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 className="flowi-title">{selectedExam.title}</h2>
                  <p className="flowi-subtitle">RESPUESTAS DEL GRUPO {selectedExam.group}</p>
                </div>
                <button className="start-btn" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                  <FileSpreadsheet size={16} /> EXPORTAR CSV
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                <div className="examen-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,184,148,0.1)', border: '1px solid rgba(0,184,148,0.3)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Promedio General</span>
                  <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: averageScore >= 60 ? '#00b894' : '#d63031', fontFamily: 'monospace' }}>{averageScore}%</span>
                </div>
                <div className="examen-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Estudiantes Evaluados</span>
                  <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{totalEvaluated}</span>
                </div>
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
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{res.studentLastName || ""} {res.studentName || ""}</span>
                    <span style={{ color: res.estado === 'bloqueado' ? '#e74c3c' : 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {res.estado === 'completado' || res.score !== undefined ? 'Completado' : res.estado === 'bloqueado' ? `¡BLOQUEADO! (${res.infracciones || 0} avisos)` : 'En curso...'}
                    </span>
                  </div>
                  <span style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{res.group}</span>
                  <div style={{ textAlign: 'right' }}>
                    {res.estado === 'bloqueado' ? (
                      <button onClick={() => handleUnlockStudent(res.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        DESBLOQUEAR
                      </button>
                    ) : res.estado === 'en_curso' ? (
                      <span style={{ color: '#EAB308', fontWeight: 'bold' }}>--</span>
                    ) : (
                      <span style={{ color: (res.score || 0) >= 60 ? '#00b894' : '#d63031', fontWeight: 'bold', fontSize: '1.2rem' }}>{res.score || 0}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        );
        })()}
      </div>
    );
  }

  // DEFAULT DASHBOARD
  return (
    <div className="page-content fade-in" style={{ padding: '2rem', paddingBottom: '100px' }}>
      
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
          myExams.map(exam => {
            const stats = examStats[exam.id] || { total: 0, approved: 0, failed: 0 };
            const qCount = exam.questions ? exam.questions.length : 0;
            const totalPts = exam.questions ? exam.questions.reduce((acc: number, q: any) => acc + (q.points !== undefined ? Number(q.points) : 10), 0) : 0;
            
            return (
              <div key={exam.id} className="flowi-sim-card" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flowi-sim-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h3 className="flowi-sim-title">{exam.title}</h3>
                    <span className="flowi-badge" style={{ background: 'rgba(250,204,21,0.1)', color: 'var(--accent-primary)', height: 'fit-content' }}>GRUPO {exam.group}</span>
                  </div>
                  
                  <div className="flowi-sim-meta" style={{ gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} /> {exam.date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {exam.time}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><List size={14} /> {qCount} Preguntas ({totalPts} pts)</span>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ASIGNADOS</span>
                      <span style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>{stats.assigned || 0} <Users size={12} style={{ display: 'inline', opacity: 0.5 }}/></span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)' }}>EVALUADOS</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{stats.total}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#00b894' }}>APROBADOS</span>
                        <span style={{ fontWeight: 'bold', color: '#00b894' }}>{stats.approved}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#d63031' }}>REPROBADOS</span>
                        <span style={{ fontWeight: 'bold', color: '#d63031' }}>{stats.failed}</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
                <div className="flowi-sim-action" style={{ display: 'flex', gap: '0.5rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button 
                    className="flowi-btn-primary" 
                    style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
                    onClick={() => { setSelectedExam(exam); setActiveTab('results'); }}
                  >
                    <List size={16} /> RESULTADOS
                  </button>
                  <button 
                    className="flowi-btn-secondary" 
                    title="Editar"
                    style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    onClick={() => handleEditExam(exam)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="flowi-btn-secondary" 
                    title="Duplicar"
                    style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    onClick={() => handleDuplicateExam(exam)}
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    className="flowi-btn-secondary" 
                    title="Eliminar"
                    style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ff7675' }}
                    onClick={() => handleDeleteExam(exam.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
