import { Coordinates, Priority, validCoordinates } from './types';

export type CompactPacket = {
  id: number;
  senderHash: number;
  priority: Priority;
  ttl: number;
  coordinates: Coordinates | null;
  payload: Uint8Array;
};
/** A compact beacon, NOT a full encrypted message. The 13-byte payload is binary. */
export class BinaryPacketCodec {
  static readonly SIZE = 31;
  static encode(packet: CompactPacket): Uint8Array {
    for (const value of [packet.id, packet.senderHash]) {
      if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
        throw new Error('Kimlik uint32 olmalı.');
      }
    }
    if (![1, 2, 3].includes(packet.priority)) {
      throw new Error('Geçersiz öncelik.');
    }
    if (!Number.isInteger(packet.ttl) || packet.ttl < 0 || packet.ttl > 255) {
      throw new Error('Geçersiz TTL.');
    }
    if (
      !(packet.payload instanceof Uint8Array) ||
      packet.payload.length !== 13
    ) {
      throw new Error('Yük tam 13 byte olmalı.');
    }
    if (packet.coordinates !== null && !validCoordinates(packet.coordinates)) {
      throw new Error('Geçersiz koordinat.');
    }
    const bytes = new Uint8Array(this.SIZE),
      view = new DataView(bytes.buffer);
    view.setUint32(0, packet.id);
    view.setUint32(4, packet.senderHash);
    bytes[8] = packet.priority;
    bytes[9] = packet.ttl;
    view.setInt32(
      10,
      packet.coordinates
        ? Math.round(packet.coordinates.latitude * 1e6)
        : -2147483648,
    );
    view.setInt32(
      14,
      packet.coordinates
        ? Math.round(packet.coordinates.longitude * 1e6)
        : -2147483648,
    );
    bytes.set(packet.payload, 18);
    return bytes;
  }
  static decode(bytes: Uint8Array): CompactPacket {
    if (bytes.length !== this.SIZE) {
      throw new Error('Paket 31 byte olmalı.');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const lat = view.getInt32(10),
      lon = view.getInt32(14);
    if ((lat === -2147483648) !== (lon === -2147483648)) {
      throw new Error('Eksik koordinat.');
    }
    const coordinates =
      lat === -2147483648
        ? null
        : { latitude: lat / 1e6, longitude: lon / 1e6 };
    const packet: CompactPacket = {
      id: view.getUint32(0),
      senderHash: view.getUint32(4),
      priority: bytes[8] as Priority,
      ttl: bytes[9],
      coordinates,
      payload: bytes.slice(18),
    };
    this.encode(packet);
    return packet;
  }
  static forward(bytes: Uint8Array): Uint8Array | null {
    const packet = this.decode(bytes);
    return packet.ttl === 0
      ? null
      : this.encode({ ...packet, ttl: packet.ttl - 1 });
  }
}
