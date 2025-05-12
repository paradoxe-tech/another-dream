import { EventBus } from "@/classes/Bus";
import { INPUT_DOWN, INPUT_LEFT, INPUT_RIGHT, INPUT_UP } from "@/shared/types";

export class KeyboardInput {
  _bus: EventBus;
  _keyHandler?: (this: Window, key: KeyboardEvent) => void;
  
  constructor(bus: EventBus) {
    this._bus = bus;
    
    this._keyHandler = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") this._bus.emit("primitiveMove", INPUT_UP);
      if (event.key === "ArrowDown") this._bus.emit("primitiveMove", INPUT_DOWN);;
      if (event.key === "ArrowLeft") this._bus.emit("primitiveMove", INPUT_LEFT);;
      if (event.key === "ArrowRight") this._bus.emit("primitiveMove", INPUT_RIGHT);
      if (event.key === "p") this._bus.emit("previouslevel");
      if (event.key === "n") this._bus.emit("nextlevel");
      if (event.key === "r") this._bus.emit("restart");
      if (event.key === "b") this._bus.emit("back");
    };
    window.addEventListener("keydown", this._keyHandler);
  }
}