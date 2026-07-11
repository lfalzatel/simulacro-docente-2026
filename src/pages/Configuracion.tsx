import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, User, Key, Shield, Bell, Smartphone, MessageSquare, Volume2, Music, PieChart, ShieldAlert, RefreshCcw, Palette, Type, Download, Trash2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GestionUsuariosModal from "../components/GestionUsuariosModal";
import GestionTemasModal from "../components/GestionTemasModal";

export default function Configuracion() {
  const navigate = useNavigate();
  const { appRole } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>("cuenta");
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showTemasModal, setShowTemasModal] = useState(false);

  // States for toggles
  const [notifLocal, setNotifLocal] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [soundEffect, setSoundEffect] = useState(true);
  const [selectedSound, setSelectedSound] = useState("notification.mp3");

  const playSound = (soundFile: string) => {
    if (!soundEffect) return;
    const audio = new Audio(`/assets/sounds/${soundFile}`);
    audio.play().catch(e => console.log("Error playing audio", e));
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
      onClick={onChange}
      style={{
        width: '46px', height: '26px', borderRadius: '13px',
        background: checked ? '#e67e22' : '#e0e0e0', // Naranja estilo Flowi
        position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
      }}
    >
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%', background: '#fff',
        position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
        transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );

  const ItemRow = ({ icon: Icon, iconBg, iconColor, title, subtitle, rightElement, onClick, isLast, colorTitle }: any) => (
    <div 
      onClick={onClick}
      style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        padding: '1rem', borderBottom: isLast ? 'none' : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '12px', background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.95rem', color: colorTitle || 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{subtitle}</div>
        </div>
      </div>
      {rightElement && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {rightElement}
        </div>
      )}
    </div>
  );

  const Accordion = ({ id, title, color, children, isLast }: any) => (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <button 
        onClick={() => toggleSection(id)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 0.5rem', background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: color || 'var(--text-primary)' }}>
          {title}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {openSection === id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>
      
      {openSection === id && (
        <div className="fade-in" style={{ padding: '0 0.5rem 1rem 0.5rem' }}>
          <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '16px', border: '1px solid var(--glass-border, #f0f0f0)', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-content fade-in">
      
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
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
          <div className="section-label" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Centro de Control
          </div>
          <h1 className="section-title" style={{ margin: 0, letterSpacing: '-0.02em' }}>
            Configuración
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        
        <Accordion id="cuenta" title="Cuenta y Perfil">
          <ItemRow 
            icon={User} iconBg="rgba(46, 204, 113, 0.15)" iconColor="#27ae60"
            title="Mi perfil" subtitle="Editar nombre, foto y teléfono"
            rightElement="›"
          />
          <ItemRow 
            icon={Key} iconBg="rgba(52, 152, 219, 0.1)" iconColor="#3498db"
            title="Cambiar contraseña" subtitle="Enviar email de recuperación"
            rightElement={<span style={{fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px', color:'#ccc'}}>Pronto</span>}
          />
          <ItemRow 
            icon={Shield} iconBg="rgba(155, 89, 182, 0.15)" iconColor="#8e44ad"
            title="Rol de la cuenta" subtitle="Nivel de acceso actual"
            rightElement={<span style={{fontSize:'0.85rem', color:'#666'}}>{appRole}</span>}
            isLast={true}
          />
        </Accordion>

        <Accordion id="notificaciones" title="Notificaciones">
          <ItemRow 
            icon={Bell} iconBg="transparent" iconColor="#d35400"
            title="Activar Notificaciones" subtitle="Permitir alertas locales"
            rightElement={<ToggleSwitch checked={notifLocal} onChange={() => setNotifLocal(!notifLocal)} />}
          />
          <ItemRow 
            icon={Smartphone} iconBg="transparent" iconColor="#d35400"
            title="Notificación Push" subtitle="Segundo plano"
            rightElement={<ToggleSwitch checked={notifPush} onChange={() => setNotifPush(!notifPush)} />}
          />
          <ItemRow 
            icon={MessageSquare} iconBg="transparent" iconColor="#d35400"
            title="Notificación In-App" subtitle="Mensajes toast"
            rightElement={<ToggleSwitch checked={notifInApp} onChange={() => setNotifInApp(!notifInApp)} />}
          />
          <ItemRow 
            icon={Volume2} iconBg="transparent" iconColor="#d35400"
            title="Efecto de Sonido" subtitle="Reproducir tonos"
            rightElement={<ToggleSwitch checked={soundEffect} onChange={() => {
              const newValue = !soundEffect;
              setSoundEffect(newValue);
              if (newValue) {
                // Play immediately for preview
                const audio = new Audio(`/assets/sounds/${selectedSound}`);
                audio.play().catch(e => console.log(e));
              }
            }} />}
          />
          <ItemRow 
            icon={Music} iconBg="transparent" iconColor="#d35400"
            title="Tono de Alerta" subtitle="Elige tu tono preferido"
            rightElement={
              <div style={{display:'flex', alignItems:'center', gap:'0.25rem', position: 'relative'}}>
                <select 
                  value={selectedSound}
                  onChange={(e) => {
                    setSelectedSound(e.target.value);
                    playSound(e.target.value);
                  }}
                  style={{
                    appearance: 'none', background: 'transparent', border: 'none', 
                    fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer',
                    outline: 'none', paddingRight: '1rem', fontWeight: 500
                  }}
                >
                  <option value="notification.mp3">Suave (Burbuja)</option>
                  <option value="notification-sound.mp3">Clásico (Campana)</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 0, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
              </div>
            }
            isLast={true}
          />
        </Accordion>

        <Accordion id="gestion" title="Gestión">
          <ItemRow 
            icon={PieChart} iconBg="transparent" iconColor="#d35400"
            title="Gestionar Asignaturas" subtitle="Colores e iconos de áreas"
            rightElement="›"
          />
          <ItemRow 
            icon={ShieldAlert} iconBg="rgba(231, 76, 60, 0.15)" iconColor="#e74c3c"
            title="Gestionar Usuarios" subtitle="Cambiar roles y administrar accesos"
            rightElement="›"
            onClick={() => setShowUsersModal(true)}
          />
          <ItemRow 
            icon={RefreshCcw} iconBg="rgba(52, 152, 219, 0.15)" iconColor="#3498db"
            title="Restaurar Asignaturas Base" subtitle="Volver a ver las por defecto ocultas"
            rightElement="›"
            isLast={true}
          />
        </Accordion>

        <Accordion id="apariencia" title="Apariencia">
          <ItemRow 
            icon={Palette} iconBg="rgba(255, 105, 180, 0.15)" iconColor="#ff1493"
            title="Temas" subtitle="Tema activo y menú desplegable"
            rightElement="›"
            onClick={() => setShowTemasModal(true)}
          />
          <ItemRow 
            icon={Type} iconBg="rgba(255, 165, 0, 0.15)" iconColor="#ff8c00"
            title="Tamaño de texto" subtitle="Tamaño: Compacto / Normal / Grande"
            rightElement={<span style={{fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px', color:'#ccc'}}>Pronto</span>}
            isLast={true}
          />
        </Accordion>

        <Accordion id="finanzas" title="Finanzas">
          <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Información financiera PRONTO.
          </div>
        </Accordion>

        <Accordion id="privacidad" title="Datos y Privacidad" color="#e74c3c">
          <ItemRow 
            icon={Download} iconBg="rgba(52, 152, 219, 0.1)" iconColor="#3498db"
            title="Exportar mis datos" subtitle="Descargar CSV o JSON"
            rightElement={<span style={{fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px', color:'#ccc'}}>Pronto</span>}
          />
          <ItemRow 
            icon={Trash2} iconBg="rgba(230, 126, 34, 0.1)" iconColor="#e67e22"
            title="Eliminar todos los datos" subtitle="Borrar simulacros pero mantener cuenta"
            rightElement={<span style={{fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px', color:'#ccc'}}>Pronto</span>}
          />
          <ItemRow 
            icon={Lock} iconBg="rgba(231, 76, 60, 0.1)" iconColor="#e74c3c"
            colorTitle="#e74c3c"
            title="Eliminar cuenta" subtitle="Acción irreversible"
            rightElement={<span style={{fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px', color:'#f5b7b1', background: 'rgba(231,76,60,0.1)', padding:'2px 6px', borderRadius:'6px'}}>Pronto</span>}
            isLast={true}
          />
        </Accordion>

      </div>

      {showUsersModal && <GestionUsuariosModal onClose={() => setShowUsersModal(false)} />}
      {showTemasModal && <GestionTemasModal onClose={() => setShowTemasModal(false)} />}
    </div>
  );
}
