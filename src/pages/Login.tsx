import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import "../css/login.css"; // Nuevos estilos premium

export default function Login() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Si ya está logueado, redirigir
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Registrar si es nuevo
      const userRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          nombre: user.displayName || '',
          rol: 'free',
          foto: user.photoURL || null,
          creadoEn: serverTimestamp()
        });
      }
      
      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: `Hola ${user.displayName || 'de nuevo'}`,
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        navigate("/");
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: error.message
      });
    }
  };

  return (
    <div className="login-page-container">
      {/* Fondo animado de Blobs */}
      <div className="animated-blob blob-1"></div>
      <div className="animated-blob blob-2"></div>
      <div className="animated-blob blob-3"></div>

      {/* Tarjeta de Login Glassmorphism */}
      <div className="premium-glass-card">
        <img src="/assets/icon-192-sq.png" alt="EvaluaSeguro Logo" className="login-logo" />
        <h1 className="login-title">Evalua<span className="logo-accent">Seguro</span></h1>
        <p className="login-subtitle">Ingresa de forma segura para gestionar tus simulacros</p>

        <button className="btn-google-premium" onClick={handleGoogleLogin}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-icon" />
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
