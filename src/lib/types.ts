import { EventEmitter } from "events";
import type { Input, Output } from "midi";

export enum KeyState {
  Down = "down",
  Up = "up",
}

export enum ButtonType {
  Grid = "grid",
  Automap = "automap",
  Scene = "scene",
}

export enum Color {
  Green = "green",
  Red = "red",
  Amber = "amber",
  Yellow = "yellow",
  Off = "off",
}

export enum Intensity {
  Low = 1,
  Medium = 2,
  High = 3,
}

export type MidiMessage = [number, number, number];
export type Button = [ButtonType, number, number];
export type KeyPressEvent = [Button, KeyState];

export interface LaunchpadEventEmitter extends EventEmitter {
  on(event: "key", listener: (event: KeyPressEvent) => void): this;
  on(event: "up", listener: (button: Button) => void): this;
  on(event: "down", listener: (button: Button) => void): this;
  on(event: "connect", listener: () => void): this;
  on(event: "disconnect", listener: () => void): this;
}

export class LaunchpadEventEmitter extends EventEmitter {}

export type LaunchpadController = {
  connect: (port?: number) => void;
  disconnect: () => void;
  setColor: (button: Button, color: Color, intensity?: Intensity) => void;
  reset: () => void;
  events: LaunchpadEventEmitter;
};

export type ControllerState =
  | {
      connected: true;
      input: Input;
      output: Output;
    }
  | {
      connected: false;
      input: null;
      output: null;
    };
