type CodeEntry = {
  expiresAt: number;
};

const codes = new Map<string, CodeEntry>();

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function storeCode(code: string, roomExpiresAtSec: number) {
  const key = code.toUpperCase();
  const expiresAt = roomExpiresAtSec * 1000;
  codes.set(key, { expiresAt });
  const ttl = expiresAt - Date.now();
  if (ttl > 0) setTimeout(() => codes.delete(key), ttl);
}

export function hasCode(code: string): boolean {
  const key = code.toUpperCase();
  const entry = codes.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    codes.delete(key);
    return false;
  }
  return true;
}
