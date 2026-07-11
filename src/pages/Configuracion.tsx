import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Configuracion() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const sections = [
    { id: "cuenta", title: "Cuenta y Perfil", color: "var(--text-primary)", content: "Opciones de cuenta y perfil." },
    { id: "notificaciones", title: "Notificaciones", color: "var(--text-primary)", content: "Preferencias de notificaciones." },
    { id: "gestion", title: "Gestión", color: "var(--text-primary)", content: "Gestión de la aplicación y recursos." },
    { id: "apariencia", title: "Apariencia", color: "var(--text-primary)", content: "Temas claros, oscuros y personalizados." },
    { id: "finanzas", title: "Finanzas", color: "var(--text-primary)", content: "Información de facturación y pagos." },
    { id: "privacidad", title: "Datos y Privacidad", color: "#ef4444", content: "Gestión de datos personales y eliminación de cuenta." }
  ];

  return (
    <div className="container fade-in" style={{ paddingBottom: '90px' }}>
      
      {/* Header aligned with the screenshot */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', marginTop: '1rem' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            background: 'transparent', border: 'none', color: 'var(--text-primary)', 
            cursor: 'pointer', padding: '0.5rem 0', display: 'flex', alignItems: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Centro de Control
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Configuración
          </h1>
        </div>
      </div>

      {/* Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {sections.map((section, index) => (
          <div key={section.id} style={{ borderBottom: index < sections.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <button 
              onClick={() => toggleSection(section.id)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem 0.5rem', background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: section.color }}>
                {section.title}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {openSection === section.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </button>
            
            {openSection === section.id && (
              <div className="fade-in" style={{ padding: '0 0.5rem 1.25rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {section.content}
                {/* Here goes the inner content for each section */}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
