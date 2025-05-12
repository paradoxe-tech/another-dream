import { Vector3, Scene } from "babylonjs";
import { v, nightmareOffset } from "@/shared/vectors";
import { AssetsManager } from "./Assets";
import { Box } from "./Box";
import { GameError } from "./Error";
import { Map3, Tile, State, World } from "@/shared/types";
import { EventBus } from "./Bus";
import { Player } from "./Player";

type fState = (state: State, position: Vector3, world: World) => void;

export class Level {
    shape: number[];
    scene: Scene;
    grid: Map3[];
    state: Map3[];
    assets: AssetsManager;
    tiles: Tile[][];
    boxes: Box[];
    spawnWorld: World;
    bus: EventBus;
    // J'add ça pour pouvoir retourner en arrière
    _lMove: [number,State,Vector3,World,Player|Box|null][] = [] ;
    _currentMove: number = 0;
    
    constructor(
        scene: Scene, 
        assets: AssetsManager,
        maps: Map3[], 
        bus: EventBus, 
        spawnWorld: World
    ) {
        this.bus = bus;
        this.shape = maps.shape();
        
        if (this.shape.length !== 4) {
            throw new GameError(
                `LevelMap should be of dimension 4, found shape ${this.shape}`,
                this.bus,
            );
        }

        this.scene = scene;
        this.grid = JSON.parse(JSON.stringify(maps));
        this.state = maps;
        this.assets = assets;
        this.tiles = [[], []];
        this.boxes = [];
        this.spawnWorld = spawnWorld;
    }

    // Pour trouver la position alternative avec le bon y
    getDroppablePosition(position: Vector3, world: World): Vector3 {
        /* Donc là en gros le concept c'est que tu renvoies la première position libre (çad la plus basse). Comme ça si ya une caisse, ou jsp quoi bah hop t'es dessus */
        const x = position.x;
        const z = position.z;
        let y = 0;
        if (world == World.Nightmare) y = nightmareOffset.y;

        while (this.getTileState(new Vector3(x, y, z), world) == State.Box || this.getTileState(new Vector3(x, y, z), world) == State.Ground) {
            y++;
        }
        return new Vector3(x, y, z);
    }

    forEachTile(func: fState, world: World, grid: boolean = false) {
        let map3: Map3 = this.state[world];
        if (grid) map3 = this.grid[world];

        if (!map3) {
            throw new GameError(
                `Cannot iterate through Tiles, because Map3 cannot be find`,
                this.bus,
            );
        }

        for (let y = 0; y < map3.length; y++) {
            for (let z = 0; z < map3[y].length; z++) {
                for (let x = 0; x < map3[y][z].length; x++) {
                    const state = map3[y][z][x];
                    let position = new Vector3(x, y, -z);
                    if (world === World.Nightmare)
                        position = position.add(nightmareOffset);
                    func(state, position, world);
                }
            }
        }
    }

    updateTileState(position: Vector3, newState: State, world: World) {
        if (world === World.Nightmare)
            position = position.subtract(nightmareOffset);

        if (!this.isPositionValid(position, world)) {
            throw new GameError(
                `Trying to set state to '${newState}' at invalid position ${v(position)}`,
                this.bus,
            );
        }

        this.state[world][position.y][position.z * -1][position.x] = newState;
    }

    getTileState(position: Vector3, world: World): State {
        if (world === World.Nightmare)
            position = position.subtract(nightmareOffset);

        if (!this.isPositionValid(position, world)) {
            throw new GameError(
                `Trying to read state at invalid position ${v(position)}`,
                this.bus,
            );
        }

        return (
            (this.state[world][position.y][position.z * -1][
                position.x
            ] as State) || State.Void
        );
    }

    isPositionValid(position: Vector3, world: World): boolean {
        return (
            position.y >= 0 &&
            position.y < this.state[world].length &&
            position.z * -1 >= 0 &&
            position.z * -1 < this.state[world][0].length &&
            position.x >= 0 &&
            position.x < this.state[world][0][0].length
        );
    }

