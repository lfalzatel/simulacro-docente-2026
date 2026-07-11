import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";

// Páginas (las crearemos en breve)
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import Examenes from "./pages/Examenes";
import Inicio from "./pages/Inicio";
import Perfil from "./pages/Perfil";
import Reportes from "./pages/Reportes";
import Notas from "./pages/Notas";
import Documentacion from "./pages/Documentacion";
import Configuracion from "./pages/Configuracion";
import GestionUsuarios from "./pages/GestionUsuarios";

// CSS Global (Manteniendo el tuyo)
import "./css/style.css";
import "./css/components.css";
import "./css/estudiantes.css"; // Incluye estilos de las tarjetas

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/examenes" element={<Examenes />} />
              <Route path="/gestion" element={<GestionUsuarios />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/documentacion" element={<Documentacion />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/notas" element={<Notas />} />
              
              <Route path="/" element={<Inicio />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
