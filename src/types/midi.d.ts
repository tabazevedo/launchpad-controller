declare module "midi" {
  import { EventEmitter } from "events";

  export class Input extends EventEmitter {
    constructor();

    getPortCount(): number;
    getPortName(port: number): string;
    openPort(port: number): void;
    openVirtualPort(portName: string): void;
    closePort(): void;
    ignoreTypes(
      ignoreSysexMessages: boolean,
      ignoreTimingMessages: boolean,
      ignoreActiveSensingMessages: boolean
    ): void;
  }

  export class Output {
    constructor();

    getPortCount(): number;
    getPortName(port: number): string;
    openPort(port: number): void;
    openVirtualPort(portName: string): void;
    closePort(): void;
    sendMessage(message: Array<number>): void;
  }
}
