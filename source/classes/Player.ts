import {
    Scene,
    TransformNode,
    Vector3,
    Animation,
    ExponentialEase
} from "babylonjs";
import { Level } from "./Level";
import { EventBus } from "./Bus";
import { up, down, nightmareOffset } from "@/shared/vectors";
import { InputDirection, State, World } from "@/shared/types";

export class Player {
    assetName: string;
    scene: Scene;
    level: Level;
    bus: EventBus;
    mesh: TransformNode;
    world: World;

    _isMoving?: boolean;
    _keyHandler?: (this: Window, key: KeyboardEvent) => void;
    _moveQueue: Vector3[] = [];
    _lastVisitedIsPortal: boolean = false;
    _willChange: Boolean = false;
    _willSwitch: Boolean = false;
    _canMove: Boolean = false;
    _queue: number = 0;

    constructor(scene: Scene, level: Level, bus: EventBus) {
        this.assetName = "player-1";
        this.scene = scene;
        this.level = level;
        this.bus = bus;
        this.world = this.level.spawnWorld;

        let spawnpoint = this.level.getSpawnPoint(this.world);

        this.mesh = this.level.assets.createInstance(
            "player",
            spawnpoint.add(up.scale(2.5)),
        );
        this.bus.on(
            "animatePlayer",
            (data: { anim: string; stopAll: boolean; loop: boolean }) =>
                this.animatePlayer(data),
        );
        this.animatePlayer({
            anim: "Idle",
            stopAll: true,
            loop: true,
        });
        this.level.assets
            .getAnimationGroupByName(this.assetName, "Jump_Land")
            ?.onAnimationGroupEndObservable.add(() => {
                this.animatePlayer({
                    anim: "Idle",
                    stopAll: true,
                    loop: true,
                });
                //anim.onAnimationGroupEndObservable.clear();
            });

        this.mesh.rotation.y = Math.atan2(0, -1);

        this.bus.on("computedMove", (data: InputDirection) => this.move(data));
    }

    set queue(nb: number) {
        this._queue += nb;
        //console.log("Queue : ", this._queue);
        if (this._queue == 0) {
            this.processNextMove();
        }
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

        let nextPosition = this.mesh.position.add(direction);

        if (frontGroundState != State.Ground && frontGroundState != State.Box) {
            this.animateFailMove(nextPosition);
            return;
        }
        if (frontState === State.Ground || frontState === State.Rock) {
            this.animateFailMove(nextPosition);
            return;
        }
        
        if (/^\d+$/.test(frontState)) {
            // make UI element "enter level" appear
            this.level.setAlpha(frontPosition, 0.3);
            this.bus.emit("changeLevelPossible", {level: parseInt(frontState)});
            this._lastVisitedIsPortal = true;
        } else {
            // make UI element "enter level" disappear
            if (this._lastVisitedIsPortal) {
                this.level.setAlpha(position, 1);
                this.bus.emit("changeLevelNotPossible");
            }
            this._lastVisitedIsPortal = false;
        }
        
        if (frontState === State.Flag) {
            this.level.setAlpha(frontPosition, 0.3, this.world, true);
            this._willChange = true;
            this.bus.emit("completeLevel");
        }
        if (frontState === State.Portal || frontState === State.PortalRotated) {
            this.level.setAlpha(frontPosition, 0.3, this.world, true);
            this._willSwitch = true;
        }
        if (frontState === State.Box) {
            const box = this.level.findBoxByPos(frontPosition);
            const hasBeenPushed = box.tryToPush(direction);
            if (!hasBeenPushed) {
                this.animateFailMove(nextPosition);
                return;
            } else {
                this.bus.emit("sound", "box");
            }
        }

        // le .add(direction) doit dépendre du monde (vu que les coordonnées des mouvs sont inversées)
        // mais n'importe quoi ça allez dire ça aux oligarques
        // mais à la base si c'est juste qu'on est des z$#gs donc on est pas allé jusque là
        // note de votre manager : pensez à retirer ce commentaire
        // j'ai déjà été censuré, je ne retirerai pas en plus mes propos
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
        //console.log("Input : ", this._moveQueue, this._canMove, this._isMoving, this._queue);
        if (!this._canMove) {
            this._moveQueue = [];
            return;
        }
        if (this._moveQueue.length >= 1) {
            return;
        }
        

        this._moveQueue.push(new Vector3(data.x, 0, data.y));
        if (!this._isMoving && this._queue == 0) {
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
        this.bus.emit("move", {oldPos : this.getPosition(), newPos : newPosition } );
        // this.bus.emit("sound", "move");
        this._isMoving = true;

        /*
        this.animatePlayer({
            anim: "Jump_Start", 
            stopAll: false,
            loop: false
        }); 
        */

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

        anim.onAnimationEnd = async () => {
            this._isMoving = false;
            //this.bus.emit("removeQueue");
            
            this.animatePlayer({
                anim: "Idle", 
                stopAll: true,
                loop: true
            }); 
            if (this._willChange) {
                this._canMove = false;
                this.bus.emit("removeQueue");
                this.bus.emit("sound", "win");
                await sleep(3000);
                this.bus.emit("changeLevel", 0);
                // this.bus.emit("nextlevel"); // Temporaire
            } else if (this._willSwitch) {
                this._willSwitch = false;
                this.bus.emit("switch");
                this.bus.emit("sound", "teleport");
            }

            if (!this._willChange) {
                //console.log("C'est la fete du slip");
                this.bus.emit("removeQueue");
            }
            // this.processNextMove();
        };
    }

    // Animation when player movement is impossible
    animateFailMove(newPosition: Vector3) {
        this.bus.emit("addQueue");
        this.bus.emit("shake");
        this.bus.emit("sound", "error");
        this._isMoving = true;

        const duration = 6;
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

        let midPosition = Vector3.Lerp(this.mesh.position, newPosition, 0.3);
        //midPosition.y += 0.2;
        moveKeys.push({ frame: midDuration, value: midPosition });
        moveKeys.push({ frame: duration, value: this.mesh.position.clone() });

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
    setPosition(position: Vector3, world: World) {
        this.mesh.position = position;
        this.world = world;
    }

    animatePlayer(data: { anim: string; stopAll: boolean; loop: boolean }) {
        this.bus.emit("playAnim", {
            asset: this.assetName,
            anim: data.anim,
            stopAll: data.stopAll,
            loop: data.loop,
        });
    }

    dispose() {
        this.bus.remove("computedMove");
        this.bus.remove("animatePlayer");
        this.mesh.dispose();
    }
}
