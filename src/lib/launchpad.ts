import midi from "midi";
import R from "ramda";

import {
  KeyState,
  Button,
  MidiMessage,
  KeyPressEvent,
  ButtonType,
  Color,
  Intensity,
  LaunchpadEventEmitter,
  LaunchpadController,
  ControllerState,
} from "./types";

const keyState = (byte: number): KeyState =>
  byte > 0 ? KeyState.Down : KeyState.Up;

const GRID_BUTTON_CODE = 144;
const SCENE_BUTTON_CODE = 144;
const AUTOMAP_BUTTON_CODE = 176;

// Mapping of button types to code for reading/writing messages to that button
const getButtonMessageCode = ([type]: Button): number => {
  switch (type) {
    case ButtonType.Automap:
      return AUTOMAP_BUTTON_CODE;
    case ButtonType.Scene:
      return SCENE_BUTTON_CODE;
    case ButtonType.Grid:
      return GRID_BUTTON_CODE;
    default:
      throw new Error(`Unknown button type: ${type}`);
  }
};

// Get the decimal positional value of a button, based on type and coordinate
const getButtonPositionCode = ([type, x, y]: Button): number => {
  switch (type) {
    case ButtonType.Automap:
      return x + 104;
    case ButtonType.Scene:
      return y * 16 + 8;
    case ButtonType.Grid:
      return y * 16 + x;
    default:
      throw new Error(`Unknown button type: ${type}`);
  }
};

const getColorCode = (color: Color, intensity: Intensity): number => {
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
  switch (status) {
    case AUTOMAP_BUTTON_CODE: {
      const x = key - 104;
      return [[ButtonType.Automap, x, 0], keyState(state)];
    }
    case SCENE_BUTTON_CODE:
    case GRID_BUTTON_CODE: {
      const x = key % 16;
      const y = (key - x) / 16;

      if (x === 8) {
        return [[ButtonType.Scene, 0, y], keyState(state)];
      }

      return [[ButtonType.Grid, x, y], keyState(state)];
    }
    default:
      throw new Error(`Unrecognised keypress code: ${status}`);
  }
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

      state.input.openPort(port || getFirstLaunchpadDevicePort(state.input));
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
      if (state.connected) {
        state.output.sendMessage([
          getButtonMessageCode(button),
          getButtonPositionCode(button),
          getColorCode(color, intensity),
        ]);
      }
    },
  };

  if (autostart) {
    instance.connect();
  }

  return instance;
};
