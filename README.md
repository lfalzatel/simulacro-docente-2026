# EvaluaSeguro (Antes Simulacro Docente 2026) - PWA

Este proyecto es una plataforma web progresiva (PWA) segura diseñada para la evaluación de estudiantes y simulacros docentes. Incluye autenticación con Google mediante Firebase y un sistema anti-fraude para dispositivos móviles y de escritorio.

## Características

*   **PWA**: Instalable en dispositivos móviles y de escritorio. Funciona offline.
*   **Autenticación**: Inicio de sesión con Google (vía Firebase Auth).
*   **Anti-Fraude (Proctoring)**: 
    * Bloqueo de selección de texto y menú contextual (evita copiar/pegar).
    * Detección de salida de la aplicación (cambio de pestaña) con sistema de advertencia y anulación automática de exámenes.
*   **Simulacro**: Cuestionario interactivo con retroalimentación inmediata.
*   **Temas Personalizables**: Día, Noche, Deep Focus y Escritorio.

## Configuración Local

1.  Clona este repositorio o descarga los archivos.
2.  Asegúrate de tener los siguientes archivos en la misma carpeta:
    *   `index.html`
    *   `style.css`
    *   `app.js`
    *   `quizData.js`
    *   `manifest.json`
    *   `sw.js`
3.  Para probar la funcionalidad localmente:
    *   Si usas **VS Code**, instala la extensión "Live Server" y da clic en "Go Live".
    *   O simplemente abre el `index.html` en tu navegador.

## Configuración de Firebase (Autenticación y Base de Datos)

El proyecto está migrando de Supabase a Firebase. Para configurarlo:

1. Ve a tu consola de [Firebase](https://console.firebase.google.com/).
2. En tu proyecto (ej. `evaluaseguro-31c51`), ve a **Authentication** y habilita el proveedor **Google**.
3. Ve a **Firestore Database** y créala en modo de prueba.
4. El bloque de configuración (`firebaseConfig`) ya está integrado en el archivo `index.html`.

## Despliegue en Firebase Hosting

Para desplegar la aplicación a internet de forma gratuita y segura:

1.  **Instalar Firebase Tools**:
    ```bash
    npm install -g firebase-tools
    ```
2.  **Iniciar Sesión**:
    ```bash
    firebase login
    ```
3.  **Inicializar Proyecto**:
    ```bash
    firebase init hosting
    ```
    * Selecciona tu proyecto (`evaluaseguro`).
    * Directorio público: `.` (un punto).
    * Single-page app: `n`
    * GitHub deploys: `n`
    * Sobreescribir index.html: `n` (NO sobreescribir).
4.  **Desplegar**:
    ```bash
    firebase deploy --only hosting
    ```

## Estructura de Archivos

*   `index.html`: UI principal, inicialización de Firebase y Auth.
*   `app.js`: Lógica principal, interacción con DOM y mecánicas anti-fraude.
*   `quizData.js`: Banco de preguntas.
*   `style.css`: Estilos visuales (Dark mode, Glassmorphism, CSS Anti-selección).
*   `sw.js`: Service Worker para caché y modo offline PWA.
