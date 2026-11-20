import { Envelope, SignedMessage, validCoordinates } from './types';

export const MESSAGE_LIFETIME = 24 * 60 * 60 * 1000;
const resources = ['Su', 'Gıda', 'Barınma', 'Sağlık', 'Enerji', 'Diğer'];
export function canonical(message: SignedMessage): string {
  return JSON.stringify([
    message.version,
    message.id,
    message.sender,
    message.publicKey,
    message.name,
    message.text,
    message.createdAt,
    message.expiresAt,
    message.priority,
    message.coordinates
      ? [message.coordinates.latitude, message.coordinates.longitude]
      : null,
    message.maxHops,
    message.kind,
    message.intent,
    message.resource,
  ]);
}
export function validateEnvelope(
  value: unknown,
  now = Date.now(),
): value is Envelope {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const e = value as Envelope,
    m = e.message;
  return (
    !!m &&
    m.version === 1 &&
    typeof m.id === 'string' &&
    /^[a-f0-9-]{36}$/i.test(m.id) &&
    typeof m.sender === 'string' &&
    /^[a-f0-9]{24}$/.test(m.sender) &&
    typeof m.publicKey === 'string' &&
    m.publicKey.length <= 256 &&
    m.publicKey.length >= 64 &&
    typeof m.name === 'string' &&
    m.name.trim().length > 0 &&
    m.name.length <= 30 &&
    typeof m.text === 'string' &&
    m.text.trim().length > 0 &&
    m.text.length <= 600 &&
    Number.isSafeInteger(m.createdAt) &&
    m.createdAt <= now + 120000 &&
    m.createdAt > 0 &&
    Number.isSafeInteger(m.expiresAt) &&
    m.expiresAt > now &&
    m.expiresAt > m.createdAt &&
    m.expiresAt - m.createdAt <= MESSAGE_LIFETIME &&
    [1, 2, 3].includes(m.priority) &&
    (m.coordinates === null || validCoordinates(m.coordinates)) &&
    Number.isInteger(m.maxHops) &&
    m.maxHops >= 1 &&
    m.maxHops <= 8 &&
    Number.isInteger(e.hops) &&
    e.hops >= 0 &&
    e.hops <= m.maxHops &&
    ['message', 'sos', 'aid'].includes(m.kind) &&
    ['need', 'offer', 'message'].includes(m.intent) &&
    resources.includes(m.resource) &&
    typeof e.signature === 'string' &&
    e.signature.length >= 64 &&
    e.signature.length <= 200
  );
}
