import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

interface AuthContextType {
  currentUser: User | null;
  appRole: string;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  appRole: "free",
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appRole, setAppRole] = useState("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "usuarios", user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            setAppRole(data.rol || "free");
          } else {
            // First time login via google or email/password
            setAppRole("free");
            await setDoc(userRef, {
              email: user.email,
              nombre: user.displayName || "",
              rol: "free",
              foto: user.photoURL || null,
              creadoEn: serverTimestamp(),
            });
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        setAppRole("free");
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    appRole,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
