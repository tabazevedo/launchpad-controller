import test from "ava";
import midi from "midi";
import { ButtonType, Color, Intensity, start } from "./launchpad";

test("start", t => {
  const launchpad = start();

  launchpad.setColor(
    [ButtonType.Grid, 0, 0],
    Color.Green,
    Intensity.High
  );

  t.pass();
});
