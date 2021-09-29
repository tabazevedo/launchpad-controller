import { EventEmitter } from "events";
import midi from "midi";
import R from "ramda";

enum KeyState {
  Down = "down",
  Up = "up",
}

const keyState = (byte: number): KeyState =>
  byte > 0 ? KeyState.Down : KeyState.Up;

type MidiMessage = [number, number, number];
type Button = [ButtonType, number, number];

export enum ButtonType {
  Grid = "grid",
  Top = "top",
  Right = "right",
}

type KeyPressEvent = [Button, KeyState];

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

const getFirstLaunchpadDevicePort = (io: midi.Input | midi.Output): number => {
  const port = R.range(0, io.getPortCount()).findIndex(
    (_, index) => io.getPortName(index).indexOf("Launchpad") >= 0
  );

  if (port === -1) {
    throw new Error("No launchpad device found!");
  }

  return port;
};

declare class LaunchpadEventEmitter extends EventEmitter {
  on(event: "key", listener: (event: KeyPressEvent) => void): this;
  on(event: "up", listener: (button: Button) => void): this;
  on(event: "down", listener: (button: Button) => void): this;
  on(event: "connect", listener: () => void): this;
  on(event: "disconnect", listener: () => void): this;
}

type LaunchpadController = {
  connect: (port?: number) => void;
  disconnect: () => void;
  setColor: (button: Button, color: Color, intensity?: Intensity) => void;
  reset: () => void;
  events: LaunchpadEventEmitter;
};

type ControllerState =
  | {
      connected: true;
      input: midi.Input;
      output: midi.Output;
    }
  | {
      connected: false;
      input: null;
      output: null;
    };

export const controller = (autostart = true): LaunchpadController => {
  const events = new LaunchpadEventEmitter();

  let state: ControllerState = {
    connected: false,
    input: null,
    output: null,
  };

  const instance: LaunchpadController = {
    connect: (port) => {
      if (state.connected) {
        throw new Error("Cannot connected: already connected to Launchpad");
      }

      state = {
        connected: true,
        input: new midi.Input(),
        output: new midi.Output(),
      };

      state.input.on("message", (_: number, message: MidiMessage) => {
        const event = mapKeyPress(message);
        const [key, keyState] = event;

        events.emit("key", event);
        if (keyState === KeyState.Up) events.emit("up", key);
        if (keyState === KeyState.Down) events.emit("down", key);
      });

      state.output.openPort(port || getFirstLaunchpadDevicePort(state.output));

      events.emit("connected");
    },
    disconnect: () => {
      if (!state.connected) {
        throw new Error("Cannot disconnect: no active connection to Launchpad");
      }

      state.input.closePort();
      state.output.closePort();
      state = {
        connected: false,
        input: null,
        output: null,
      };

      events.emit("disconnected");
    },
    events,
    reset: () => {
      if (state.connected) state.output.sendMessage([176, 0, 0]);
    },
    setColor: (button, color, intensity = Intensity.High) => {
      if (state.connected)
        state.output.sendMessage([
          144,
          unmapButton(button),
          getColorCommand(color, intensity),
        ]);
    },
  };

  if (autostart) {
    instance.connect();
  }

  return instance;
};
