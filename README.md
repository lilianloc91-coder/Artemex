# 🪶 Tlamatik — Pasaporte Cultural Phygital & Soberanía Artesanal

Plataforma descentralizada de **Pasaportes Culturales Físico-Digitales (Phygital)**, preservación de saberes ancestrales y comercio justo respaldada por la red blockchain **Stellar Soroban Testnet** y pagos directos en moneda local mediante **CoDi® / SPEI (`pey.mx`)**.

---

## 🚀 Guía de Inicio Rápido (Para usuarios de Antigravity)

Si eres compañero del equipo y estás trabajando con **Google Antigravity**, sigue estos pasos para descargar, configurar y ejecutar el proyecto en tu entorno local.

### 1. Clonar el Repositorio

Abre una terminal en tu computadora y clona el proyecto:

#### Opción A: Trabajar en la rama de UX/UI (`ux-ui`)
```bash
git clone -b ux-ui https://github.com/aeh-bonilla/ancestral-craft-passport.git
cd ancestral-craft-passport
```

#### Opción B: Trabajar en la rama principal (`main`)
```bash
git clone https://github.com/aeh-bonilla/ancestral-craft-passport.git
cd ancestral-craft-passport
```

*(Si utilizas autenticación por SSH en GitHub)*:
```bash
git clone git@github.com:aeh-bonilla/ancestral-craft-passport.git
cd ancestral-craft-passport
git checkout ux-ui
```

---

### 2. Abrir el Proyecto en Google Antigravity

1. Inicia **Antigravity**.
2. Ve a **File > Open Folder...** (o **Archivo > Abrir Carpeta...**) y selecciona la carpeta clonada `ancestral-craft-passport`.
3. Alternativamente, desde la terminal dentro de la carpeta:
   ```bash
   agy .
   ```
4. Antigravity cargará automáticamente las reglas de trabajo definidas en `AGENTS.md` y las herramientas del workspace.

---

### 3. Configurar Variables de Entorno

Crea el archivo `.env` local a partir de la plantilla incluida:

```bash
cp .env.example .env
```

El archivo `.env.example` ya contiene las credenciales de prueba preconfiguradas para Supabase y la pasarela de pagos CoDi / SPEI (`pey.mx`).

---

### 4. Instalar Dependencias

Ejecuta en la terminal de Antigravity:

```bash
npm install
```

---

### 5. Iniciar el Servidor de Desarrollo

Inicia la aplicación localmente:

```bash
npm run dev
```

El servidor estará disponible en:
👉 **`http://localhost:5173`** (o en el puerto asignado que Antigravity reportará en consola).

---

## 🛠️ Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo Vite con HMR. |
| `npm run build` | Compila el cliente y servidor Nitro para producción. |
| `npm run preview` | Previsualiza el bundle compilado de producción localmente. |
| `./node_modules/.bin/tsc --noEmit` | Verifica tipado estático completo con TypeScript. |

---

## 🧭 Módulos y Rutas Principales

- **`Inicio` (`/`)**: Landing page con la propuesta de valor cultural, impacto comunitario y catálogo de piezas destacadas.
- **`Verificar Pasaporte` (`/verificar`)**: Escáner universal con cámara WebRTC compatible con Mac, iOS, Android y Windows para validar códigos QR físicos y certificar el anclaje inmutable en Stellar Soroban. Incluye diagnóstico de posibles causas en piezas no registradas.
- **`Panel del Promotor` (`/panel`)**:
  - **Registro del Promotor**: Credencialización comunitaria y firma criptográfica.
  - **Catálogo de Artesanos**: Listado de maestros con vista directa a pantalla completa para dar de alta o editar artesanos con previsualización en vivo.
  - **Registro de Obras**: Listado de piezas registradas y estado de anclaje blockchain.
  - **Kits Phygital QR**: Impresión masiva de etiquetas QR para talleres artesanales.
  - **Liquidaciones SPEI**: Monitor y simulador de webhooks firmados con HMAC-SHA256 (`pey.mx`).
  - **Resumen / Métricas**: Indicadores de impacto cultural y ventas.
- **`Registro de Obra & Pasaporte Cultural` (`/registrar`)**: Formulario paso a paso con captura de galería fotográfica, sellado SHA-256 de evidencia en el navegador y anclaje en Soroban Testnet.
- **`Mercado Ético` (`/mercado`)**: Galería de compra en vivo con liquidación directa a las cuentas bancarias de los artesanos mediante CoDi® y SPEI.

---

## ⚠️ Reglas Importantes de Colaboración (`AGENTS.md`)

Este proyecto se encuentra conectado y sincronizado con **Lovable**:

1. **Nunca reescribas el historial de git publicado**:
   - Evita `git push --force`, `git rebase` o `git commit --amend` sobre commits ya subidos al remoto, ya que desincroniza el historial de Lovable y puede causar pérdida de avances.
   - Realiza siempre commits tradicionales hacia adelante (`forward commits`).
2. **Soberanía y Privacidad de Datos Bancarios**:
   - Los datos bancarios (cuenta, banco, CLABE) son de captura transitoria en el cliente.
   - En el catálogo únicamente se almacenan y muestran hashes criptográficos **SHA-256 con sal** (`salt:domain:value`), nunca valores en crudo.
3. **Internacionalización Segura (SSR)**:
   - i18next corre con instancia por renderizado y valores por defecto en español en SSR, restaurando preferencias en el navegador.

---

## 👥 Soporte y Coordinación

Si tienes dudas con la configuración de Antigravity o el flujo de Smart Contracts en Stellar, revisa la documentación en la carpeta `docs/` o consulta la guía de prueba en `docs/GUIA_JURADO_E2E.md`.
