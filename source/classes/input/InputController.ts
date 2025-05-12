import { EventBus } from "@/classes/Bus";
import { KeyboardInput } from "./KeyboardInput";
import { TouchInput } from "./TouchInput";
import { ArcRotateCamera, ArcRotateCameraPointersInput, Orientation } from "babylonjs";
import { Game } from "@/classes/Game";
import { 
  InputDirection, 
  INPUT_LEFT, 
  INPUT_RIGHT, 
  INPUT_UP, 
  INPUT_DOWN, 
  RenderingCanvas 
} from "@/shared/types";

// This class allows for abstraction regarding input type
export class InputController {
  _bus: EventBus;
  _gameCamera?: ArcRotateCamera;
  _keyInput?: KeyboardInput;
  _touchInput?: TouchInput;
  cameraPointerInput?: ArcRotateCameraPointersInput;
  isTouchDevice: boolean = false;
  
  constructor(game: Game) {
    this._bus = game.bus;

    let deviceAgent = navigator.userAgent.toLowerCase();
    if (
      ('ontouchstart' in window) 
      || (navigator.maxTouchPoints > 0)
      || (deviceAgent.match(/(iphone|ipod|ipad|android|ipad|ipod|blackberrt|bada)/i))
    ) {
      this.isTouchDevice = true;
    }
    
    // Creates a controller according to input type
    if (this.isTouchDevice) {
      this._touchInput = new TouchInput(this._bus);
    } else {
      this._keyInput = new KeyboardInput(this._bus);
    }

    this._bus.on("primitiveMove", (data: InputDirection) => this._primitiveMoveHandler(data));
  }

  updateCamera(camera: ArcRotateCamera, canvas: RenderingCanvas) {
    this._gameCamera = camera;
    this._gameCamera.attachControl(canvas, true);
    // Allow for customization in InputController
    /*
    this.cameraPointerInput = new ArcRotateCameraPointersInput();
    this.cameraPointerInput.multiTouchPanAndZoom = false;
    this._gameCamera?.inputs.clear();
    this._gameCamera?.inputs.add(this.cameraPointerInput); 
    */
    this._gameCamera?.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  }
  
  // Shortcut to send final computed move to bus
  _emitMove(data: InputDirection) {
    this._bus.emit("computedMove", data);
  }

  // Handle input event according to camera position
  // so that when you press RIGHT, you really go RIGHT
  // even if the camera rotated
  _primitiveMoveHandler(data: InputDirection) {
    if(this._gameCamera) {
      if(this._gameCamera?.alpha) {
        const rawAlpha = this._gameCamera?.alpha; 
        let alpha = Math.atan2(Math.sin(rawAlpha), Math.cos(rawAlpha));
        if (alpha < 0) {
          alpha = Math.abs(alpha) + 2 * (Math.PI - Math.abs(alpha));
        }
        let orientation: Orientation = 0;
        if (alpha > 3*Math.PI/4 && alpha <= 5*Math.PI/4) { // Initial camera angle
          orientation = Number(3);
          if (data == INPUT_UP) this._emitMove(INPUT_RIGHT);
          if (data == INPUT_DOWN) this._emitMove(INPUT_LEFT);
          if (data == INPUT_LEFT) this._emitMove(INPUT_UP);
          if (data == INPUT_RIGHT) this._emitMove(INPUT_DOWN);
        } else if (alpha > 5*Math.PI/4 && alpha <= 7*Math.PI/4) { // Rotated right once
          orientation = 0;
          if (data == INPUT_UP) this._emitMove(INPUT_UP);
          if (data == INPUT_DOWN) this._emitMove(INPUT_DOWN);
          if (data == INPUT_LEFT) this._emitMove(INPUT_LEFT);
          if (data == INPUT_RIGHT) this._emitMove(INPUT_RIGHT);
        } else if (alpha > 7*Math.PI/4 || alpha <= Math.PI/4) { // Rotated right twice
          orientation = 1;
          if (data == INPUT_UP) this._emitMove(INPUT_LEFT);
          if (data == INPUT_DOWN) this._emitMove(INPUT_RIGHT);
          if (data == INPUT_LEFT) this._emitMove(INPUT_DOWN);
          if (data == INPUT_RIGHT) this._emitMove(INPUT_UP);
        } else if (alpha > 1*Math.PI/4 && alpha <= 3*Math.PI/4) { // Last quadrant : rotated right 3 times
          orientation = Number(2);
          if (data == INPUT_UP) this._emitMove(INPUT_DOWN);
          if (data == INPUT_DOWN) this._emitMove(INPUT_UP);
          if (data == INPUT_LEFT) this._emitMove(INPUT_RIGHT);
          if (data == INPUT_RIGHT) this._emitMove(INPUT_LEFT);
        }
        this._bus.emit("rotated", {
          orientation: orientation
        });
      }
    }
  }
  
}