    // World Independant !
    findBoxByPos(position: Vector3): Box {
        const result = this.boxes.find((tile) =>
            tile.mesh.position.equals(position),
        );
        if (!result)
            throw new GameError(
                `Could not find Box at position ${v(position)}`,
                this.bus,
            );
        return result;
    }

    createLevel() {
        try {
            this.state = JSON.parse(JSON.stringify(this.grid));

            const buildTilesFromState: fState = (state: State, position: Vector3, world: World) => {
                if (state === State.Portal)
                    this.createTile("portal", position, world, true);
                if (state === State.Rock)
                    this.createTile("rock", position, world, true);
                if (state === State.Ground) {
                    if (world === World.Dream) {
                        this.createTile("tile", position, world, false, 1.15);
                    } else {
                        this.createTile("nightmareTile", position, world, false, 1.1);
                    }
                }
                if (state === State.Flag)
                    this.createTile("flag", position, world, true);
                if (state === State.Box) {
                    const box = new Box(this, this.scene, position, world);
                    this.boxes.push(box);
                }
            };

            if (this.shape[0] >= 1)
                this.forEachTile(buildTilesFromState, World.Dream, true);
            if (this.shape[0] >= 2)
                this.forEachTile(buildTilesFromState, World.Nightmare, true);
        } finally {
            this.bus.emit("loaded");
        }
    }

    createTile(assetName: string, position: Vector3, world: World, grounded: boolean, scaleFactor: number = 1.0) {
        try {
            const tile = this.assets.createInstance(
                assetName,
                position,
                grounded,
                scaleFactor
            );

            if (this.tiles[world]) this.tiles[world].push(tile);
            else this.tiles[world] = [tile];
        } catch (err) {
            throw new GameError(
                `Unable to create Tile (Asset '${assetName}' Instance)`,
                this.bus,
                err,
            );
        }
    }

    getSpawnPoint(world: World): Vector3 {
        let pos = null;

        this.forEachTile(
            (state: State, position: Vector3) => {
                if (state === State.SpawnPoint) pos = position;
            },
            world,
            true,
        );

        if (pos == null) {
            throw new GameError("A spawnpoint needs to be defined", this.bus);
        }

        return pos;
    }

    getCenter(world: World): Vector3 {
        const cz = this.shape[2] / 2;
        const cx = this.shape[3] / 2;

        const center = new Vector3(cx, 0, -cz);
        if (world == World.Dream) return center;
        else return center.add(nightmareOffset);
    }

    dispose() {
        this.tiles.forEach((world: Tile[]) =>
            world.forEach((tile: Tile) => tile.dispose()),
        );
        this.tiles = [];

        this.boxes.forEach((box: Box) => box.dispose());
        this.boxes = [];
    }
    
    addMove(nb : number, state : State, position : Vector3, world: World, ref:Player|Box|null) {
       this._lMove.push([nb, state, position, world, ref]);
    }

    backMove() {
        //console.log("On est dans la fonction, avec le current move = ", this._currentMove, this._lMove[this._lMove.length - 1], this._lMove[this._lMove.length - 1][0]);
        if (this._currentMove == 0) return;
        while (this._lMove.length != 0 && this._lMove[this._lMove.length - 1][0] == (this._currentMove-1)) {
            
            
            //console.log("On back le move", this._lMove[this._lMove.length - 1]);
            const move = this._lMove.pop();
            if (!move) return;
            if (move[1] == State.Player) { // Remet le joueur à sa place et switch si besoin
                if(move[4]) {
                    if (move[3] != move[4].world) {
                        move[4].setPosition(move[2], move[3]);
                        this.bus.emit("backWorld");
                    } 
                    else move[4].setPosition(move[2], move[3]);
                }
                
            } else if (move[1] == State.Box) { // Remet la boite à sa place
                if(move[4]) move[4].setPosition(move[2], move[3]);
            } else if (move[1] == State.Void) { // Réactualise les cases qui étaient vides
                this.updateTileState(move[2], State.Void, move[3]);
            }
        }
        this._currentMove--;
    }

}
