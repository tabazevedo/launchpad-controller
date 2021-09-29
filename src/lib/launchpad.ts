import { EventEmitter } from "events";
import midi from "midi";
import R from "ramda";

enum KeyState {
  Down,
  Up
}

const keyState = (byte: number): KeyState =>
  byte > 0 ? KeyState.Down : KeyState.Up;

type MidiMessage = [number, number, number];
type Button = [ButtonType, number, number];

export enum ButtonType {
  Grid,
  Top,
  Right
}

type KeyPressEvent = [Button, KeyState];

export enum Color {
  Green,
  Red,
  Amber,
  Yellow,
  Off
}

export enum Intensity {
  Low = 1,
  Medium = 2,
  High = 3
}

const unmapButton = ([type, x, y]: Button): number => {
  switch (type) {
    case ButtonType.Top:
      return x + 104;
    default:
      return y * 16 + x;
  }
};

const getColorCommand = (color: Color, intensity: Intensity): number => {
  switch (color) {
    case Color.Green:
      return 0b10000 * intensity;
    case Color.Red:
      return 0b00001 * intensity;
    case Color.Amber:
      return 0b10001 * intensity;
    case Color.Yellow:
      return intensity > 0 ? 0b110010 : 0;
    case Color.Off:
      return 0;
  }
};

const mapKeyPress = ([status, key, state]: MidiMessage): KeyPressEvent => {
  if (status === 176) {
    const x = key - 104;
    return [[ButtonType.Top, x, 0], keyState(state)];
  }

  if (status === 144) {
    const x = key % 16;
    const y = (key - x) / 16;

    if (x === 8) {
      return [[ButtonType.Right, 8, y], keyState(state)];
    }

    return [[ButtonType.Grid, x, y], keyState(state)];
  }

  throw new Error(`Unrecognised keypress: ${status}`);
};

const getFirstLaunchpadDevicePort = (
  io: midi.NodeMidiInput | midi.NodeMidiOutput
): number => {
  const port = R.range(0, io.getPortCount()).findIndex(
    (_, index) => io.getPortName(index).indexOf("Launchpad") >= 0
  );

  if (port === -1) {
    throw new Error("No launchpad device found!");
  }

  return port;
};

declare interface LaunchpadEventEmitter {
  on(event: "key", listener: (event: KeyPressEvent) => void): this;
  on(event: "up", listener: (button: Button) => void): this;
  on(event: "down", listener: (button: Button) => void): this;
  on(event: string, listener: Function): this;
}

class LaunchpadEventEmitter extends EventEmitter {}

export function start(port?: number) {
  const events = new LaunchpadEventEmitter();

  const input = new midi.input();
  const output = new midi.output();

  input.openPort(port || getFirstLaunchpadDevicePort(input));
  output.openPort(port || getFirstLaunchpadDevicePort(output));

  input.on("message", (_: number, message: MidiMessage) => {
    const event = mapKeyPress(message);
    const [key, keyState] = event;

    events.emit("key", event);
    if (keyState === KeyState.Up) events.emit("up", key);
    if (keyState === KeyState.Down) events.emit("down", key);
  });

  return {
    disconnect: () => {
      input.closePort();
      output.closePort();
    },
    events,
    reset: (): void => output.sendMessage([176, 0, 0]),
    setColor: (button: Button, color: Color, intensity: Intensity): void => {
      output.sendMessage([
        144,
        unmapButton(button),
        getColorCommand(color, intensity)
      ]);
    }
  };
}
