import { Level } from "./Level";
import { Scene, Vector3, TransformNode, StandardMaterial } from "babylonjs";
import { up, down} from "../utils";
import { State } from "../types";

export class Box {
    level: Level;
    scene: Scene;
    mesh: TransformNode;

    constructor(level: Level, scene: Scene, position: Vector3) {
        this.level = level;
        this.scene = scene;
        this.mesh = this.level.assets.createInstance("box", position, false);
        this.mesh.position = position;
    }

    dispose() {
        this.mesh.dispose();
    }

    push(direction: Vector3) {
        const newPosition = this.mesh.position.add(direction);
        this.level.updateTileState(this.mesh.position, State.Void);
        this.level.updateTileState(newPosition, State.Box);
        this.mesh.position = newPosition;
    }

    tryToPush(direction: Vector3, stack = 1): boolean {
        if (stack >= 3) return false;

        const position = this.mesh.position;
        const nextPosition = position.add(direction);
        const nextGroundPosition = nextPosition.add(down);

        const nextFrontState = this.level.getTileState(nextPosition);
        const nextGroundState = this.level.getTileState(nextGroundPosition);

        if (nextFrontState == State.Ground || nextFrontState == State.Rock) return false;

        if (nextGroundState == State.Void) {
            this.push(direction.add(down));
            return true;
        }

        if (nextFrontState == State.Box) {
            const nextBox = this.level.findBoxByPos(nextPosition);
            const hasBeenPushed = nextBox.tryToPush(direction, stack + 1);

            if (hasBeenPushed) this.push(direction);
            return hasBeenPushed;
        }

        this.push(direction);

        return true;
    }
}
