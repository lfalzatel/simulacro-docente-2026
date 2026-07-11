# Reglas del Sistema y Permisos de Roles

## Diferencia entre Simulacros y Exámenes
Es de CRÍTICA importancia recordar la diferencia entre estos dos dominios en la aplicación:
1. **Simulacros (Ruta: `/`, Página: `Inicio.tsx`)**: Son bancos de preguntas predefinidas para la práctica de **usuarios convencionales**. 
   - Los roles `FREE` pueden verlos pero algunos están bloqueados.
   - Los roles `PREMIUM` pueden acceder a todos.
   - Los roles `ADMIN` también pueden acceder a todos.
2. **Exámenes (Ruta: `/examenes`, Página: `Examenes.tsx`) y Gestión (`/gestion`)**: Estas pestañas son exclusivas para docentes/administradores. 
   - **SOLO** los usuarios con rol `ADMIN` pueden ver estas pestañas en la barra de navegación (BottomNav).
   - Los exámenes son evaluaciones creadas y asignadas por docentes, no son simulacros públicos.

NUNCA confundir "Simulacros" con "Exámenes", ni mostrar las pestañas de Exámenes/Gestión a usuarios con rol `FREE` o `PREMIUM`.
