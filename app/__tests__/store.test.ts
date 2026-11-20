import { emptyData } from '../src/core/types';
let mockSequence = 0;
jest.mock('../src/specs/NativeBitChat', () => ({
  __esModule: true,
  default: {
    loadState: jest.fn(async () => ''),
    saveState: jest.fn(async () => undefined),
    getIdentity: jest.fn(async () =>
      JSON.stringify({ sender: 'a'.repeat(24), publicKey: 'a'.repeat(124) }),
    ),
    createId: jest.fn(
      async () =>
        `12345678-1234-1234-1234-${String(++mockSequence).padStart(12, '0')}`,
    ),
    sign: jest.fn(async () => 's'.repeat(96)),
    verify: jest.fn(async () => true),
    getDeviceStatus: jest.fn(async () =>
      JSON.stringify({
        battery: 80,
        charging: false,
        internet: false,
        bluetooth: false,
        wifi: false,
        playServices: true,
      }),
    ),
    onRadioEvent: jest.fn(),
    stop: jest.fn(async () => undefined),
    discovery: jest.fn(async () => undefined),
    send: jest.fn(async () => undefined),
  },
}));
import Native from '../src/specs/NativeBitChat';
import {
  commit,
  initialize,
  sendMessage,
  useStore,
  updatePreferences,
  addPoint,
} from '../src/state/store';

beforeAll(async () => {
  jest.useFakeTimers();
  await initialize();
});
afterAll(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
beforeEach(() => {
  useStore.setState({ data: emptyData(), notice: null, coordinates: null });
  jest.clearAllMocks();
});

test('database failure never publishes a phantom record; next commit recovers', async () => {
  (Native.saveState as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(sendMessage('Güvendeyim')).rejects.toThrow('disk full');
  expect(useStore.getState().data.messages).toHaveLength(0);
  await sendMessage('Güvendeyim');
  expect(useStore.getState().data.messages).toHaveLength(1);
  expect(useStore.getState().data.messages[0].status).toBe('queued');
  expect(Native.send).not.toHaveBeenCalled();
});
test('parallel local writes serialize without losing either record', async () => {
  await Promise.all([
    commit(d => ({
      ...d,
      points: [
        ...d.points,
        {
          id: 'one',
          title: 'A',
          category: 'meeting',
          latitude: 40,
          longitude: 29,
          createdAt: 1,
        },
      ],
    })),
    commit(d => ({
      ...d,
      points: [
        ...d.points,
        {
          id: 'two',
          title: 'B',
          category: 'meeting',
          latitude: 41,
          longitude: 29,
          createdAt: 2,
        },
      ],
    })),
  ]);
  expect(useStore.getState().data.points.map(p => p.id)).toEqual([
    'one',
    'two',
  ]);
});
test.each(['', '   ', 'a'.repeat(601)])(
  'empty/oversized messages cannot enter queue',
  async text => {
    await expect(sendMessage(text)).rejects.toThrow();
    expect(Native.saveState).not.toHaveBeenCalled();
  },
);
test('SOS priority is forced to urgent and no location is shared by default', async () => {
  await sendMessage('Acil yardım', { kind: 'sos', priority: 3 });
  const m = useStore.getState().data.messages[0];
  expect(m.message.priority).toBe(1);
  expect(m.message.coordinates).toBeNull();
  expect(m.signature).toHaveLength(96);
});
test('stale location prevents sending until refreshed or opted out', async () => {
  useStore.setState({
    coordinates: {
      latitude: 40,
      longitude: 29,
      accuracy: 12,
      timestamp: Date.now() - 180000,
    },
  });
  await expect(
    sendMessage('Su lazım', { shareLocation: true }),
  ).rejects.toThrow('Güncel konum yok');
  await sendMessage('Su lazım', { shareLocation: false });
  expect(useStore.getState().data.messages[0].message.coordinates).toBeNull();
});
test('listing and public message are one atomic database commit', async () => {
  (Native.saveState as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(
    sendMessage('Su paylaşabilirim', {
      kind: 'aid',
      listing: {
        text: 'Su var',
        intent: 'offer',
        resource: 'Su',
        quantity: '2 litre',
      },
    }),
  ).rejects.toThrow();
  expect(useStore.getState().data.listings).toHaveLength(0);
  expect(useStore.getState().data.messages).toHaveLength(0);
  await sendMessage('Su paylaşabilirim', {
    kind: 'aid',
    listing: {
      text: 'Su var',
      intent: 'offer',
      resource: 'Su',
      quantity: '2 litre',
    },
  });
  const d = useStore.getState().data;
  expect(d.listings[0].messageId).toBe(d.messages[0].message.id);
  expect(Native.saveState).toHaveBeenCalledTimes(2);
});
test('invalid point does not get saved', async () => {
  await expect(
    addPoint({
      title: 'Yanlış',
      category: 'meeting',
      latitude: 200,
      longitude: 29,
    }),
  ).rejects.toThrow();
  expect(useStore.getState().data.points).toHaveLength(0);
});
test('invalid profile name preserves previous preference', async () => {
  await expect(updatePreferences({ name: '   ' })).rejects.toThrow();
  expect(useStore.getState().data.preferences.name).toBe('Komşu');
});
