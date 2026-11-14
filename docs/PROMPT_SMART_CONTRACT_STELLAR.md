# Especificación y Prompt del Smart Contract en Stellar Soroban
## Pasaporte Phygital y Registro Inmutable de Obras Artesanales (Tlamatik)

Este documento contiene la especificación técnica completa y el **prompt maestro** para implementar o desplegar el Smart Contract en **Stellar Soroban (Rust)** para el registro de piezas artesanales, verificación de procedencia y trazabilidad de derechos (cesión/licenciamiento), manteniendo compatibilidad total con la plataforma web de **Tlamatik**.

---

## 1. Prompt Maestro para Generación del Smart Contract

Copia y pega el siguiente bloque de texto en cualquier modelo de IA especializado en Rust / Stellar Soroban:

```markdown
Actúa como un desarrollador senior de Smart Contracts en Stellar Soroban utilizando Rust (`soroban-sdk`).

Necesito implementar el Smart Contract completo para el proyecto "Tlamatik / Ancestral Craft Passport" (Pasaporte Phygital de Artesanías Mexicanas). El contrato debe compilar a WebAssembly (`wasm32-unknown-unknown`), seguir el estándar `no_std`, y ser 100% compatible con las llamadas que realiza el backend y frontend mediante `stellar-cli` y `@stellar/stellar-sdk`.

### 1. Requerimientos de Negocio y Funcionalidad
1. **Registro Inmutable de Piezas (Pasaporte Phygital)**: Anclar en la blockchain el identificador único de la pieza (`work_id`), su hash SHA-256 criptográfico (`hash`), el autor o colectivo artesano (`author`) y el timestamp Unix de registro (`registered_at`).
2. **Historial de Derechos y Trazabilidad (Traceability Ledger)**: Registrar eventos inmutables de licenciamiento ético, cesión de derechos, validación de evidencia y transferencias de custodia (`RightsEvent`).
3. **Verificación Pública de Autenticidad**: Permitir a coleccionistas, museos y consumidores verificar si el hash de un expediente físico/digital coincide con el hash original anclado en la blockchain para ese `work_id`.

---

### 2. Estructuras de Datos (`#[contracttype]`)

```rust
#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Work {
    pub work_id: String,
    pub hash: String,
    pub author: String,
    pub registered_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RightsEvent {
    pub work_id: String,
    pub event_id: String,
    pub event_type: String,     // "registration", "license", "assignment", "evidence", "transfer"
    pub actor: String,          // Artesano, colectivo o promotor
    pub recipient: String,      // Comprador, marca licenciataria o nuevo custodio
    pub terms: String,          // ej. "Licencia de Expresión Cultural Tradicional para Moda & Textil Ético · 12% regalías comunitarias"
    pub effective_date: String, // Fecha ISO-8601
    pub recorded_at: u64,       // Timestamp Unix del ledger
}

#[contracttype]
pub enum DataKey {
    Work(String),
    RightsEvents(String),
}
```

---

### 3. Códigos de Error (`#[contracterror]`)

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    WorkAlreadyExists = 1,
    WorkNotFound = 2,
    InvalidHash = 3,
    InvalidParams = 4,
    Unauthorized = 5,
}
```

---

### 4. Métodos Públicos Requeridos (ABI de Soroban)

Implementa en `#[contractimpl]` para `AncestralCraftPassportContract`:

1. `register_work(env: Env, work_id: String, hash: String, author: String) -> Result<Work, ContractError>`
   - Verifica que `work_id` no exista previamente en el almacenamiento persistente (`env.storage().persistent()`). Si ya existe, devuelve `Err(ContractError::WorkAlreadyExists)`.
   - Obtiene el timestamp actual del bloque: `env.ledger().timestamp()`.
   - Guarda el struct `Work` bajo la clave `DataKey::Work(work_id.clone())`.
   - Extiende el TTL de almacenamiento persistente para evitar expiración (`extend_ttl`).
   - Emite el evento Soroban:
     `topics = (symbol_short!("work"), symbol_short!("reg")), data = (work_id.clone(), hash.clone(), author.clone())`.
   - Retorna la entidad `Work` creada.

