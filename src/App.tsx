import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";

// Páginas (las crearemos en breve)
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import Examenes from "./pages/Examenes";
import Inicio from "./pages/Inicio";
import GestionUsuarios from "./pages/GestionUsuarios";

// CSS Global (Manteniendo el tuyo)
import "./css/style.css";
import "./css/components.css";
import "./css/estudiantes.css"; // Incluye estilos de las tarjetas

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/examenes" element={<Examenes />} />
            <Route path="/menu" element={<Menu />} />
            
            <Route path="/" element={<Inicio />} />
            <Route path="/gestion" element={<GestionUsuarios />} />
            
            {/* Fallback routes */}
            <Route path="/reportes" element={<div className="container" style={{padding: '2rem'}}><h2>Reportes en construcción...</h2></div>} />
            <Route path="/perfil" element={<div className="container" style={{padding: '2rem'}}><h2>Perfil en construcción...</h2></div>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
