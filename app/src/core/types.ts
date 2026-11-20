export type Priority = 1 | 2 | 3;
export type Resource =
  | 'Su'
  | 'Gıda'
  | 'Barınma'
  | 'Sağlık'
  | 'Enerji'
  | 'Diğer';
export type Coordinates = { latitude: number; longitude: number };
export type Analysis = {
  priority: Priority;
  intent: 'need' | 'offer' | 'message';
  resource: Resource;
  reason: string;
};
export type SignedMessage = {
  version: 1;
  id: string;
  sender: string;
  publicKey: string;
  name: string;
  text: string;
  createdAt: number;
  expiresAt: number;
  priority: Priority;
  coordinates: Coordinates | null;
  maxHops: number;
  kind: 'message' | 'sos' | 'aid';
  intent: Analysis['intent'];
  resource: Resource;
};
export type Envelope = {
  message: SignedMessage;
  signature: string;
  hops: number;
};
export type Message = Envelope & {
  direction: 'out' | 'in';
  status: 'queued' | 'received';
  receivedAt: number;
  receipts: string[];
};
export type Listing = {
  id: string;
  text: string;
  intent: 'need' | 'offer';
  resource: Resource;
  quantity: string;
  createdAt: number;
  closed: boolean;
  messageId: string;
};
export type MapPoint = Coordinates & {
  id: string;
  title: string;
  category: 'meeting' | 'water' | 'medical' | 'hazard';
  createdAt: number;
};
export type Preferences = {
  name: string;
  theme: 'system' | 'light' | 'dark';
  shareLocation: boolean;
};
export type LocalData = {
  schema: 1;
  messages: Message[];
  listings: Listing[];
  points: MapPoint[];
  preferences: Preferences;
};
export type Peer = {
  id: string;
  name: string;
  state: 'found' | 'connecting' | 'confirm' | 'connected';
  code?: string;
};
export type DeviceStatus = {
  battery: number;
  charging: boolean;
  internet: boolean;
  bluetooth: boolean;
  wifi: boolean;
  playServices: boolean;
};
export type MeshMode = 'ACTIVE_RELAY' | 'CONSERVATIVE_NODE' | 'SURVIVAL_MODE';
export const emptyData = (): LocalData => ({
  schema: 1,
  messages: [],
  listings: [],
  points: [],
  preferences: { name: 'Komşu', theme: 'system', shareLocation: false },
});
export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const c = value as Coordinates;
  return (
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    Math.abs(c.latitude) <= 90 &&
    Math.abs(c.longitude) <= 180
  );
}
export const priorityLabel = (p: Priority) =>
  p === 1 ? 'ACİL' : p === 2 ? 'İHTİYAÇ / KAYNAK' : 'GENEL';
