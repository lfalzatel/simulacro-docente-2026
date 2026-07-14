import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Bell, User, Download, Share2, Settings, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import Swal from "sweetalert2";

export function Header() {
  const { currentUser, appRole } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const { theme: activeTheme, setTheme: setActiveTheme } = useTheme();
  const isTechTheme = activeTheme === 'cyber' || activeTheme === 'kilo';
  
  const savedQuick = localStorage.getItem('evaluaseguro_quick_themes');
  const quickThemes: string[] = savedQuick ? JSON.parse(savedQuick) : ["dia", "cyber", "kilo"];

  const termLabel = (label: string) => activeTheme === 'kilo' ? '>_ ' + label.toUpperCase().replace(/\s+/g, '_') : label;

  const themesMap: Record<string, {name: string, icon: string}> = {
    dia: { name: 'Día', icon: '☀️' },
    night: { name: 'Noche', icon: '🌙' },
    glass: { name: 'Glass', icon: '💠' },
    cyber: { name: 'Cyber', icon: '🖥️' },
    kilo: { name: 'Kilo', icon: '>_' },
    aurora: { name: 'Aurora', icon: '✨' }
  };

  useEffect(() => {
    const q = query(collection(db, "notificaciones"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: any[] = [];
      snapshot.forEach(doc => notifs.push({ id: doc.id, ...doc.data() }));
      setNotificaciones(notifs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      try {
        const savedStr = localStorage.getItem('evaluaseguro_accounts');
        if (savedStr) {
          const accounts = JSON.parse(savedStr);
          // Omitir la cuenta actual
          setSavedAccounts(accounts.filter((acc: any) => acc.uid !== currentUser?.uid));
        }
      } catch (e) {}
    }
  }, [dropdownOpen, currentUser]);

  const handleSwitchAccount = async (email: string) => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        login_hint: email
      });
      await signInWithPopup(auth, provider);
      setDropdownOpen(false);
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cambiar de cuenta', 'error');
    }
  };

  const handleAddAccount = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
      navigate("/login");
    } catch (error) {
      console.error(error);
    }
  };

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
        confirmButtonColor: "var(--accent-primary)",
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
    <header className={`app-header glass ${isTechTheme ? 'header-tech' : ''}`}>
      <div className="header-left">
        <Link to="/" className="header-logo" style={{ textDecoration: 'none' }}>
          <img src="/assets/icon-192-sq.png" alt="EvaluaSeguro" className={`header-logo-img ${isTechTheme ? 'tech-rounded' : ''}`} />
          <span className={`header-logo-text ${isTechTheme ? 'tech-text-uppercase' : ''}`}>
            {isTechTheme ? 'EVALUA' : 'Evalua'}
            <span className="logo-accent">{isTechTheme ? 'SEGURO' : 'Seguro'}</span>
          </span>
        </Link>
      </div>

      <div className="header-right">
        <div style={{ position: 'relative' }}>
          <button className="header-icon-btn" aria-label="Notificaciones" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell size={20} />
            {notificaciones.length > 0 && (
              <span className="notif-badge">{notificaciones.length}</span>
            )}
          </button>
          
          {showNotifs && (
            <div className={`header-dropdown open ${isTechTheme ? 'notif-dropdown-tech' : ''}`} style={{ position: 'fixed', top: '70px', left: '0', right: '0', margin: '0 auto', width: '90vw', maxWidth: '340px', padding: '1rem', zIndex: 1000 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontFamily: isTechTheme ? 'monospace' : 'inherit' }}>{isTechTheme ? 'Notificaciones' : 'Notificaciones'}</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold', cursor: 'pointer', fontFamily: isTechTheme ? 'monospace' : 'inherit' }}>VER AJUSTES</span>
              </div>
              {notificaciones.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No tienes notificaciones.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {isTechTheme && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>Próximos 7 días</div>
                  )}
                  {notificaciones.map(n => (
                    <div key={n.id} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: isTechTheme ? '2px' : '50%', background: isTechTheme ? 'rgba(250,204,21,0.15)' : 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Clock size={16} color={isTechTheme ? 'var(--accent-primary)' : 'var(--text-primary)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0, color: isTechTheme ? 'var(--text-primary)' : 'var(--accent-color)', fontFamily: isTechTheme ? 'monospace' : 'inherit' }}>
                          {isTechTheme ? `>_ ${n.title}` : n.title}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontFamily: isTechTheme ? 'monospace' : 'inherit' }}>{n.message}</p>
                      </div>
                    </div>
                  ))}

                </div>
              )}
            </div>
          )}
        </div>

        <div className="header-profile-container" ref={dropdownRef}>
          <button 
            className={`header-profile-btn ${dropdownOpen ? 'active' : ''} ${isTechTheme ? 'header-profile-btn-tech' : ''}`} 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Menú de usuario"
          >
            <div className="header-avatar" style={{ border: isTechTheme ? '2px solid var(--accent-primary)' : 'none', borderRadius: isTechTheme ? '2px' : '50%' }}>
              {photo ? (
                <img src={photo} alt="Foto" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
              <span className={`header-username ${isTechTheme ? 'tech-text-uppercase' : ''}`} style={{ lineHeight: 1.2 }}>
                {isTechTheme ? firstName.toUpperCase() : firstName}
              </span>
              <span style={{ fontSize: '0.55rem', color: isTechTheme ? '#000' : 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 900, background: isTechTheme ? 'var(--accent-primary)' : 'var(--success-bg)', padding: '1px 4px', borderRadius: isTechTheme ? '2px' : '4px', marginTop: '1px' }}>{appRole}</span>
            </div>
            <ChevronDown size={14} />
          </button>

          <div className={`header-dropdown ${dropdownOpen ? "open" : ""}`}>
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

            <div className="dropdown-themes" style={{ display: 'block', padding: '0.5rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', padding: '4px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                {quickThemes.map(themeId => {
                  const isActive = activeTheme === themeId;
                  const theme = themesMap[themeId] || themesMap['dia'];
                  return (
                    <button 
                      key={themeId}
                      onClick={() => {
                        setActiveTheme(themeId);
                      }}
                      className={`theme-pill ${isActive ? 'active' : ''}`}
                      style={{ 
                        flex: 1,
                        background: isActive ? 'var(--accent-primary)' : 'transparent', 
                        color: isActive ? 'white' : 'var(--text-secondary)', 
                        border: 'none', 
                        borderRadius: '8px', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span style={{ fontSize: '1rem', marginBottom: '4px', fontWeight: themeId === 'kilo' ? 800 : 'normal' }}>{theme.icon}</span>
                      <span style={{ fontSize: '9px', fontWeight: 600 }}>{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="dropdown-divider"></div>

            <nav className="dropdown-nav">
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate("/perfil"); }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--glass-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={14} />
                </div>
                <span className={activeTheme === 'kilo' ? 'tech-text-uppercase' : ''}>{termLabel('Mi perfil')}</span>
              </button>
              
              <button className="dropdown-item" onClick={() => Swal.fire('Instalar', 'La instalación PWA estará disponible pronto', 'info')}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--glass-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Download size={14} color="var(--accent-primary)" />
                </div>
                <span className={activeTheme === 'kilo' ? 'tech-text-uppercase' : ''}>{termLabel('Instalar app')}</span>
              </button>
              
              <button className="dropdown-item" onClick={() => {
                const shareText = (appRole === 'profesor' || appRole === 'admin')
                  ? 'Te invito a EvaluaSeguro: gestiona exámenes por grupo y simulacros para el concurso docente.'
                  : '¡Prepárate para el concurso docente 2026 con EvaluaSeguro!';

                if (navigator.share) {
                  navigator.share({ title: 'EvaluaSeguro', text: shareText, url: 'https://evaluaseguro-31c51.web.app/' });
                } else {
                  navigator.clipboard.writeText('https://evaluaseguro-31c51.web.app/');
                  Swal.fire('¡Copiado!', 'Enlace copiado al portapapeles', 'success');
                }
              }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--glass-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Share2 size={14} />
                </div>
                <span className={activeTheme === 'kilo' ? 'tech-text-uppercase' : ''}>{termLabel('Compartir app')}</span>
              </button>
              
              <div className="dropdown-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
                    <Bell size={14} />
                  </div>
                  <span className={activeTheme === 'kilo' ? 'tech-text-uppercase' : ''}>{termLabel('Notificaciones')}</span>
                </div>
                <div style={{ width: '40px', height: '22px', background: 'var(--accent-primary)', borderRadius: '11px', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                </div>
              </div>
            </nav>

            <div className="dropdown-divider"></div>

            <nav className="dropdown-nav">
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate("/configuracion"); }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--glass-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Settings size={14} />
                </div>
                <span className={activeTheme === 'kilo' ? 'tech-text-uppercase' : ''}>{termLabel('Configuración')}</span>
              </button>
            </nav>

            <div className="dropdown-divider"></div>

            <nav className="dropdown-nav">
              {savedAccounts.map((acc, index) => (
                <button key={index} className="dropdown-item" onClick={() => handleSwitchAccount(acc.email)}>
                  <div className="header-avatar" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
                    {acc.photoURL ? <img src={acc.photoURL} alt="Foto" /> : <span>{acc.displayName.substring(0,2).toUpperCase()}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.85rem' }}>{acc.displayName}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{acc.email}</span>
                    {acc.rol && <span style={{ fontSize: '0.55rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 900, background: 'var(--success-bg)', padding: '1px 4px', borderRadius: '4px', marginTop: '2px' }}>{acc.rol}</span>}
                  </div>
                </button>
              ))}

              <button className="dropdown-item" onClick={handleAddAccount}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--glass-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={14} />
                </div>
                <span className={activeTheme === 'kilo' ? 'tech-text-uppercase' : ''}>{termLabel('Añadir Cuenta')}</span>
              </button>
            </nav>

            <div className="dropdown-divider"></div>

            <button className="dropdown-item dropdown-logout" style={{ color: 'var(--error-text)' }} onClick={handleLogout}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={14} color="var(--error-text)" />
              </div>
              <span className={activeTheme === 'kilo' ? 'tech-text-uppercase' : ''} style={{ fontWeight: isTechTheme ? 700 : 500 }}>{termLabel('Cerrar sesión')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
