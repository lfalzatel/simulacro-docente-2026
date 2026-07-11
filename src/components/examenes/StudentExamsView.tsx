import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { FileText, Clock, AlertCircle, PlayCircle, Calendar } from "lucide-react";
import Swal from "sweetalert2";

export default function StudentExamsView() {
  useAuth(); // Para mantener el hook si se necesita a futuro, aunque por ahora no se usa currentUser
  const [examenes, setExamenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // En una app real, leeríamos el "grupo" del estudiante desde su perfil.
  // Por ahora, asumimos que estamos consultando todos los exámenes del estudiante.
  // Como simplificación temporal para la demo, traeremos todos los exámenes.
  // Lo ideal sería: query(collection(db, "examenes"), where("group", "==", currentUserGroup))

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
    // Reset times to compare just dates
    today.setHours(0,0,0,0);
    const examDateOnly = new Date(examDate);
    examDateOnly.setHours(0,0,0,0);
    
    const diffTime = examDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays < 0) return { text: "Expirado", color: "#e74c3c", isUrgent: false };
    if (diffDays === 0) return { text: "¡Es hoy!", color: "#e74c3c", isUrgent: true };
    if (diffDays === 1) return { text: "¡Es mañana!", color: "#e67e22", isUrgent: true };
    if (diffDays <= 7) return { text: `Faltan ${diffDays} días`, color: "#f39c12", isUrgent: true };
    
    return { text: `Faltan ${diffDays} días`, color: "#2ecc71", isUrgent: false };
  };

  const handleStartExam = () => {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: 'El motor de toma de exámenes estará disponible en la siguiente actualización.',
      confirmButtonColor: '#00cec9'
    });
  };

  if (loading) {
    return <div className="page-content" style={{ padding: '2rem', textAlign: 'center' }}>Cargando exámenes...</div>;
  }

  return (
    <div className="page-content fade-in" style={{ padding: '1.5rem', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          Mis Exámenes
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Tus evaluaciones asignadas y pendientes.
        </p>
      </div>

      {examenes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#2ecc71' }}>
            <FileText size={40} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>¡Estás al día!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>No tienes ningún examen pendiente por resolver.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {examenes.map((exam) => {
            const urgency = calculateUrgency(exam.date);
            return (
              <div key={exam.id} style={{ 
                background: 'var(--bg-card)', borderRadius: '20px', padding: '1.5rem', 
                boxShadow: 'var(--shadow)', border: '1px solid var(--border)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ 
                    background: 'rgba(0,206,201,0.1)', color: '#00cec9', padding: '0.5rem', borderRadius: '12px' 
                  }}>
                    <FileText size={24} />
                  </div>
                  {urgency.text !== "Expirado" && (
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.3rem', 
                      background: `${urgency.color}15`, color: urgency.color, 
                      padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700 
                    }}>
                      {urgency.isUrgent ? <AlertCircle size={12} /> : <Clock size={12} />}
                      {urgency.text}
                    </div>
                  )}
                </div>
                
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{exam.title}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  <Calendar size={14} />
                  <span>{exam.date} • {exam.time}</span>
                </div>

                <button 
                  onClick={handleStartExam}
                  disabled={urgency.text === "Expirado"}
                  style={{ 
                    width: '100%', padding: '0.8rem', borderRadius: '12px', 
                    border: 'none', background: urgency.text === "Expirado" ? 'var(--bg-body)' : 'var(--accent-color)', 
                    color: urgency.text === "Expirado" ? 'var(--text-secondary)' : 'white', 
                    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    cursor: urgency.text === "Expirado" ? 'not-allowed' : 'pointer'
                  }}
                >
                  <PlayCircle size={18} />
                  {urgency.text === "Expirado" ? "Examen Cerrado" : "Comenzar Examen"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// Note: We used a localized Calendar component import substitute earlier, let's fix it:
// import { Calendar } from "lucide-react"; (adding it to the top)