2. `record_rights_event(env: Env, work_id: String, event_id: String, event_type: String, actor: String, recipient: String, terms: String, effective_date: String) -> Result<RightsEvent, ContractError>`
   - Valida que la obra exista bajo `DataKey::Work(work_id.clone())`. Si no existe, devuelve `Err(ContractError::WorkNotFound)`.
   - Recupera el vector existente de eventos bajo `DataKey::RightsEvents(work_id.clone())` o inicializa un `Vec::new(&env)`.
   - Crea el nuevo `RightsEvent` con `recorded_at = env.ledger().timestamp()`.
   - Añade el evento al vector y actualiza el almacenamiento persistente.
   - Emite el evento Soroban:
     `topics = (symbol_short!("rights"), symbol_short!("event")), data = (work_id, event_id, event_type)`.
   - Retorna el struct `RightsEvent` almacenado.

3. `get_work(env: Env, work_id: String) -> Option<Work>`
   - Consulta de solo lectura. Retorna `Some(Work)` si existe, o `None`.

4. `get_rights_events(env: Env, work_id: String) -> Vec<RightsEvent>`
   - Consulta de solo lectura. Retorna la lista de eventos asociados a la obra, o un vector vacío si no tiene registros.

5. `verify_work(env: Env, work_id: String, hash: String) -> bool`
   - Consulta de solo lectura. Busca la obra por `work_id`. Si existe, evalúa si `work.hash == hash`. Retorna `true` o `false`.

---

### 5. Entregables Requeridos
1. `Cargo.toml` con configuración para `soroban-sdk = "22"` y perfil `[profile.release]` optimizado (`opt-level = "z"`, `lto = true`, `panic = "abort"`).
2. Código fuente completo en `src/lib.rs`.
3. Suite de tests unitarios en `src/test.rs` validando registro, duplicados, eventos y verificación.
4. Comandos de terminal paso a paso con `stellar-cli` para compilar, probar y desplegar a Stellar Testnet.
```

---

## 2. Implementación de Referencia en Rust

A continuación se muestra el código listo para compilar si deseas compilarlo de forma directa:

### `Cargo.toml`
```toml
[package]
name = "ancestral-craft-passport-contract"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
soroban-sdk = "22.0.0"

