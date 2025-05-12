import { Level } from "./Level";
import { Scene, Vector3, TransformNode, Animation, ExponentialEase, StandardMaterial } from "babylonjs";
import { Player } from "./Player";
import { GameError } from "./Error";
import { up, down, nightmareOffset } from "@/shared/vectors";
import { State, World } from "@/shared/types";

export class Box {
    level: Level;
    scene: Scene;
    mesh: TransformNode;
    world: World;

    constructor(level: Level, scene: Scene, position: Vector3, world: World) {
        this.level = level;
        this.scene = scene;
        this.world = world;
        this.mesh = this.level.assets.createInstance("box", position, false);
        this.mesh.position = position;
    }

    getPosition(global = false): Vector3 {
        const globalPosition = new Vector3(
            Math.round(this.mesh.position.x),
            Math.round(this.mesh.position.y),
            Math.round(this.mesh.position.z),
        );

        if (global && this.world === World.Nightmare) {
            return globalPosition.subtract(nightmareOffset);
        }
        return globalPosition;
    }

    getPositionByPos(position: Vector3, world:World, global=false) : Vector3 {
        const globalPosition = new Vector3(
            Math.round(position.x),
            Math.round(position.y),
            Math.round(position.z),
        );

        if (global && world === World.Nightmare) {
            return globalPosition.subtract(nightmareOffset);
        }
        return globalPosition;
    }

    dispose() {
        this.mesh.dispose();
    }

    push(direction: Vector3) {
        const newPosition = this.mesh.position.add(direction);

        if (this.level.getTileState(newPosition, this.world) == State.Void) {
            this.level.bus.emit("addMove", {
              move: this.level._currentMove,
              tileState: State.Void,
              position: newPosition,
              world: this.world,
              ref: null,
            })
        }
        this.level.bus.emit("addMove", {
          move: this.level._currentMove,
          tileState: State.Box,
          position: this.mesh.position,
          world: this.world,
          ref: this,
        });
        
        this.level.updateTileState(this.mesh.position, State.Void, this.world);
        this.level.updateTileState(newPosition, State.Box, this.world);
        this.pushAnim(newPosition);     
    }

    pushAnim(newPosition: Vector3) {
        this.level.bus.emit("animatePlayer", {
            anim: "Interact",
            stopAll: true,
            loop: false,
            nextAnim: "Idle"
        });
        this.level.bus.emit("addQueue");
        const duration = 12;
        const frontPos = new Vector3(newPosition.x, this.mesh.position.y, newPosition.z);
        
        let moveAnim = new Animation(
            "moveAnim",
            "position",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        let moveKeys = [];
        moveKeys.push({ frame: 0, value: this.mesh.position.clone() });
        moveKeys.push({ frame: duration, value : frontPos })

        moveAnim.setKeys(moveKeys);

        this.mesh.animations = [moveAnim];
        const anim = this.scene.beginAnimation(this.mesh, 0, duration, false);
        
        if (newPosition == frontPos) {
            this.level.bus.emit("removeQueue");
            return;
        }
        
        let fallAnim = new Animation(
            "fallAnim",
            "position",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        let fallKeys = [];
        fallKeys.push({ frame: 0, value: frontPos });
        fallKeys.push({ frame: duration/2, value: newPosition });

        fallAnim.setKeys(fallKeys);

        anim.onAnimationEnd = () => {
            this.mesh.animations = [fallAnim];
            const anim2 = this.scene.beginAnimation(this.mesh, 0, duration/2, false);
            anim2.onAnimationEnd = () => {
                this.level.bus.emit("animatePlayer", {
                    anim: "Idle",
                    stopAll: true,
                    loop: true,
                    nextAnim: ""
                });
                this.level.bus.emit("removeQueue");
            }
        }
        
        
    }

    switchWorldAnim(spawnPoint: Vector3) {
        const duration = 60;
        let spawnAnim = new Animation(
            "spawnAnim",
            "position",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        let moveKeys = [];
        moveKeys.push({ frame: 0, value: spawnPoint.add(up.scale(2.5)) });
        moveKeys.push({ frame: duration, value: spawnPoint.clone() });
        spawnAnim.setKeys(moveKeys);

        this.mesh.animations = [spawnAnim];

        const easeFunction = new ExponentialEase();
        easeFunction.setEasingMode(ExponentialEase.EASINGMODE_EASEOUT);
        spawnAnim.setEasingFunction(easeFunction);

        this.scene.beginAnimation(this.mesh, 0, duration, false);
        
    }
    
    tryToPush(direction: Vector3, s = 1): boolean {
        const position = this.mesh.position;
        let upPosition = position.add(up);
        let stack = s;
        while(this.level.getTileState(upPosition, this.world) == State.Box) {
            stack += 1;
            upPosition = upPosition.add(up);
        }

        if (stack >= 3) return false;

        const nextPosition = position.add(direction);
        const nextGroundPosition = nextPosition.add(down);

        const nextFrontState = this.level.getTileState(nextPosition, this.world,);
        const nextGroundState = this.level.getTileState(nextGroundPosition, this.world);

        if (nextFrontState == State.Ground || nextFrontState == State.Rock || nextFrontState == State.Flag || nextFrontState == State.Portal) return false;

        if (nextGroundState == State.Void) {
            const y_down = position.y - (this.level.getDroppablePosition(nextGroundPosition, this.world)).y
            while (!upPosition.equals(position)) {
                upPosition = upPosition.add(down);
                this.level.findBoxByPos(upPosition).push(direction.add(down.scale(y_down)));
            }
            return true;
        }

        if (nextFrontState == State.Box) {
            const nextBox = this.level.findBoxByPos(nextPosition);
            const hasBeenPushed = nextBox.tryToPush(direction, stack + 1);
            if (hasBeenPushed)  {
                while (!upPosition.equals(position)) {
                    upPosition = upPosition.add(down);
                    this.level.findBoxByPos(upPosition).push(direction);
                }
            }
            return hasBeenPushed;
        }

        while (!upPosition.equals(position)) {
            upPosition = upPosition.add(down);
            this.level.findBoxByPos(upPosition).push(direction);
        }

        return true;
    }

    setPosition(position: Vector3, world:World) {
        this.level.updateTileState(position, State.Box, world);
        this.mesh.position = position;
        this.world = world;
    }
}
