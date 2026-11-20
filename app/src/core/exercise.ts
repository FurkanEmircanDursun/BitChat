import { batteryMode } from './AutonomousMeshEngine';

export type ExerciseState = {
  step: number;
  online: boolean;
  lowBattery: boolean;
  events: string[];
  delivered: boolean;
  copies: number;
};
export const initialExercise = (): ExerciseState => ({
  step: 0,
  online: true,
  lowBattery: false,
  events: [],
  delivered: false,
  copies: 1,
});
export function advanceExercise(s: ExerciseState): ExerciseState {
  if (s.delivered) {
    return s;
  }
  if (!s.online) {
    return {
      ...s,
      events: [
        'B bağlantısı kesik. SOS, A kuyruğunda korundu.',
        ...s.events,
      ].slice(0, 12),
    };
  }
  if (s.lowBattery) {
    return {
      ...s,
      events: [
        `B pili %12: ${batteryMode(12)}. Aktarım bekliyor.`,
        ...s.events,
      ].slice(0, 12),
    };
  }
  const step = Math.min(3, s.step + 1);
  const label =
    step === 1
      ? 'A, SOS paketini B’ye aktardı. B yerelde sakladı.'
      : step === 2
      ? 'B, sakladığı SOS paketini C’ye aktardı. TTL azaldı.'
      : 'C alındı onayı verdi. Aynı kimlikli tekrar paket reddedildi.';
  return {
    ...s,
    step,
    delivered: step === 3,
    copies: Math.min(3, step + 1),
    events: [label, ...s.events].slice(0, 12),
  };
}