[dev-dependencies]
soroban-sdk = { version = "22.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

### `src/lib.rs`
```rust
#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    WorkAlreadyExists = 1,
    WorkNotFound = 2,
    InvalidHash = 3,
    InvalidParams = 4,
    Unauthorized = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Work {
    pub work_id: String,
    pub hash: String,
    pub author: String,
    pub registered_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RightsEvent {
    pub work_id: String,
    pub event_id: String,
    pub event_type: String,
    pub actor: String,
    pub recipient: String,
    pub terms: String,
    pub effective_date: String,
    pub recorded_at: u64,
}

#[contracttype]
pub enum DataKey {
    Work(String),
    RightsEvents(String),
}

const PERSISTENT_BUMP_AMOUNT: u32 = 518_400; // ~30 días en ledgers (5s por ledger)
const PERSISTENT_LIFETIME_THRESHOLD: u32 = 100_000;

#[contract]
pub struct AncestralCraftPassportContract;

#[contractimpl]
impl AncestralCraftPassportContract {
    /// Registra una nueva pieza artesanal con su hash criptográfico de expediente
    pub fn register_work(
        env: Env,
        work_id: String,
        hash: String,
        author: String,
    ) -> Result<Work, ContractError> {
        let key = DataKey::Work(work_id.clone());

        if env.storage().persistent().has(&key) {
            return Err(ContractError::WorkAlreadyExists);
        }

        let registered_at = env.ledger().timestamp();
        let work = Work {
            work_id: work_id.clone(),
            hash: hash.clone(),
            author: author.clone(),
            registered_at,
        };

        env.storage().persistent().set(&key, &work);
        env.storage().persistent().extend_ttl(
            &key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        env.events().publish(
            (symbol_short!("work"), symbol_short!("reg")),
            (work_id, hash, author),
        );

        Ok(work)
    }

    /// Registra un evento de cesión de derechos, licenciamiento ético o transferencia
    pub fn record_rights_event(
        env: Env,
        work_id: String,
        event_id: String,
        event_type: String,
        actor: String,
        recipient: String,
        terms: String,
        effective_date: String,
    ) -> Result<RightsEvent, ContractError> {
        let work_key = DataKey::Work(work_id.clone());

        if !env.storage().persistent().has(&work_key) {
            return Err(ContractError::WorkNotFound);
        }

        let recorded_at = env.ledger().timestamp();
        let event = RightsEvent {
            work_id: work_id.clone(),
            event_id: event_id.clone(),
            event_type: event_type.clone(),
            actor: actor.clone(),
            recipient: recipient.clone(),
            terms: terms.clone(),
            effective_date: effective_date.clone(),
            recorded_at,
        };

        let events_key = DataKey::RightsEvents(work_id.clone());
        let mut events: Vec<RightsEvent> = env
            .storage()
            .persistent()
            .get(&events_key)
            .unwrap_or_else(|| Vec::new(&env));

        events.push_back(event.clone());
        env.storage().persistent().set(&events_key, &events);
        env.storage().persistent().extend_ttl(
            &events_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        env.events().publish(
            (symbol_short!("rights"), symbol_short!("event")),
            (work_id, event_id, event_type),
        );

        Ok(event)
    }

    /// Consulta una pieza registrada por su ID
    pub fn get_work(env: Env, work_id: String) -> Option<Work> {
        let key = DataKey::Work(work_id);
        env.storage().persistent().get(&key)
    }

    /// Consulta todos los eventos de trazabilidad y derechos de una pieza
    pub fn get_rights_events(env: Env, work_id: String) -> Vec<RightsEvent> {
        let key = DataKey::RightsEvents(work_id);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Verifica si un hash presentado coincide con el registrado para la pieza
    pub fn verify_work(env: Env, work_id: String, hash: String) -> bool {
        match Self::get_work(env, work_id) {
            Some(work) => work.hash == hash,
            None => false,
        }
    }
}

#[cfg(test)]
mod test;
```

---

## 3. Comandos de Compilación y Despliegue con `stellar-cli`

### Paso 1: Configurar la red Testnet en Stellar CLI
```bash
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### Paso 2: Crear una cuenta emisora y fondearla con Friendbot
```bash
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet
```

### Paso 3: Compilar y optimizar el WebAssembly
```bash
stellar contract build
```
*(El binario se generará en `target/wasm32-unknown-unknown/release/ancestral_craft_passport_contract.wasm`)*

### Paso 4: Desplegar el contrato en Stellar Testnet
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ancestral_craft_passport_contract.wasm \
  --source alice \
  --network testnet
```
*(La terminal devolverá el `Contract ID`, por ejemplo `CAOAFGPATXWJ6KKGXFYHY42Q4N75NOWSR3NH3K2DT7QR3YSMDGT5P2HO`)*

---

## 4. Vinculación con la Aplicación Web

Una vez obtenido el nuevo Contract ID y el hash del WASM, actualiza el archivo de configuración de la aplicación:

📁 **`src/lib/stellar/config.ts`**:
```typescript
export const STELLAR_CONFIG = {
  network: "testnet" as const,
  networkPassphrase: "Test SDF Network ; September 2015",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  contractId: "TU_CONTRACT_ID_DESPLEGADO",
  wasmHash: "TU_WASM_HASH",
  deployTxHash: "TU_TX_HASH_DE_DEPLOY",
  explorerTxBaseUrl: "https://stellar.expert/explorer/testnet/tx",
  explorerContractBaseUrl: "https://stellar.expert/explorer/testnet/contract",
  stellarLabContractUrl: "https://lab.stellar.org/r/testnet/contract",
} as const;
```

Con este paso, todos los módulos de registro de obras, verificación de pasaporte QR, licenciamiento ético B2B y consulta en exploradores quedarán enlazados automáticamente al nuevo contrato.
