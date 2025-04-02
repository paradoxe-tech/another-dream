import { Vector3, Scene, Mesh, Vector } from "babylonjs";
import { v, up, down, r } from "../utils";
import { AssetsManager } from "./Assets";
import { Box } from "./Box";
import { Map3, Tile, State } from "../types";

export class Level {

    shape: number[];
    scene: Scene;
    grid: Map3; // A remplacer par LevelMap
    state: Map3;
    assets: AssetsManager;
    tiles: Tile[];
    boxes: Box[];
    
    constructor(scene: Scene, assets: AssetsManager, map: Map3) {
        this.shape = map.shape();
        this.scene = scene;
        this.grid = JSON.parse(JSON.stringify(map));
        this.state = map;
        this.assets = assets;
        this.tiles = [];
        this.boxes = [];
    }

    forEachGridTile(func: (char: string, position: Vector3) => void) {
        for (let y = 0; y < this.grid.length; y++) {
            for (let z = 0; z < this.grid[y].length; z++) {
                for (let x = 0; x < this.grid[y][z].length; x++) {
                    const char = this.grid[y][z][x];
                    const position = new Vector3(x, y, -z);
                    func(char, position);
                }
            }
        }
    }

    forEachTile(func: (char: string, position: Vector3) => void) {
        for (let y = 0; y < this.state.length; y++) {
            for (let z = 0; z < this.state[y].length; z++) {
                for (let x = 0; x < this.state[y][z].length; x++) {
                    const char = this.state[y][z][x];
                    const position = new Vector3(x, y, -z);
                    func(char, position);
                }
            }
        }
    }

    updateTileState(position: Vector3, newState: State) {
        if(!this.isPositionValid(position)) {
            throw new Error(`Trying to set state to '${newState}' at invalid position ${v(position)}`);
        }
        
        this.state[position.y][position.z * -1][position.x] = newState;
    }

    getTileState(position: Vector3): State {
        try {
            return this.state[position.y][position.z * -1][position.x] as State || State.Void;
        } catch {
            return State.Void;
        }
    }

    isPositionValid(position: Vector3): boolean {
        return (
            position.y >= 0 && position.y < this.state.length &&
            position.z * -1 >= 0 && position.z * -1 < this.state[0].length &&
            position.x >= 0 && position.x < this.state[0][0].length
        );
    }

    findBoxByPos(position: Vector3): Box {
        const result = this.boxes.find(tile => tile.mesh.position.equals(position));
        if (!result) throw new Error(`Could not find Box at position ${v(position)}`);
        return result;
    }

    createLevel() {
        this.state = JSON.parse(JSON.stringify(this.grid));
        this.forEachGridTile((char, position) => {
            if (char === "X") {
                this.tiles.push(this.assets.createInstance("rock", position));
            } else if (char === "#") {
                this.tiles.push(this.assets.createInstance("tile-" + r(3), position, false));
            } else if (char === "$") {
                const box = new Box(this, this.scene, position);
                this.boxes.push(box);
            } else if (char == ".") {
                this.tiles.push(this.assets.createInstance("flag", position))
            }
        });
    }

    getSpawnPoint(): Vector3 {
        let pos = null;
        
        this.forEachTile((char, position) => {
            if (char === "@") pos = position;
        });

        if(pos == null) throw new Error("A spawnpoint needs to be defined");

        return pos;
    }
    
    dispose() {
        this.tiles.forEach(tile => tile.dispose());
        this.tiles = [];

        this.boxes.forEach(box => box.dispose());
        this.boxes = [];
    }
    
}
