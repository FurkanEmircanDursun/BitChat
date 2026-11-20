import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  loadState(): Promise<string>;
  saveState(json: string): Promise<void>;
  exportData(json: string): Promise<void>;
  getIdentity(): Promise<string>;
  createId(): Promise<string>;
  sign(data: string): Promise<string>;
  verify(
    data: string,
    signature: string,
    publicKey: string,
    sender: string,
  ): Promise<boolean>;
  getDeviceStatus(): Promise<string>;
  getLocation(): Promise<string>;
  start(name: string): Promise<void>;
  discovery(enabled: boolean): Promise<void>;
  stop(): Promise<void>;
  connect(endpointId: string): Promise<void>;
  confirm(endpointId: string, accept: boolean): Promise<void>;
  send(endpointId: string, data: string): Promise<void>;
  readonly onRadioEvent: CodegenTypes.EventEmitter<string>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('BitChat');
