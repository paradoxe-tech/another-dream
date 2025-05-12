import { InputController } from "./InputController";
import { EventBus } from "@/classes/Bus";

// Idée : utilise HammerJS
// et aussi s'inspirer de
// https://github.com/RolandCsibrei/babylonjs-hammerjs-arc-rotate-camera/blob/main/src/utils/ArcRotateCameraHammerJsInput.ts

export class TouchInput {
  _bus: EventBus;
  
  constructor(bus: EventBus) {
    this._bus = bus;
  }
}