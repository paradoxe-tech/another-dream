import { Engine, Scene, VirtualJoystick } from "babylonjs";
import { INPUT_DOWN, INPUT_LEFT, INPUT_RIGHT, INPUT_UP } from "@/shared/types";
import { EventBus } from "@/classes/Bus";

// Idée : utilise HammerJS
// et aussi s'inspirer de
// https://github.com/RolandCsibrei/babylonjs-hammerjs-arc-rotate-camera/blob/main/src/utils/ArcRotateCameraHammerJsInput.ts

export class TouchInput {
    _bus: EventBus;
    scene: Scene;
    engine: Engine;
    joystick: VirtualJoystick;
    
    constructor(bus: EventBus, scene: Scene, engine: Engine) {
        this._bus = bus;
        this.joystick = new VirtualJoystick(true);
        if (VirtualJoystick.Canvas) VirtualJoystick.Canvas.style.zIndex = "0";
        this.scene = scene;
        this.engine = engine;
        this.scene.onBeforeRenderObservable.add(()=>{
                if(this.joystick.pressed){
                        const absX = Math.abs(this.joystick.deltaPosition.x);
                        const absY = Math.abs(this.joystick.deltaPosition.y);
    
                        let dominantDirection: {x: number, y: number} | null = null;
    
                        if (absX > absY) {
                            dominantDirection = this.joystick.deltaPosition.x > 0 ? INPUT_RIGHT  : INPUT_LEFT;
                        } else if (absY > absX) {
                            dominantDirection = this.joystick.deltaPosition.y > 0 ? INPUT_UP : INPUT_DOWN; 
                        }
    
                        if (dominantDirection) {
                            this._bus.emit("primitiveMove", dominantDirection);
                        }

                }
        })
    }
}