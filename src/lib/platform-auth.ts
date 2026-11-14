import { supabase } from "@/integrations/supabase/client";

export interface PlatformUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: string;
}

interface StoredAccount {
  id: string;
  username: string;
  displayName: string;
  saltHex: string;
  passwordHashHex: string;
  createdAt: string;
}

interface StoredSession {
  user: PlatformUser;
  expiresAt: number;
}

const ACCOUNTS_KEY = "tlamatik_auth_accounts_v1";
const SESSION_KEY = "tlamatik_auth_session_v1";
const AUTH_CHANGE_EVENT = "tlamatik-auth-change";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derivePasswordHash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBytes = hexToBytes(saltHex);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function readAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage quota failures
  }
}

function writeSession(user: PlatformUser): void {
  if (typeof window === "undefined") return;
  const session: StoredSession = {
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage quota failures
  }
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (username.length < 3) {
    return "El usuario debe tener al menos 3 caracteres.";
  }
  if (username.length > 48) {
    return "El usuario no debe exceder 48 caracteres.";
  }
  if (!/^[a-z0-9._@-]+$/.test(username)) {
    return "El usuario solo puede contener letras, números y . _ - @ (sin espacios).";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return null;
}

/** Registers a new platform user with PBKDF2-SHA256 salted password hash and opens a session. */
export async function registerWithPassword(input: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<PlatformUser> {
  const usernameError = validateUsername(input.username);
  if (usernameError) throw new Error(usernameError);
  const passwordError = validatePassword(input.password);
  if (passwordError) throw new Error(passwordError);

  const username = normalizeUsername(input.username);
  const accounts = readAccounts();
  if (accounts.some((acc) => acc.username === username)) {
    throw new Error("Este nombre de usuario ya está registrado.");
  }

  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = bytesToHex(saltBytes);
  const passwordHashHex = await derivePasswordHash(input.password, saltHex);
  const now = new Date().toISOString();
  const displayName = input.displayName?.trim() || input.username.trim();
  const id = crypto.randomUUID();

  const stored: StoredAccount = {
    id,
    username,
    displayName,
    saltHex,
    passwordHashHex,
    createdAt: now,
  };
  writeAccounts([...accounts, stored]);

  const user: PlatformUser = {
    id,
    username,
    displayName,
    email: username.includes("@") ? username : `${username}@tlamatik.local`,
    createdAt: now,
  };
  writeSession(user);
  return user;
}

/** Authenticates an existing platform user against the stored PBKDF2-SHA256 hash. */
export async function signInWithPassword(input: {
  username: string;
  password: string;
}): Promise<PlatformUser> {
  const username = normalizeUsername(input.username);
  if (!username || !input.password) {
    throw new Error("Ingresa tu usuario y contraseña.");
  }

  const accounts = readAccounts();
  const account = accounts.find((acc) => acc.username === username);
  if (!account) {
    throw new Error("Usuario o contraseña incorrectos.");
  }

  const candidateHash = await derivePasswordHash(input.password, account.saltHex);
  if (!constantTimeEqualHex(candidateHash, account.passwordHashHex)) {
    throw new Error("Usuario o contraseña incorrectos.");
  }

  const user: PlatformUser = {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    email: account.username.includes("@")
      ? account.username
      : `${account.username}@tlamatik.local`,
    createdAt: account.createdAt,
  };
  writeSession(user);
  return user;
}

/** Returns the active authenticated user from session storage, or null when signed out/expired. */
export async function getAuthUser(): Promise<PlatformUser | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.user?.id || typeof parsed.expiresAt !== "number") {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

/** Signs out the active platform user and clears any legacy OAuth session. */
export async function signOutPlatform(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore if no remote Supabase session exists
  }
}

/** Subscribes to authentication state updates in the current tab and across tabs. */
export function onAuthChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY || e.key === null) listener();
  };
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

