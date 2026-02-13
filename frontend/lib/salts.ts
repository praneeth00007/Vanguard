const SALT_KEY = "vanguard_salts";

export type SaltEntry = {
  playerSalt: string;
};

export function loadSalt(): SaltEntry | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SALT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaltEntry;
  } catch {
    return null;
  }
}

export function saveSalt(entry: SaltEntry) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SALT_KEY, JSON.stringify(entry));
}

export function generateSaltHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}
