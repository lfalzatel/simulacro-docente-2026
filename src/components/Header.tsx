import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Bell, User, Download, Share2, Settings, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import Swal from "sweetalert2";

export function Header() {
  const { currentUser, appRole } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "Usuario";
  const initials = displayName.substring(0, 2).toUpperCase();
  const firstName = displayName.split(" ")[0];
  const photo = currentUser?.photoURL;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cerrar sesión",
        confirmButtonColor: "#00cec9",
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="app-header glass">
      <div className="header-left">
        <Link to="/" className="header-logo" style={{ textDecoration: 'none' }}>
          <img src="/assets/icon-192-sq.png" alt="EvaluaSeguro" className="header-logo-img" />
          <span className="header-logo-text">Evalua<span className="logo-accent">Seguro</span></span>
        </Link>
      </div>

      <div className="header-right">
        <button className="header-icon-btn" aria-label="Notificaciones">
          <Bell size={20} />
          <span className="notif-badge hidden">0</span>
        </button>

        <div className="header-profile-container" ref={dropdownRef}>
          <button 
            className="header-profile-btn" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Menú de usuario"
          >
            <div className="header-avatar">
              {photo ? (
                <img src={photo} alt="Foto" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <span className="header-username">{firstName}</span>
            <ChevronDown size={14} />
          </button>

          <div className={`header-dropdown glass ${dropdownOpen ? "open" : ""}`}>
            <div className="dropdown-user-info" onClick={() => { setDropdownOpen(false); navigate("/perfil"); }}>
              <div className="dropdown-avatar-wrap">
                {photo ? (
                  <img src={photo} alt="Foto" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="dropdown-user-text">
                <div className="dropdown-name">{displayName}</div>
                <div className="dropdown-email">{currentUser?.email}</div>
                <span className="dropdown-role-badge">{appRole.toUpperCase()}</span>
              </div>
            </div>

            <div className="dropdown-divider"></div>

            <div className="dropdown-themes" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', padding: '0.5rem 1rem' }}>
              <button className="theme-pill" style={{ background: '#00cec9', color: 'white', border: 'none', borderRadius: '12px', padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '1.2rem' }}>☀️</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Día</span>
              </button>
              <button className="theme-pill" style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '1.2rem' }}>🖥️</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Cyber</span>
              </button>
              <button className="theme-pill" style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{`>_`}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Kilo</span>
              </button>
            </div>

            <div className="dropdown-divider"></div>

            <nav className="dropdown-nav">
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate("/perfil"); }}>
                <User size={18} />
                <span>Mi perfil</span>
              </button>
              
              <button className="dropdown-item" style={{ color: '#00cec9' }} onClick={() => Swal.fire('Instalar', 'La instalación PWA estará disponible pronto', 'info')}>
                <Download size={18} color="#00cec9" />
                <span>Instalar app</span>
              </button>
              
              <button className="dropdown-item" onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'EvaluaSeguro', text: '¡Prepárate para el concurso docente 2026!', url: 'https://evaluaseguro-31c51.web.app/' });
                } else {
                  navigator.clipboard.writeText('https://evaluaseguro-31c51.web.app/');
                  Swal.fire('¡Copiado!', 'Enlace copiado al portapapeles', 'success');
                }
              }}>
                <Share2 size={18} />
                <span>Compartir app</span>
              </button>
              
              <div className="dropdown-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(0,206,201,0.2)', padding: '6px', borderRadius: '8px', display: 'flex', color: '#00cec9' }}>
                    <Bell size={18} />
                  </div>
                  <span>Notificaciones</span>
                </div>
                <div style={{ width: '40px', height: '22px', background: '#00cec9', borderRadius: '11px', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                </div>
              </div>
            </nav>

            <div className="dropdown-divider"></div>

            <nav className="dropdown-nav">
              <button className="dropdown-item" onClick={() => Swal.fire('Próximamente', 'Configuración de cuenta', 'info')}>
                <Settings size={18} />
                <span>Configuración</span>
              </button>
            </nav>

            <div className="dropdown-divider"></div>

            <nav className="dropdown-nav">
              <button className="dropdown-item" onClick={() => Swal.fire('Añadir cuenta', 'Función disponible próximamente', 'info')}>
                <Plus size={18} />
                <span>Añadir Cuenta</span>
              </button>
            </nav>

            <div className="dropdown-divider"></div>

            <button className="dropdown-item dropdown-logout" style={{ color: '#ff7675' }} onClick={handleLogout}>
              <LogOut size={18} color="#ff7675" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
