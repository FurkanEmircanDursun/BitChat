import { Envelope, MeshMode, Message } from './types';

export function batteryMode(percent: number, charging = false): MeshMode {
  if (!Number.isFinite(percent) || percent < 0) {
    return 'CONSERVATIVE_NODE';
  }
  if (charging || percent > 50) {
    return 'ACTIVE_RELAY';
  }
  return percent >= 20 ? 'CONSERVATIVE_NODE' : 'SURVIVAL_MODE';
}
export function eligible(
  messages: Message[],
  mode: MeshMode,
  now = Date.now(),
): Message[] {
  return messages
    .filter(
      m =>
        m.message.expiresAt > now &&
        m.hops < m.message.maxHops &&
        (mode === 'ACTIVE_RELAY' ||
          (m.message.priority === 1 &&
            (mode !== 'SURVIVAL_MODE' || m.direction === 'out'))),
    )
    .sort(
      (a, b) =>
        a.message.priority - b.message.priority ||
        a.message.createdAt - b.message.createdAt,
    );
}
export type Transport = { send(peer: string, payload: string): Promise<void> };
/** Store-and-forward. An API send success never constitutes a peer receipt. */
export class AutonomousMeshEngine {
  private attempts = new Map<string, { count: number; next: number }>();
  private acknowledged = new Set<string>();
  private busy = false;
  constructor(private transport: Transport, private now = Date.now) {}
  acknowledge(peer: string, id: string) {
    this.acknowledged.add(`${peer}:${id}`);
  }
  forgetPeer(peer: string) {
    for (const key of this.attempts.keys()) {
      if (key.startsWith(`${peer}:`)) {
        this.attempts.delete(key);
      }
    }
    for (const key of this.acknowledged) {
      if (key.startsWith(`${peer}:`)) {
        this.acknowledged.delete(key);
      }
    }
  }
  async flush(
    messages: Message[],
    peers: string[],
    mode: MeshMode,
  ): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    try {
      for (const item of eligible(messages, mode, this.now())) {
        for (const peer of peers) {
          const key = `${peer}:${item.message.id}`,
            attempt = this.attempts.get(key);
          if (
            this.acknowledged.has(key) ||
            (attempt && attempt.next > this.now())
          ) {
            continue;
          }
          const count = (attempt?.count ?? 0) + 1;
          this.attempts.set(key, {
            count,
            next:
              this.now() + Math.min(60000, 2000 * 2 ** Math.min(count - 1, 5)),
          });
          const envelope: Envelope = {
            message: item.message,
            signature: item.signature,
            hops: item.hops + 1,
          };
          await this.transport
            .send(peer, JSON.stringify({ type: 'message', envelope }))
            .catch(() => undefined);
        }
      }
    } finally {
      this.busy = false;
    }
  }
}
