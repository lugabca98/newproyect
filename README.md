# Vulnerable - Dating & Connection App 💕

Aplicación moderna de citas y conexiones auténticas construida con **React 19**, **TypeScript**, **Tailwind CSS**, **Express** y **Vite**.

## 🚀 Características

- **Diseño Responsivo y Elegante:** Optimizado para móviles y escritorio con animaciones fluidas (`motion/react`) y gestos tipo Tinder / Swipe.
- **Logotipo Personalizado:** Logotipo vectorial `EmbraceHeartLogo` (dos brazos abrazando un corazón).
- **Backend Integral y Seguro:**
  - Servidor Express en `server.ts`.
  - Cifrado seguro de contraseñas con **PBKDF2** (100.000 iteraciones + Salt).
  - Tokens de sesión criptográficos con `crypto.randomBytes(32)`.
  - Limitador de tasa (*Rate Limiting*) para mitigar ataques de fuerza bruta y spam.
  - Filtro estricto de privacidad para no exponer emails ni contraseñas.
- **Panel de Administración:** Gestión de usuarios, métricas en tiempo real, bloqueos/desbloqueos y registro de auditoría (*Audit Logs*).
- **Chat Interactivo en Tiempo Real:** Mensajería instantánea y simulación de respuestas contextuales.

---

## 🛠️ Instalación y Ejecución Local

### Prerrequisitos
- **Node.js** (versión 18 o superior)
- **npm** o **yarn**

### Pasos

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   cd TU_REPOSITORIO
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir en el navegador:
   `http://localhost:3000`

---

## 📦 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo con Vite + TypeScript.
- `npm run build`: Compila la aplicación para producción (frontend en `dist/` y backend en `dist/server.cjs`).
- `npm run start`: Inicia el servidor de producción compilado.
- `npm run lint`: Ejecuta el verificador de tipos de TypeScript.
