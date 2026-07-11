import { useAuth } from "../context/AuthContext";
import TeacherExamsView from "../components/examenes/TeacherExamsView";
import StudentExamsView from "../components/examenes/StudentExamsView";

export default function Examenes() {
  const { appRole } = useAuth();
  
  // Renderiza la vista de estudiante si el rol es estudiante
  if (appRole === 'estudiante' || appRole === 'ESTUDIANTE') {
    return <StudentExamsView />;
  }

  // De lo contrario (docente o admin), renderiza la vista de docente
  return <TeacherExamsView />;
}
