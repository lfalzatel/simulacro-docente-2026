import { useState } from "react";
import { FileWarning, PlusCircle, Users, Clock, Calendar } from "lucide-react";
import Swal from "sweetalert2";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export default function TeacherExamsView() {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    group: "6A"
  });

  const handleCreateExam = async () => {
    if (!form.title || !form.date || !form.time) {
      Swal.fire('Error', 'Completa todos los campos', 'error');
      return;
    }

    try {
      // 1. Crear el examen (Simulado en la colección 'examenes')
      await addDoc(collection(db, "examenes"), {
        title: form.title,
        date: form.date,
        time: form.time,
        group: form.group,
        teacherId: currentUser?.uid,
        createdAt: serverTimestamp()
      });

      // 2. Generar notificación para el grupo
      await addDoc(collection(db, "notificaciones"), {
        targetGroup: form.group,
        title: `Nuevo Examen: ${form.title}`,
        message: `Programado para el ${form.date} a las ${form.time}`,
        createdAt: serverTimestamp(),
        readBy: []
      });

      // 3. Crear Notas (Recordatorios) para el Docente
      // Recordatorio 1 semana antes
      await addDoc(collection(db, "notas"), {
        userId: currentUser?.uid,
        title: `[RECORDATORIO] Preparar examen: ${form.title}`,
        content: `Recuerda preparar el examen para el grupo ${form.group} que será el día ${form.date}.`,
        color: "#f8a5c2", // Color distinto para recordatorios
        pinned: true,
        createdAt: serverTimestamp()
      });

      // Recordatorio 1 día antes
      await addDoc(collection(db, "notas"), {
        userId: currentUser?.uid,
        title: `[¡MAÑANA!] Examen: ${form.title}`,
        content: `Mañana es el examen del grupo ${form.group} a las ${form.time}.`,
        color: "#f19066",
        pinned: true,
        createdAt: serverTimestamp()
      });

      Swal.fire('¡Éxito!', 'Examen programado, notificaciones enviadas al grupo y recordatorios creados.', 'success');
      setShowForm(false);
      setForm({ title: "", date: "", time: "", group: "6A" });

    } catch (error: any) {
      console.error(error);
      Swal.fire('Error', 'No se pudo crear el examen', 'error');
    }
  };

  if (showForm) {
    return (
      <div className="page-content fade-in" style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Programar Examen</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" placeholder="Título del examen (Ej: Matemáticas I)" 
            className="filter-search" style={{ width: '100%' }}
            value={form.title} onChange={e => setForm({...form, title: e.target.value})}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-body)', padding: '0 1rem', borderRadius: '16px' }}>
              <Calendar size={18} color="var(--text-secondary)" />
              <input 
                type="date" className="filter-search" style={{ border: 'none', background: 'transparent' }}
                value={form.date} onChange={e => setForm({...form, date: e.target.value})}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-body)', padding: '0 1rem', borderRadius: '16px' }}>
              <Clock size={18} color="var(--text-secondary)" />
              <input 
                type="time" className="filter-search" style={{ border: 'none', background: 'transparent' }}
                value={form.time} onChange={e => setForm({...form, time: e.target.value})}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-body)', padding: '0.5rem 1rem', borderRadius: '16px' }}>
            <Users size={18} color="var(--text-secondary)" style={{ marginRight: '0.5rem' }} />
            <select className="filter-select" style={{ border: 'none', background: 'transparent', flex: 1 }}
              value={form.group} onChange={e => setForm({...form, group: e.target.value})}
            >
              {['6A', '6B', '7A', '7B', '8A', '9A'].map(g => <option key={g} value={g}>Grupo {g}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleCreateExam} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Programar y Notificar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      
      <div style={{
        width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(52, 152, 219, 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3498db', marginBottom: '1.5rem',
        boxShadow: '0 8px 32px rgba(52, 152, 219, 0.15)'
      }}>
        <FileWarning size={48} strokeWidth={1.5} />
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
        Gestión de Exámenes
      </h1>
      
      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.5, marginBottom: '2rem' }}>
        Aquí podrás crear y asignar exámenes a tus grupos. Las notificaciones se enviarán automáticamente.
      </p>

      <button onClick={() => setShowForm(true)} style={{
        padding: '0.85rem 1.5rem', background: 'var(--accent-color)', color: 'white', border: 'none',
        borderRadius: '16px', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <PlusCircle size={20} />
        Crear Examen
      </button>

    </div>
  );
}
