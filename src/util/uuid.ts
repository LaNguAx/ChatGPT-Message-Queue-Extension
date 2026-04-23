export function uuid(): string {
  if ('randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (should not hit in Chrome content scripts, but jsdom older versions)
  const bytes = new Uint8Array(16);
  (crypto as Crypto).getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
