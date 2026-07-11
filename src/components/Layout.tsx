import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-body)' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTop: '4px solid var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Si no está logueado y no está en /login, redirigir a /login
  if (!currentUser && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  // Si ESTÁ logueado y trata de ir a /login, redirigir a inicio
  if (currentUser && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {currentUser && <Header />}
      
      <main className="app-content">
        <Outlet />
      </main>

      {currentUser && <BottomNav />}
    </>
  );
}
