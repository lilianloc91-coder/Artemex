import { webcrypto } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { protectedDestination } from "@/lib/auth";

const getAuthUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/platform-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platform-auth")>();
  return {
    ...actual,
    getAuthUser: getAuthUserMock,
  };
});

import { Route } from "@/routes/_authenticated/route";
import {
  registerWithPassword,
  signInWithPassword,
  signOutPlatform,
} from "@/lib/platform-auth";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

describe("Platform username & password access", () => {
  beforeAll(() => {
    vi.stubGlobal("crypto", webcrypto);
    const localStorage = createMemoryStorage();
    vi.stubGlobal("window", {
      localStorage,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    getAuthUserMock.mockReset();
  });

  const guard = Route.options.beforeLoad;

  it.each(["/panel", "/registrar"])(
    "rejects signed-out access to %s",
    async (pathname) => {
      getAuthUserMock.mockResolvedValue(null);
      if (typeof guard !== "function") throw new Error("Missing auth guard");
      await expect(
        guard({ location: { pathname } } as Parameters<typeof guard>[0]),
      ).rejects.toMatchObject({ options: { to: "/auth", search: { next: pathname } } });
    },
  );

  it("allows a validated registered account", async () => {
    getAuthUserMock.mockResolvedValue({
      id: "registered-user",
      username: "miriam.nava",
      displayName: "Miriam Nava",
      email: "miriam.nava@tlamatik.local",
      createdAt: "2026-11-10T00:00:00.000Z",
    });
    if (typeof guard !== "function") throw new Error("Missing auth guard");
    await expect(
      guard({ location: { pathname: "/panel" } } as Parameters<typeof guard>[0]),
    ).resolves.toMatchObject({ user: { id: "registered-user", username: "miriam.nava" } });
  });

  it("preserves the requested work registration destination", () => {
    expect(protectedDestination("/registrar")).toBe("/registrar");
  });

  it("does not accept an external sign-in destination", () => {
    expect(protectedDestination("https://example.com")).toBe("/panel");
  });

  it("registers a new user with username and password, validates duplicates, and signs back in", async () => {
    const registered = await registerWithPassword({
      username: "Miriam.Nava",
      password: "MiPasswordSegura1",
      displayName: "Miriam Nava",
    });
    expect(registered.username).toBe("miriam.nava");
    expect(registered.displayName).toBe("Miriam Nava");

    await expect(
      registerWithPassword({
        username: "miriam.nava",
        password: "OtraPassword123",
      }),
    ).rejects.toThrow("ya está registrado");

    await signOutPlatform();

    await expect(
      signInWithPassword({
        username: "miriam.nava",
        password: "WrongPassword",
      }),
    ).rejects.toThrow("Usuario o contraseña incorrectos");

    const signedIn = await signInWithPassword({
      username: "miriam.nava",
      password: "MiPasswordSegura1",
    });
    expect(signedIn.id).toBe(registered.id);
  });
});
