import { Download, FileText, File as FileIcon } from "lucide-react";

export default function Documentacion() {
  const documents = [
    { name: "01 CARTILLA DE PREGUNTAS PRUEBA DOCENTE PEDAGÓGICA GENERAL.pdf", type: "pdf", size: "2.4 MB" },
    { name: "02 - CARTILLA DE PREGUNTAS DOCENTE PRIMARIA.pdf", type: "pdf", size: "1.8 MB" },
    { name: "Material de estudio Concurso docente 2026.docx", type: "docx", size: "850 KB" },
    { name: "Nuevos Maestros fase 2 entrega 6.2.pdf", type: "pdf", size: "3.1 MB" },
    { name: "Prueba APTITUD VERBAL 2016.pdf", type: "pdf", size: "1.2 MB" },
    { name: "Prueba Aptitud Numérica Final.pdf", type: "pdf", size: "1.5 MB" },
    { name: "prueba pedagogía con respuestas (1).pdf", type: "pdf", size: "2.0 MB" },
  ];

  const handleDownload = (name: string) => {
    // Aquí podrías enlazar directamente a la URL de Firebase Storage o public/
    // Por ahora mostramos una alerta o abrimos en otra pestaña si existiera en public/
    window.open(`/${name}`, "_blank");
  };

  return (
    <div className="container fade-in" style={{ paddingBottom: '90px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>📚 Documentación</h1>
        <p className="page-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Material de estudio, guías y pruebas anteriores.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {documents.map((doc, i) => (
          <div key={i} className="stat-card" style={{ 
            background: 'var(--glass-bg)', padding: '1rem', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                background: doc.type === 'pdf' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                color: doc.type === 'pdf' ? '#ef4444' : '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {doc.type === 'pdf' ? <FileIcon size={20} /> : <FileText size={20} />}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.name}
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.size} • Archivo {doc.type.toUpperCase()}</p>
              </div>
            </div>
            
            <button 
              onClick={() => handleDownload(doc.name)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,206,201,0.1)',
                color: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0
              }}
            >
              <Download size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
