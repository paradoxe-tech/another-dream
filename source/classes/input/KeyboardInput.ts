import { EventBus } from "@/classes/Bus";
import { INPUT_DOWN, INPUT_LEFT, INPUT_RIGHT, INPUT_UP } from "@/shared/types";

export class KeyboardInput {
  _bus: EventBus;
  _keydownHandler?: (this: Window, key: KeyboardEvent) => void;
  _keyupHandler?: (this: Window, key: KeyboardEvent) => void;
  
  constructor(bus: EventBus) {
    this._bus = bus;
    
    this._keydownHandler = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
        case "z":
          this._bus.emit("primitiveMove", INPUT_UP);
          break;
        case "ArrowDown":
        case "s":
          this._bus.emit("primitiveMove", INPUT_DOWN);
          break;
        case "ArrowLeft":
        case "q":
          this._bus.emit("primitiveMove", INPUT_LEFT);
          break;
        case "ArrowRight":
        case "d":
          this._bus.emit("primitiveMove", INPUT_RIGHT);
          break;
        case "Enter":
        case "Space":
          this._bus.emit("changeLevelRequest");
          break;
        /*
        DEBUG
        case "p":
          this._bus.emit("previouslevel");
          break;
        case "n":
          this._bus.emit("nextlevel");
          break;
        case "a":
          this._bus.emit("path");
          break;
        */
        case "r":
          this._bus.emit("restart");
          break;
        case "b":
          this._bus.emit("back");
          break;
        case "c":
          this._bus.emit("resetCam");
          break;
        case "Escape":
        case "m": 
          this._bus.emit("backMap");
          break;
      }
    };
    window.addEventListener("keydown", this._keydownHandler);

    this._keyupHandler = (event: KeyboardEvent) => {
      this._bus.emit("keyup");
    };
    window.addEventListener("keyup", this._keyupHandler);
  }
}