// Minimal DataOutputStream/DataInputStream-like helpers for Mindustry schematic format
// Big-endian network order for multi-byte values, Java's DataOutput.writeUTF for ASCII keys

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

  // DataOutput.writeUTF uses a 2-byte length prefix and "modified UTF-8".
  // For ASCII-only strings (our use), standard UTF-8 bytes are identical to modified UTF-8.
  writeUTF(ascii: string): void {
    // Ensure ASCII-safe
    // If any non-ASCII char slips through, TextEncoder handles it and length remains correct.
    const bytes = new TextEncoder().encode(ascii);
    if (bytes.length > 0xffff) {
      throw new Error("UTF string too long for DataOutput.writeUTF");
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
  private offset = 0;
  private buf: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buf = buffer;
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  readByte(): number {
    if (this.offset >= this.view.byteLength) throw new Error("EOF");
    return this.view.getUint8(this.offset++);
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

  readUTF(): string {
    const length = this.readUShort();
    const start = this.offset;
    const end = start + length;
    if (end > this.buf.length) throw new Error("UTF length exceeds buffer");
    const slice = this.buf.subarray(start, end);
    this.offset = end;
    return new TextDecoder().decode(slice);
  }
}

