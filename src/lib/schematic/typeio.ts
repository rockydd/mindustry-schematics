import type { ByteReader } from '../io/binary';
import type { SchematicConfig } from './types';

/** TypeIO object tags from Anuke/Mindustry TypeIO.java */
const T = {
  null: 0,
  integer: 1,
  long: 2,
  float: 3,
  string: 4,
  content: 5,
  intSeq: 6,
  point2: 7,
  point2Array: 8,
  techNode: 9,
  boolean: 10,
  double: 11,
  building: 12,
  lAccess: 13,
  byteArray: 14,
  legacy: 15,
  booleanArray: 16,
  unit: 17,
  vec2Array: 18,
  vec2: 19,
  team: 20,
  intArray: 21,
  objectArray: 22,
  unitCommand: 23,
} as const;

export function readTypeIOObject(r: ByteReader, allowArrays = true): SchematicConfig {
  const type = r.readUnsignedByte();
  return readTypeIOBody(r, type, allowArrays);
}

function readTypeIOBody(r: ByteReader, type: number, allowArrays: boolean): SchematicConfig {
  switch (type) {
    case T.null:
      return null;
    case T.integer:
      return r.readInt();
    case T.long:
      return r.readLong();
    case T.float:
      return r.readFloat();
    case T.string: {
      const exists = r.readByte();
      if (exists === 0) return null;
      return r.readUTF();
    }
    case T.content: {
      const contentType = r.readByte();
      const id = r.readShort();
      return { kind: 'content', contentType, id };
    }
    case T.intSeq: {
      if (!allowArrays) throw new Error('Nested arrays are not allowed');
      const len = r.readShort();
      const items: number[] = [];
      for (let i = 0; i < len; i++) items.push(r.readInt());
      return { kind: 'intSeq', items };
    }
    case T.point2:
      return { kind: 'point2', x: r.readInt(), y: r.readInt() };
    case T.point2Array: {
      if (!allowArrays) throw new Error('Nested arrays are not allowed');
      const len = r.readUnsignedByte();
      const items: number[] = [];
      for (let i = 0; i < len; i++) items.push(r.readInt());
      return { kind: 'point2Array', items };
    }
    case T.techNode: {
      const contentType = r.readByte();
      const id = r.readShort();
      return { kind: 'techNode', contentType, id };
    }
    case T.boolean:
      return r.readBoolean();
    case T.double:
      return r.readDouble();
    case T.building:
      return { kind: 'building', pos: r.readInt() };
    case T.lAccess:
      return { kind: 'lAccess', ordinal: r.readShort() };
    case T.byteArray: {
      if (!allowArrays) throw new Error('Nested arrays are not allowed');
      const len = r.readInt();
      r.skip(len);
      return { kind: 'bytes', length: len };
    }
    case T.legacy:
      r.readByte();
      return null;
    case T.booleanArray: {
      if (!allowArrays) throw new Error('Nested arrays are not allowed');
      const len = r.readInt();
      for (let i = 0; i < len; i++) r.readByte();
      return { kind: 'boolArray', length: len };
    }
    case T.unit:
      return { kind: 'unit', id: r.readInt() };
    case T.vec2Array: {
      if (!allowArrays) throw new Error('Nested arrays are not allowed');
      const len = r.readShort();
      const items: { x: number; y: number }[] = [];
      for (let i = 0; i < len; i++) items.push({ x: r.readFloat(), y: r.readFloat() });
      return { kind: 'vec2Array', items };
    }
    case T.vec2:
      return { kind: 'vec2', x: r.readFloat(), y: r.readFloat() };
    case T.team:
      return { kind: 'team', id: r.readUnsignedByte() };
    case T.intArray: {
      if (!allowArrays) throw new Error('Nested arrays are not allowed');
      const len = r.readShort();
      const items: number[] = [];
      for (let i = 0; i < len; i++) items.push(r.readInt());
      return { kind: 'intArray', items };
    }
    case T.objectArray: {
      if (!allowArrays) throw new Error('Nested arrays are not allowed');
      const len = r.readInt();
      const items: SchematicConfig[] = [];
      for (let i = 0; i < len; i++) items.push(readTypeIOObject(r, false));
      return { kind: 'objectArray', items };
    }
    case T.unitCommand:
      return { kind: 'unitCommand', id: r.readUShort() };
    default:
      throw new Error(`Unknown TypeIO object tag: ${type}`);
  }
}
