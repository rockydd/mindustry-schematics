import { deflate } from 'pako';
import { ByteWriter } from '../io/binary';
import type { Schematic } from './types';

const HEADER = new TextEncoder().encode('msch');
const VERSION = 1;

function packPos(x: number, y: number): number {
  const xs = (x << 16) >> 16;
  const ys = (y << 16) >> 16;
  return ((xs & 0xffff) << 16) | (ys & 0xffff);
}

export function encodeSchematicBinary(schem: Schematic): Uint8Array {
  const dict: string[] = [];
  const dictIndex = new Map<string, number>();
  for (const t of schem.tiles) {
    if (!dictIndex.has(t.block)) {
      dictIndex.set(t.block, dict.length);
      dict.push(t.block);
    }
  }

  const body = new ByteWriter();
  body.writeShort(schem.width);
  body.writeShort(schem.height);

  const tagEntries = Object.entries(schem.tags ?? {});
  if (tagEntries.length > 255) throw new Error('Too many tags');
  body.writeByte(tagEntries.length);
  for (const [k, v] of tagEntries) {
    body.writeUTF(k);
    body.writeUTF(v);
  }

  if (dict.length > 255) throw new Error('Too many unique blocks');
  body.writeByte(dict.length);
  for (const name of dict) {
    body.writeUTF(name);
  }

  body.writeInt(schem.tiles.length);
  for (const t of schem.tiles) {
    const idx = dictIndex.get(t.block);
    if (idx == null) throw new Error(`Unknown block in dictionary: ${t.block}`);
    body.writeByte(idx);
    body.writeInt(packPos(t.x | 0, t.y | 0));
    // TypeIO null config. Real configs are decoded for display but not re-emitted
    // unless they are null — the generator never needs non-null configs.
    body.writeByte(0);
    body.writeByte(t.rotation & 0xff);
  }

  const compressed = deflate(body.toUint8Array());
  const out = new Uint8Array(HEADER.length + 1 + compressed.length);
  out.set(HEADER, 0);
  out[HEADER.length] = VERSION;
  out.set(compressed, HEADER.length + 1);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  if (typeof (globalThis as { btoa?: (s: string) => string }).btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return (globalThis as { btoa: (s: string) => string }).btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

export function encodeSchematicBase64(schem: Schematic): string {
  return toBase64(encodeSchematicBinary(schem));
}
