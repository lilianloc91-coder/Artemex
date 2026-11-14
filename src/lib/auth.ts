export function protectedDestination(value: unknown): "/panel" | "/registrar" {
  return value === "/registrar" ? "/registrar" : "/panel";
}