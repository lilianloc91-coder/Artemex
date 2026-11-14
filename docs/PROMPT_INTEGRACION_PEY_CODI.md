# Especificación y Prompt Maestro: Integración de Pey (CoDi & SPEI Checkout)
## Plataforma Tlamatik / Ancestral Craft Passport

Este documento contiene la especificación de arquitectura, el **prompt maestro** y la matriz de aprendizajes técnicos y regulatorios para integrar la pasarela de pagos mexicana **Pey** (`pey.mx`), cubriendo cobros digitales **CoDi (Banxico)**, enlaces de pago (Payment Links) y procesamiento seguro de webhooks mediante el estándar **Standard Webhooks (Svix)**.

---

## 1. Prompt Maestro para Implementación en Nuevos Proyectos

Copia y pega el siguiente bloque en cualquier modelo de IA o pásalo al equipo de desarrollo backend:

```markdown
Actúa como un desarrollador Full Stack senior especializado en pasarelas de pago mexicanas (Banxico, SPEI y CoDi).

Necesito implementar la integración completa con Pey (https://pey.mx / https://api.pey.mx) en una aplicación web moderna (Node.js/TypeScript), cubriendo:
1. Generación de códigos QR CoDi (Cobro Digital de Banxico).
2. Generación de enlaces de pago alojados (Payment Links de Pey).
3. Consulta y sondeo de estatus de pagos (Polling).
4. Receptor de Webhooks seguro siguiendo la especificación "Standard Webhooks" (Svix) con verificación HMAC-SHA256 en tiempo constante.

Toma en cuenta las siguientes especificaciones técnicas, restricciones regulatorias y aprendizajes críticos:

---

### 1. Variables de Entorno y Configuración
El módulo debe cargar de forma segura las siguientes variables en el servidor (nunca exponer en el cliente/frontend):
- `PEY_API_KEY`: Llave secreta emitida por Pey (`sk_live_...` o `sk_test_...`).
- `PEY_WEBHOOK_SECRET`: Secreto del webhook con prefijo (`whsec_...`).
- `PEY_API_BASE_URL`: URL base de la API (por defecto: `https://api.pey.mx`).
- `PEY_BANK_ACCOUNT_ID` (opcional): Identificador de la cuenta bancaria destino en Pey.

---

### 2. Reglas Estrictas de Banxico para CoDi (Gotchas Críticos)
Banxico rechaza o corrompe cobros CoDi si no se sanitizan los campos. Implementa una función auxiliar `buildCodiConceptAndRef`:
1. **Concepto (`concept`)**:
   - Longitud máxima: 40 caracteres ASCII planos.
   - Debe remover acentos, diacríticos y caracteres especiales: `normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 -]/g, "")`.
2. **Referencia Numérica (`numRef`)**:
   - Estrictamente numérico, entre 1 y 7 dígitos (ej. extraer solo dígitos del ID del pedido/obra: `id.replace(/\D/g, "").slice(0, 7)`).
3. **Monto (`amount`)**:
   - Debe ser un número con máximo 2 decimales (`Number(amount.toFixed(2))`) y valor mínimo de $1.00 MXN.

---

### 3. Servicios del Backend a Implementar

#### A. Generar QR CoDi (`POST /codi/qr`)
- Endpoint: `https://api.pey.mx/codi/qr`
- Headers: `Authorization: Bearer <PEY_API_KEY>`, `Content-Type: application/json`.
- Body:
  ```json
  {
    "amount": 1850.00,
    "concept": "Tlamatik TK0701 Rebozo Tradicional",
    "expiration": 600,
    "numRef": "701",
    "generateImage": true,
    "bankAccountId": "<OPCIONAL>"
  }
  ```
- Retorno esperado: `id`, `qrString` (cadena para renderizar SVG/Canvas), `qrImage` (data URI base64) y tiempo de expiración.
- **Fallback resiliente**: Si no hay API key configurada o falla la red, debe generar un payload determinista compatible con la especificación de Banxico (`TYP: 20`, `IDC`, `AMO`, `REF`, `DES`, `BEN: { NAM, ACC, BNK }`).

#### B. Generar Payment Link (`POST /payment-link/create`)
- Endpoint: `https://api.pey.mx/payment-link/create`
- Body:
  ```json
  {
    "amount": 1850.00,
    "successUrl": "https://miapp.com/orden/exitosa?id=...",
    "backUrl": "https://miapp.com/catalogo",
    "hasTip": false,
    "clientReferenceId": "TK-0701",
    "metadata": { "orderId": "TK-0701", "customerEmail": "..." }
  }
  ```
- Retorno esperado: `id` y `url` de checkout (`https://app.mipey.mx/checkout/payment-link/...`).

#### C. Consulta de Estatus (`GET /payment-link/:id`)
- Permite consultar si el link fue pagado (`status: "PAID" | "ACTIVE" | "EXPIRED"`), extrayendo `trackingKey` de Banxico y el `transactionId`.

---

### 4. Verificación Criptográfica de Webhooks (Standard Webhooks / Svix)
Pey utiliza la especificación **Standard Webhooks**. La verificación debe ser matemáticamente exacta:
1. **Lectura del Body Crudo (`rawBody`)**:
   - **CRÍTICO**: La firma debe validarse contra el buffer o string crudo recibido en la petición HTTP. Nunca uses el JSON parseado, ya que el re-ordenamiento de claves o espacios altera el hash SHA-256.
2. **Encabezados Requeridos**:
   - `webhook-id`: Identificador único del evento.
   - `webhook-timestamp`: Timestamp Unix en segundos.
   - `webhook-signature`: Firma en formato `v1,<base64_digest>`.
3. **Decodificación del Secreto**:
   - El secreto inicia con `whsec_`. Se debe remover este prefijo y decodificar el string restante como **Base64** (o UTF-8 si no es base64 válido).
