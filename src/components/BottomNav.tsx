import { Link, useLocation } from "react-router-dom";
import { Home, FileText, Users, BarChart2, Menu } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const { appRole } = useAuth();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyber' || theme === 'kilo';

  const navItems = [
    { path: "/", id: "nav-inicio", label: "Inicio", icon: <Home size={22} /> },
    { path: "/examenes", id: "nav-examenes", label: "Exámenes", icon: <FileText size={22} /> },
    { path: "/gestion", id: "nav-estudiantes", label: "Gestión", icon: <Users size={22} /> },
    { path: "/reportes", id: "nav-reportes", label: "Reportes", icon: <BarChart2 size={22} /> },
    { path: "/menu", id: "nav-menu", label: "Menú", icon: <Menu size={22} /> },
  ].filter(item => {
    // ADMIN and DOCENTE can see Examenes and Gestion. ESTUDIANTE can see Examenes.
    if (item.path === '/gestion' && !['admin', 'ADMIN', 'docente', 'DOCENTE'].includes(appRole)) {
      return false;
    }
    if (item.path === '/examenes' && !['admin', 'ADMIN', 'docente', 'DOCENTE', 'estudiante', 'ESTUDIANTE'].includes(appRole)) {
      return false;
    }
    return true;
  });

  // We hide bottom nav on login page
  if (path === "/login") return null;

  return (
    <nav className={`bottom-nav ${isTechTheme ? 'bottom-nav-tech' : ''}`}>
      {navItems.map((item) => {
        const isActive = path === item.path || (path.startsWith(item.path) && item.path !== "/");
        return (
          <Link
            key={item.id}
            to={item.path}
            className={`bottom-nav-item ${isActive ? "active" : ""} ${isTechTheme ? 'bottom-nav-item-tech' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{isTechTheme ? item.label.toUpperCase() : item.label}</span>
            <div className="nav-ripple"></div>
          </Link>
        );
      })}
    </nav>
  );
}
