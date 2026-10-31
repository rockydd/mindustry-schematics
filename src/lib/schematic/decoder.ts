import { inflate } from 'pako';
import { ByteReader } from '../io/binary';
import type { Schematic, Tile } from './types';

const HEADER = new TextEncoder().encode('msch');

export function fromBase64(b64: string): Uint8Array {
  if (typeof (globalThis as any).atob === 'function') {
    const bin = (globalThis as any).atob(b64.trim());
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // eslint-disable-next-line no-undef
  return Buffer.from(b64.trim(), 'base64');
}

// TypeIO.readObject; we only need to skip over config content properly.
function skipTypeIOObject(r: ByteReader): unknown {
  const type = r.readByte();
  switch (type) {
    case 0: // null
      return null;
    case 1:
      r.readInt();
      return 0;
    case 2:
      // long: 8 bytes; DataView doesn't have readLong; skip 8
      r.readInt();
      r.readInt();
      return 0n;
    case 3:
      // float
      // skip 4
      r.readInt();
      return 0;
    case 4: {
      // string via TypeIO.writeString: 1 byte exists + arc.util.io Writes.str => short length + bytes
      const exists = r.readByte();
      if (exists !== 0) {
        const len = r.readShort();
        // emulate arc.util.io Writes.str: it's a short length and raw bytes
        // Our ByteReader readShort already moved offset; we need to manually consume bytes here
        // But our ByteReader doesn't expose raw skip; emulate by reading UShort and reading a UTF via helper
        // For simplicity, consume exactly 'len' bytes.
        // We'll temporarily create a slice trick:
        // Not directly supported; extends ByteReader to allow skip. Easiest: hack offset.
        // Fall through to manual skip
        // @ts-ignore - access private
        r.offset += len;
      }
      return '';
    }
    case 5:
      // Content: 1 byte type ordinal + short id
      r.readByte();
      r.readShort();
      return {};
    case 6: {
      // IntSeq: short size + N ints
      const size = r.readShort();
      for (let i = 0; i < size; i++) r.readInt();
      return [];
    }
    case 7:
      // Point2: two ints
      r.readInt();
      r.readInt();
      return { x: 0, y: 0 };
    case 8: {
      const len = r.readByte();
      for (let i = 0; i < len; i++) r.readInt();
      return [];
    }
    case 9:
      // TechNode: 1 byte content type + short id
      r.readByte();
      r.readShort();
      return {};
    case 10:
      r.readByte();
      return false;
    case 11:
      // double: 8 bytes
      r.readInt();
      r.readInt();
      return 0;
    case 12:
      // Building ref: int pos
      r.readInt();
      return {};
    case 13:
      // LAccess ordinal short
      r.readShort();
      return 0;
    case 14: {
      // byte array: length int + N bytes
      const len = r.readInt();
      // @ts-ignore
      r.offset += len;
      return new Uint8Array(len);
    }
    case 15:
      r.readByte();
      return 0;
    default:
      throw new Error(`Unknown TypeIO object tag: ${type}`);
  }
}

function unpackX(pos: number): number {
  return (pos >>> 16) << 16 >> 16; // sign-extend short to int
}
function unpackY(pos: number): number {
  return (pos & 0xffff) << 16 >> 16;
}

export function decodeSchematicBinary(bytes: Uint8Array): Schematic {
  if (
    bytes.length < HEADER.length + 1 ||
    !HEADER.every((b, i) => bytes[i] === b)
  ) {
    throw new Error('Not a schematic file (missing header)');
  }
  const version = bytes[HEADER.length]; // currently unused; >= 1
  if (version > 1) {
    // still attempt, but note
    // throw new Error(`Unknown version: ${version}`);
  }
  const infl = inflate(bytes.subarray(HEADER.length + 1));
  const r = new ByteReader(infl);

  const width = r.readShort();
  const height = r.readShort();
  const tagCount = r.readByte();
  const tags: Record<string, string> = {};
  for (let i = 0; i < tagCount; i++) {
    const k = r.readUTF();
    const v = r.readUTF();
    tags[k] = v;
  }
  const dictLen = r.readByte();
  const dict: string[] = [];
  for (let i = 0; i < dictLen; i++) {
    dict.push(r.readUTF());
  }
  const total = r.readInt();
  const tiles: Tile[] = [];
  for (let i = 0; i < total; i++) {
    const blockIndex = r.readByte();
    const pos = r.readInt();
    skipTypeIOObject(r);
    const rotation = r.readByte();
    const name = dict[blockIndex];
    if (name && name !== 'air') {
      tiles.push({
        block: name,
        x: unpackX(pos),
        y: unpackY(pos),
        rotation,
        config: null,
      });
    }
  }
  return { width, height, tiles, tags };
}

