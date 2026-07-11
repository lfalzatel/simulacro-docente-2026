import { FileWarning, PlusCircle } from "lucide-react";

export default function Examenes() {
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
        No hay exámenes
      </h1>
      
      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.5, marginBottom: '2rem' }}>
        Aún no se ha creado ni asignado ningún examen para los estudiantes. El módulo de creación nativa estará disponible próximamente.
      </p>

      <button style={{
        padding: '0.85rem 1.5rem', background: 'var(--accent-color)', color: 'white', border: 'none',
        borderRadius: '16px', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <PlusCircle size={20} />
        Crear Examen (Pronto)
      </button>

    </div>
  );
}
