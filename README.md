# Simulacro Docente 2026 - PWA

Este proyecto es una aplicación web progresiva (PWA) diseñada para ayudar a los docentes a prepararse para el concurso de ascenso y reubicación. Incluye autenticación con Google y sincronización de progreso en la nube.

## Características

*   **PWA**: Instalable en dispositivos móviles y de escritorio. Funciona offline.
*   **Autenticación**: Inicio de sesión con Google (vía Supabase).
*   **Sincronización**: Guarda el progreso (puntaje y respuestas) en la nube para acceder desde múltiples dispositivos.
*   **Simulacro**: Cuestionario interactivo con retroalimentación inmediata.
*   **Recursos**: Enlaces a normativa vigente (Decreto 1278, Ley 115, etc.).

## Configuración Local

1.  Clona este repositorio o descarga los archivos.
2.  Asegúrate de tener los siguientes archivos en la misma carpeta:
    *   `index.html`
    *   `style.css`
    *   `app.js`
    *   `quizData.js`
    *   `manifest.json`
    *   `sw.js`
    *   `pwa_icon_192.svg`
3.  Para probar la funcionalidad PWA y Auth, necesitas un servidor local.
    *   Si usas **VS Code**, instala la extensión "Live Server" y da clic en "Go Live".
    *   O usa `npx serve` en la terminal.

## Configuración de Supabase (Google Auth)

El proyecto está configurado para usar un proyecto existente de Supabase. Para que el inicio de sesión con Google funcione:

1.  Ve a tu [Supabase Dashboard](https://supabase.com/dashboard).
2.  Selecciona el proyecto activo (coincide con la URL en `app.js`).
3.  Ve a **Authentication > Providers**.
4.  Habilita **Google**.
5.  Configura el **Client ID** y **Client Secret** (obtenidos de Google Cloud Console).
6.  En **URL Configuration** (Authentication > URL Configuration), agrega tu URL de producción (Vercel) y tu URL local (ej. `http://localhost:3000`) en "Redirect URLs".

### Solución de Problemas: "No se ha podido iniciar sesión"

Si ves el error de Google con `app_domain` en la URL:

1.  **Supabase**: Ve a Authentication > URL Configuration -> **Redirect URLs**.
    *   Asegúrate de que `http://localhost:3000` (o tu puerto actual) esté en la lista.
    *   Añade también `http://localhost:3000/**`.
2.  **Google Cloud Console**: Ve a Credentials -> OAuth 2.0 Client ID.
    *   **Authorized JavaScript origins**: Debe incluir `http://localhost:3000`.
    *   **Authorized redirect URIs**: Debe incluir `https://sqkogiitljnoaxirhrwq.supabase.co/auth/v1/callback`.

## Despliegue en Vercel

1.  Instala Vercel CLI: `npm i -g vercel`
2.  Ejecuta `vercel` en la carpeta del proyecto.
3.  Sigue las instrucciones en pantalla.
4.  Agrega la URL de tu despliegue (ej. `https://mi-proyecto.vercel.app`) a las "Redirect URLs" en Supabase.

## Estructura de Archivos

*   `app.js`: Lógica principal, manejo de Auth y Service Worker.
*   `quizData.js`: Banco de preguntas (140 preguntas).
*   `style.css`: Estilos visuales (Dark mode, Glassmorphism).
*   `sw.js`: Service Worker para caché y modo offline.