4. **Cálculo de la Firma**:
   - String a firmar: `${webhookId}.${webhookTimestamp}.${rawBody}`.
   - Algoritmo: HMAC con SHA-256 utilizando la llave binaria decodificada.
   - Salida esperada: `v1,` + digest codificado en Base64.
5. **Seguridad contra Ataques**:
   - **Ventana de tolerancia de tiempo**: Validar que `Math.abs(Date.now()/1000 - timestamp) <= 300` (máximo 5 minutos) para mitigar ataques de repetición (Replay Attacks).
   - **Comparación en tiempo constante**: Usar `crypto.timingSafeEqual` sobre los buffers binarios para evitar ataques de temporización (Timing Attacks).
6. **Idempotencia**:
   - Registrar `transactionId` o `webhook-id` en base de datos. Si un evento duplicado llega, responder HTTP 200 inmediatamente sin duplicar órdenes o transacciones en blockchain.

---

### 5. Entregables
1. Módulo del cliente/servidor de Pey (`pey.server.ts`): Con tipos TypeScript, sanitización de entradas CoDi, llamadas a la API y modo fallback de desarrollo.
2. Manejador de endpoint Webhook (`webhook.server.ts`): Con la verificación completa de firmas Svix y procesamiento de eventos (`payment_link.completed`, `codi.qr.payment_received`).
3. Componente UI en React con botón/modal de pago que muestre tanto el código QR CoDi interactivo con temporizador de cuenta regresiva como el enlace directo de checkout.
```

---

## 2. Matriz de Aprendizajes y Tropiezos Resueltos en Tlamatik

Durante el desarrollo e integración de Pey en este proyecto se identificaron y solucionaron los siguientes puntos críticos:

| Desafío / Problema | Causa Raíz | Solución Implementada |
| :--- | :--- | :--- |
| **Rechazo de conceptos CoDi** | Banxico rechaza caracteres diacríticos (`ñ`, `á`, `é`, etc.) o cadenas mayores a 40 chars. | Función `buildCodiConceptAndRef` que normaliza con `normalize("NFD")` y trunca a 40 caracteres. |
| **Referencia alfanumérica inválida** | Usar identificadores como `TK-0701` en el campo numérico causaba error 400. | Extracción de solo dígitos (`id.replace(/\D/g, "").slice(0, 7)`). |
| **Firma de webhook fallida** | Analizar el cuerpo con `req.json()` cambia el orden de las propiedades y rompe el hash HMAC. | Leer el `rawBody` como string UTF-8 intacto antes de cualquier parseo. |
| **Formato del `PEY_WEBHOOK_SECRET`** | El secreto con prefijo `whsec_` viene codificado en Base64 por el proveedor Svix. | Se descarta `whsec_` y se decodifica con `Buffer.from(raw, "base64")`. |
| **Ataques de temporización y replay** | Comparar strings con `===` o aceptar firmas viejas es inseguro. | Se implementó `timingSafeEqual` y ventana estricta de tolerancia de 300 segundos. |
| **Reintentos automáticos de Pey** | Pey reenvía el webhook si no recibe respuesta rápida o ante fallas transitorias. | Almacén de idempotencia (`processedWebhookIds`) por `transactionId` con respuesta 200 inmediata. |
| **Ambientes locales y de staging** | No siempre se dispone de cuentas bancarias activas para pruebas E2E en CI/CD. | Generación de payload CoDi determinista y mock de resolución instantánea. |

---

## 3. Implementación de Referencia: Verificación de Firma Svix

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

function decodeStandardWebhookSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  const raw = trimmed.startsWith("whsec_") ? trimmed.slice(6) : trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0) {
    return Buffer.from(raw, "base64");
  }
  return Buffer.from(raw, "utf-8");
}

export function verifyPeyWebhookSignature(params: {
  rawBody: string;
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
  secret: string;
}): { valid: boolean; reason?: string } {
  if (!params.webhookId || !params.webhookTimestamp || !params.webhookSignature) {
    return { valid: false, reason: "Cabeceras de Standard Webhook incompletas" };
  }

  const tsNumber = Number(params.webhookTimestamp);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNumber) > 300) {
    return { valid: false, reason: "Timestamp fuera de la ventana de tolerancia (5 min)" };
  }

  const key = decodeStandardWebhookSecret(params.secret);
  const toSign = `${params.webhookId}.${params.webhookTimestamp}.${params.rawBody}`;
  const expectedSignature = createHmac("sha256", key).update(toSign, "utf8").digest("base64");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");

  const signatures = params.webhookSignature.trim().split(/\s+/);
  for (const candidate of signatures) {
    const [version, sig] = candidate.split(",");
    if (version !== "v1" || !sig) continue;
    const sigBuf = Buffer.from(sig, "utf8");
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: "Firma inválida o no coincidente" };
}
```

---

## 4. Archivos Clave del Proyecto como Referencia
- Generador de pagos y llamadas API: [src/lib/pey/pey.server.ts](file:///Users/abonilla/Documents/hackathon/ancestral-craft-passport/src/lib/pey/pey.server.ts)
- Manejo y verificación de webhooks: [src/lib/pey/webhook.server.ts](file:///Users/abonilla/Documents/hackathon/ancestral-craft-passport/src/lib/pey/webhook.server.ts)
- Envolturas de Server Functions: [src/lib/pey/pey.functions.ts](file:///Users/abonilla/Documents/hackathon/ancestral-craft-passport/src/lib/pey/pey.functions.ts)
- Botón y Modal UI de CoDi: [src/components/toltek/ui.tsx](file:///Users/abonilla/Documents/hackathon/ancestral-craft-passport/src/components/toltek/ui.tsx)
