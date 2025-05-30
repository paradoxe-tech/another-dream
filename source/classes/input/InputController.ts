import { EventBus } from "@/classes/Bus";
import { KeyboardInput } from "./KeyboardInput";
import { TouchInput } from "./TouchInput";
import { ArcRotateCamera, ArcRotateCameraPointersInput, FollowCamera, Orientation } from "babylonjs";
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
    orientation: Orientation;
    _keyInput?: KeyboardInput;
    _touchInput?: TouchInput;
    cameraPointerInput?: ArcRotateCameraPointersInput;
    isTouchDevice: boolean = false;
    
    constructor(game: Game) {
        this._bus = game.bus;
        this.orientation = 3 as Orientation; // Default camera orientation in Game

        let deviceAgent = navigator.userAgent.toLowerCase();
        if (
            ('ontouchstart' in window) 
            || (navigator.maxTouchPoints > 0)
            || (deviceAgent.match(/(iphone|ipod|ipad|android|ipad|ipod|blackberry|bada)/i))
        ) {
            this.isTouchDevice = true;
        }
        
        // Creates a controller according to input type
        if (this.isTouchDevice) {
            this._touchInput = new TouchInput(this._bus, game.scene, game.engine);
        } else {
            this._keyInput = new KeyboardInput(this._bus);
        }

        this._bus.on("rotated", (data: {orientation: Orientation}) => this.orientation = data.orientation);
        this._bus.on("primitiveMove", (data: InputDirection) => this._primitiveMoveHandler(data));

        // Register handlers for world map portals
        this._bus.on("changeLevelPossible", (data: {level: number}) => this.makeChangeLevelPossible(data.level));
        this._bus.on("changeLevelNotPossible", () => this.makeChangeLevelNotPossible());
    }

    updateCamera(camera: ArcRotateCamera, canvas: RenderingCanvas) {
        this._gameCamera = camera;
        this._gameCamera.attachControl(canvas, true);
        // Compute orientation to make sure orientation is up to date
        this._bus.emit("recalcOrientation");
        
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
        switch (this.orientation) { 
            case 3 as Orientation:// Initial camera angle
                if (data == INPUT_UP) this._emitMove(INPUT_RIGHT);
                if (data == INPUT_DOWN) this._emitMove(INPUT_LEFT);
                if (data == INPUT_LEFT) this._emitMove(INPUT_UP);
                if (data == INPUT_RIGHT) this._emitMove(INPUT_DOWN);
                break;
            case 0 as Orientation:
                if (data == INPUT_UP) this._emitMove(INPUT_UP);
                if (data == INPUT_DOWN) this._emitMove(INPUT_DOWN);
                if (data == INPUT_LEFT) this._emitMove(INPUT_LEFT);
                if (data == INPUT_RIGHT) this._emitMove(INPUT_RIGHT);
                break;
            case 1 as Orientation:
                if (data == INPUT_UP) this._emitMove(INPUT_LEFT);
                if (data == INPUT_DOWN) this._emitMove(INPUT_RIGHT);
                if (data == INPUT_LEFT) this._emitMove(INPUT_DOWN);
                if (data == INPUT_RIGHT) this._emitMove(INPUT_UP);
                break;
            case 2 as Orientation:
                if (data == INPUT_UP) this._emitMove(INPUT_DOWN);
                if (data == INPUT_DOWN) this._emitMove(INPUT_UP);
                if (data == INPUT_LEFT) this._emitMove(INPUT_RIGHT);
                if (data == INPUT_RIGHT) this._emitMove(INPUT_LEFT);
                break;
            default:
                break;
        }
    }

    makeChangeLevelPossible(level: number) {
        this._bus.on("changeLevelRequest", () => {
            this._bus.emit("changeLevel", level);
        });
    }

    makeChangeLevelNotPossible() {
        this._bus.remove("changeLevelRequest");
    }
}