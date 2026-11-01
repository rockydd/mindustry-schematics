/** Big-endian DataInput/DataOutput helpers matching Java / Arc IO. */

export class ByteWriter {
  private chunks: number[] = [];

  writeByte(value: number): void {
    this.chunks.push((value & 0xff) >>> 0);
  }

  writeBoolean(value: boolean): void {
    this.writeByte(value ? 1 : 0);
  }

  writeShort(value: number): void {
    const v = value & 0xffff;
    this.chunks.push((v >>> 8) & 0xff, v & 0xff);
  }

  writeInt(value: number): void {
    const v = value | 0;
    this.chunks.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  }

  writeFloat(value: number): void {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, value, false);
    const b = new Uint8Array(buf);
    this.chunks.push(b[0], b[1], b[2], b[3]);
  }

  /** Java DataOutput.writeUTF: 2-byte length + modified UTF-8 (ASCII-identical). */
  writeUTF(str: string): void {
    const bytes = new TextEncoder().encode(str);
    if (bytes.length > 0xffff) {
      throw new Error('UTF string too long for DataOutput.writeUTF');
    }
    this.writeShort(bytes.length);
    for (const b of bytes) this.writeByte(b);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }
}

export class ByteReader {
  private view: DataView;
  offset = 0;
  private buf: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buf = buffer;
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  remaining(): number {
    return this.view.byteLength - this.offset;
  }

  skip(n: number): void {
    if (this.offset + n > this.view.byteLength) throw new Error('EOF');
    this.offset += n;
  }

  readByte(): number {
    if (this.offset >= this.view.byteLength) throw new Error('EOF');
    return this.view.getUint8(this.offset++);
  }

  readUnsignedByte(): number {
    return this.readByte();
  }

  readBoolean(): boolean {
    return this.readByte() !== 0;
  }

  readShort(): number {
    const value = this.view.getInt16(this.offset, false);
    this.offset += 2;
    return value;
  }

  readUShort(): number {
    const value = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return value;
  }

  readInt(): number {
    const value = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readFloat(): number {
    const value = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readDouble(): number {
    const value = this.view.getFloat64(this.offset, false);
    this.offset += 8;
    return value;
  }

  readLong(): bigint {
    const value = this.view.getBigInt64(this.offset, false);
    this.offset += 8;
    return value;
  }

  readUTF(): string {
    const length = this.readUShort();
    return this.readRaw(length);
  }

  readRaw(length: number): string {
    const start = this.offset;
    const end = start + length;
    if (end > this.buf.length) throw new Error('UTF length exceeds buffer');
    const slice = this.buf.subarray(start, end);
    this.offset = end;
    return new TextDecoder().decode(slice);
  }
}
