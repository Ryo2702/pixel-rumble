import type { SolanaAccountInfo, SolanaTokenMintData } from './types';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function decodeBase58(value: string): Uint8Array | null {
  if (!value) return null;
  let number = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) return null;
    number = number * 58n + BigInt(digit);
  }
  const hex = number.toString(16).padStart(number === 0n ? 0 : Math.ceil(number.toString(16).length / 2) * 2, '0');
  const bytes = hex ? new Uint8Array(hex.match(/.{2}/g)!.map(pair => Number.parseInt(pair, 16))) : new Uint8Array();
  let leading = 0;
  while (leading < value.length && value[leading] === '1') leading++;
  return leading ? new Uint8Array([...new Uint8Array(leading), ...bytes]) : bytes;
}

export function isSolanaAddress(value: unknown): value is string {
  return typeof value === 'string' && decodeBase58(value)?.length === 32;
}

export function isSolanaSignature(value: unknown): value is string {
  return typeof value === 'string' && decodeBase58(value)?.length === 64;
}

export function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export function parseMintAccount(account: SolanaAccountInfo): SolanaTokenMintData | null {
  if (!Array.isArray(account.data) || account.data[1] !== 'base64' || typeof account.data[0] !== 'string') return null;
  const bytes = decodeBase64(account.data[0]);
  if (!bytes || bytes.length < 82) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { supplyRaw: view.getBigUint64(36, true).toString(), decimals: bytes[44], initialized: bytes[45] === 1 };
}

export function safeRpcNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
