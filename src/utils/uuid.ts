/**
 * crypto.randomUUID는 secure context(HTTPS / localhost)에서만 정의된다.
 * LAN IP/HTTP 등 비보안 컨텍스트에서는 undefined → 내부 ID 생성에 timestamp+random 폴백 사용.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
