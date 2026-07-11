import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Bell } from "lucide-react";
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

            <nav className="dropdown-nav">
              <button className="dropdown-item" onClick={() => Swal.fire('Próximamente', 'Notificaciones estarán disponibles pronto', 'info')}>
                <Bell size={18} />
                <span>Notificaciones</span>
              </button>
              <button className="dropdown-item" onClick={() => Swal.fire('Próximamente', 'Configuración de cuenta', 'info')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"></path></svg>
                <span>Configuración</span>
              </button>
              <button className="dropdown-item" onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'EvaluaSeguro', text: '¡Prepárate para el concurso docente 2026!', url: 'https://evaluaseguro-31c51.web.app/' });
                } else {
                  navigator.clipboard.writeText('https://evaluaseguro-31c51.web.app/');
                  Swal.fire('¡Copiado!', 'Enlace copiado al portapapeles', 'success');
                }
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span>Compartir App</span>
              </button>
            </nav>

            <div className="dropdown-divider"></div>

            <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
