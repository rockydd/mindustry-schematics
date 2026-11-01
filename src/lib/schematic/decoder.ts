import { inflate } from 'pako';
import { ByteReader } from '../io/binary';
import { readTypeIOObject } from './typeio';
import type { Schematic, Tile } from './types';

const HEADER = new TextEncoder().encode('msch');

export function fromBase64(b64: string): Uint8Array {
  const cleaned = sanitizeBase64(b64);
  if (typeof (globalThis as { atob?: (s: string) => string }).atob === 'function') {
    const bin = (globalThis as { atob: (s: string) => string }).atob(cleaned);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return Buffer.from(cleaned, 'base64');
}

export function sanitizeBase64(input: string): string {
  let s = input.trim();
  // Allow pasting with extra wrapping / whitespace / URL-safe variants.
  s = s.replace(/[\s\r\n]/g, '');
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const start = s.indexOf('bXNjaA');
  if (start > 0) s = s.slice(start);
  return s;
}

export function looksLikeSchematicBase64(input: string): boolean {
  return sanitizeBase64(input).startsWith('bXNjaA');
}

function unpackX(pos: number): number {
  return (pos >>> 16) << 16 >> 16;
}
function unpackY(pos: number): number {
  return (pos & 0xffff) << 16 >> 16;
}

export function decodeSchematicBinary(bytes: Uint8Array): Schematic {
  if (bytes.length < HEADER.length + 1 || !HEADER.every((b, i) => bytes[i] === b)) {
    throw new Error('Not a schematic file (missing header)');
  }
  const version = bytes[HEADER.length];
  if (version > 1) {
    throw new Error(`Unknown schematic version: ${version}`);
  }
  const infl = inflate(bytes.subarray(HEADER.length + 1));
  const r = new ByteReader(infl);

  const width = r.readShort();
  const height = r.readShort();
  const tagCount = r.readUnsignedByte();
  const tags: Record<string, string> = {};
  for (let i = 0; i < tagCount; i++) {
    tags[r.readUTF()] = r.readUTF();
  }
  const dictLen = r.readUnsignedByte();
  const dict: string[] = [];
  for (let i = 0; i < dictLen; i++) {
    dict.push(r.readUTF());
  }
  const total = r.readInt();
  const tiles: Tile[] = [];
  for (let i = 0; i < total; i++) {
    const blockIndex = r.readUnsignedByte();
    const pos = r.readInt();
    const config =
      version === 0
        ? r.readInt()
        : readTypeIOObject(r);
    const rotation = r.readByte();
    const name = dict[blockIndex];
    if (name && name !== 'air') {
      tiles.push({
        block: name,
        x: unpackX(pos),
        y: unpackY(pos),
        rotation,
        config: config as Tile['config'],
      });
    }
  }
  return { width, height, tiles, tags, version };
}

export function decodeSchematicFromBase64(b64: string): Schematic {
  return decodeSchematicBinary(fromBase64(b64));
}
