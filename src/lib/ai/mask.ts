// Pure helper, importable from client and tests (no server-only dependency).
export function maskKey(key: string): string {
  return key.length <= 4 ? '••••' : `••••••••${key.slice(-4)}`
}
