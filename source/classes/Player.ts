import { Scene, TransformNode, Vector3, Animation, ExponentialEase, SpotLight} from "babylonjs";
import { Level } from "./Level";
import { EventBus } from "./Bus";
import { AssetsManager } from "./Assets";
import { up, down, nightmareOffset } from "@/shared/vectors";
import { InputDirection, State, World } from "@/shared/types";

export class Player {
    assetName: string;
    scene: Scene;
    level: Level;
    bus: EventBus;
    light: SpotLight;
    mesh: TransformNode;
    world: World;

    _isMoving?: boolean;
    _keyHandler?: (this: Window, key: KeyboardEvent) => void;
    _moveQueue: Vector3[] = [];
    _willChange: Boolean = false;
    _willSwitch: Boolean = false;
    _canMove: Boolean = false;

    constructor(scene: Scene, level: Level, bus: EventBus, light: SpotLight) {
        this.assetName = "player-1";
        this.scene = scene;
        this.level = level;
        this.bus = bus;
        this.light = light;
        this.world = this.level.spawnWorld;

        let spawnpoint = this.level.getSpawnPoint(this.world);

        this.mesh = this.level.assets.createInstance(
            "player",
            spawnpoint.add(up.scale(2.5)),
        );
        this.bus.on("animatePlayer", (data: {
            anim: string,
            stopAll: boolean,
            loop: boolean
        }) => this.animatePlayer(data));
        this.animatePlayer({
            anim: "Idle",
            stopAll: true,
            loop: true
        });
                this.level.assets.getAnimationGroupByName(this.assetName, "Jump_Land")?.onAnimationGroupEndObservable.add(() => {
          this.animatePlayer("Idle", true, true);
          //anim.onAnimationGroupEndObservable.clear();
        });
        this.light.direction = this.mesh.position.subtract(this.light.position);

        this.mesh.rotation.y = Math.atan2(0, -1);

        this.bus.on("computedMove", (data: InputDirection) => this.move(data));
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

    processNextMove() {
        if (!this._canMove) {
            this._moveQueue = [];
            return;
        }

        // No more moves in the move queue
        if (this._moveQueue.length === 0) {
            this._isMoving = false;
            return;
        }

        const direction = this._moveQueue.shift()!;

        const position = this.getPosition(false);
        //console.log("Player position : ", position);

        const frontPosition = position.add(direction);
        const frontState = this.level.getTileState(frontPosition, this.world);
        const frontGroundState = this.level.getTileState(
            frontPosition.add(down),
            this.world,
        );

        if (frontGroundState != State.Ground && frontGroundState != State.Box) return;
        if (frontState === State.Ground || frontState === State.Rock) return;
        if (frontState === State.Flag) this._willChange = true;
        if (frontState === State.Portal) this._willSwitch = true;
        if (frontState === State.Box) {
            const box = this.level.findBoxByPos(frontPosition);
            const hasBeenPushed = box.tryToPush(direction);
            if (!hasBeenPushed) return;
        }

        // le .add(direction) doit dépendre du monde (vu que les coordonnées des mouvs sont inversées)
        // mais n'importe quoi ça allez dire ça aux oligarques
        // mais à la base si c'est juste qu'on est des zgegs donc on est pas allé jusque là
        let nextPosition = this.mesh.position.add(direction);
        this.bus.emit("addMove", {
          move: this.level._currentMove,
          tileState: State.Player,
          position: this.mesh.position,
          world: this.world,
          ref: this,
        });
        this.animateMove(nextPosition);
        
        this.level._currentMove++;
        //console.log("Player next position : ", nextPosition);
    }

    move(data: InputDirection) {
        //console.log("Input : ", this._moveQueue, this._canMove, this._isMoving);
        if (!this._canMove) {
            this._moveQueue = [];
            return;
        }
        if (this._moveQueue.length >= 1) {
            return;
        }

        this._moveQueue.push(new Vector3(data.x, 0, data.y));
        if (!this._isMoving) {
            this.processNextMove();
        }
    }

    animateSpawn(spawnPoint: Vector3) {
        const duration = 60;
        let spawnAnim = new Animation(
            "spawnAnim",
            "position",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        let moveKeys = [];
        moveKeys.push({ frame: 0, value: this.mesh.position });
        moveKeys.push({ frame: duration, value: spawnPoint.clone() });
        spawnAnim.setKeys(moveKeys);

        this.mesh.animations = [spawnAnim];

        const easeFunction = new ExponentialEase();
        easeFunction.setEasingMode(ExponentialEase.EASINGMODE_EASEOUT);
        spawnAnim.setEasingFunction(easeFunction);
        
        let anim = this.scene.beginAnimation(this.mesh, 0, duration, false);
        anim.onAnimationEnd = () => {
            this._canMove = true;
        };
    }

    // Animation end triggers processing of next move in queue
    animateMove(newPosition: Vector3) {
        this.bus.emit("addQueue");
        this._isMoving = true;

        this.animatePlayer({
            anim: "Jump_Start", 
            stopAll: false,
            loop: false
        });
        
        const duration = 12;
        const midDuration = Math.floor(duration / 2);

        let moveAnim = new Animation(
            "moveAnim",
            "position",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        let moveKeys = [];
        moveKeys.push({ frame: 0, value: this.mesh.position.clone() });

        let midPosition = Vector3.Lerp(this.mesh.position, newPosition, 0.5);
        midPosition.y += 0.2;
        moveKeys.push({ frame: midDuration, value: midPosition });
        moveKeys.push({ frame: duration, value: newPosition });

        moveAnim.setKeys(moveKeys);
        let direction = newPosition.subtract(this.mesh.position);
        let targetRotation = Math.atan2(direction.x, direction.z);
        const currentRotation = this.mesh.rotation.y;
        let delta = targetRotation - currentRotation;

        if (delta > Math.PI) {
            targetRotation -= 2 * Math.PI;
        } else if (delta < -Math.PI) {
            targetRotation += 2 * Math.PI;
        }

        let rotationAnim = new Animation(
            "rotateAnim",
            "rotation.y",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        let rotationKeys = [];
        rotationKeys.push({ frame: 0, value: currentRotation });
        rotationKeys.push({ frame: duration, value: targetRotation });

        rotationAnim.setKeys(rotationKeys);
        this.mesh.animations = [moveAnim, rotationAnim];

        let anim = this.scene.beginAnimation(this.mesh, 0, duration, false);

        anim.onAnimationEnd = () => {
            this._isMoving = false;
            this.light.direction = this.mesh.position.subtract(this.light.position);
            this.animatePlayer({
                anim: "Jump_Land", 
                stopAll: true,
                loop: false
            });
            if (this._willChange) {
                this._willChange = false;
                this.bus.emit("nextlevel");
                this._canMove = false;
            } else if (this._willSwitch) {
                this._willSwitch = false;
                this.bus.emit("switch");
            }

            this.bus.emit("removeQueue");
            //this.processNextMove();
        };
    }

    // Flip worlds animation (hourglass)
    animateSwitchWorld(newPosition: Vector3) {
        this._canMove = false;
        this.animateSpawn(newPosition);
    }

    // A utiliser uniquement pour revenir en arrière
    setPosition(position: Vector3, world:World) {
        this.mesh.position = position;
        this.world = world;
    }

    animatePlayer(data: {
        anim: string, 
        stopAll: boolean, 
        loop: boolean
    }) {
        this.bus.emit("playAnim", {
            asset: this.assetName,
            anim: data.anim,
            stopAll: data.stopAll,
            loop: data.loop
        });
    }
    
    dispose() {
        this.bus.remove("computedMove");
        this.bus.remove("animatePlayer");
        this.mesh.dispose();
    }
}
