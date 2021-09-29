# launchpad-controller

API for interacting with Launchpad devices.
Only tested/implemented on Launchpad Mini so far, likely to not work on other devices.

# Usage guide

### Basic connection and disconnection to a launchpad device

```js
import {controller} from 'launchpad-controller';

// spawn a controller instance
const launchpad = controller();

// Do stuff

// disconnect
launchpad.disconnect();
```

### Finer control over connection

You may want to do something once the connection has been established. The even emitter interface will provide `connected` / `disconnected` events for this purpose. You can also customise the connection port instead of allowing the controller to use the first available launchpad device.

```js
// Passing false to controller() will prevent auto connection (you'll need to call connect() manually)
const launchpad = controller(false);

launchpad.events.on("connect", () => {
  console.log("Connected");
});

launchpad.events.on("disconnect", () => {
  console.log("Disconnected");
});

launchpad.connect();

// "Connected"

launchpad.disconnect();

// "Disconnected"
```

### Listening to key events

This is the interface to the buttons on your Launchpad.

```js
const launchpad = controller();

launchpad.events.on("key", console.log);

/* Press some buttons on your launchpad.
   You'll receive messages in the format [[ButtonType, x, y], KeyState]
   These enums can be imported from the library, and will resolve to their strings.
   e.g. [[ButtonType.Grid, 0, 0], KeyState.Up] === [["grid", 0, 0], "up"] */

/* You can also listen to just "up" or "down" events, in which case you'll
   only receive the button that was pressed i.e. [ButtonType.Automap, 3, 0] */
```


### Changing board colours

```js
const launchpad = controller();

launchpad.setColor(
  [Button.Grid, 0, 0],
  Color.Red,
  Intensity.High
);

// Available colours: Red, Green, Amber, Yellow, Off
// Available intensities: High, Medium, Low
```

### Resetting the board

```js
const launchpad = controller();

// Do stuff

// Send a reset message to the midi device, blanking all the keys.
launchpad.reset();
```