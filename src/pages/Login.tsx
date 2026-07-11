import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Credenciales inválidas'
      });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <img src="/assets/icon-192-sq.png" alt="EvaluaSeguro Logo" className="login-logo" />
          <h1 className="login-title">Evalua<span className="logo-accent">Seguro</span></h1>
          <p className="login-subtitle">Ingresa para gestionar tus simulacros</p>
        </div>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-icon" />
          Continuar con Google
        </button>

        <div className="login-divider">
          <span>O ingresa con tu correo</span>
        </div>

        <form id="login-form" onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input 
              type="email" 
              id="email" 
              placeholder="tu@correo.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Ingresar</button>
        </form>
      </div>
    </div>
  );
}
