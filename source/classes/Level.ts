import { Vector3, Scene, PointLight, PBRMaterial, Animation } from "babylonjs";
import { v, nightmareOffset, up } from "@/shared/vectors";
import { AssetsManager } from "./Assets";
import { Box } from "./Box";
import { GameError } from "./Error";
import { Map3, Tile, State, World } from "@/shared/types";
import { EventBus } from "./Bus";
import { Player } from "./Player";

type fState = (state: State, position: Vector3, world: World) => void;

class TileStore {
    private tiles = new Map<string, Tile>();

    writeTile(i: number, j: number, k: number, l: number, value: Tile) {
        const key = `${i},${j},${k},${l}`;
        this.tiles.set(key, value);
    }

    getTile(i: number, j: number, k: number, l: number): Tile | undefined {
        const key = `${i},${j},${k},${l}`;
        return this.tiles.get(key);
    }

    dispose() {
        for (const tile of this.tiles.values()) {
            if (tile?.dispose) tile.dispose();
        }
        this.tiles.clear();
    }
}

export class Level {
    shape: number[];
    scene: Scene;
    grid: Map3[];
    state: Map3[];
    assets: AssetsManager;
    tiles: TileStore;
    boxes: Box[];
    spawnWorld: World;
    bus: EventBus;
    player?: Player;
    additionalLights: PointLight[];

    _lMove: [number, State, Vector3, World, Player | Box | null][] = [];
    _currentMove: number = 0;
    _numberLevel: number = 0;

    levelsComplete: boolean[] = [];

    constructor(
        scene: Scene,
        assets: AssetsManager,
        map: Map3[],
        bus: EventBus,
        spawnWorld: World,
    ) {
        this.bus = bus;
        this.shape = map.shape();

        if (this.shape.length !== 4) {
            throw new GameError(
                `LevelMap should be of dimension 4, found shape ${this.shape}`,
                this.bus,
            );
        }

        this.scene = scene;
        this.grid = JSON.parse(JSON.stringify(map));
        this.state = map;
        this.assets = assets;
        this.tiles = new TileStore();
        this.boxes = [];
        this.additionalLights = [];
        this.spawnWorld = spawnWorld;
    }

    // Pour trouver la position alternative avec le bon y
    getDroppablePosition(position: Vector3, world: World): Vector3 {
        const x = position.x;
        const z = position.z;
        let y = 0;
        if (world == World.Nightmare) y = nightmareOffset.y;

        while (
            this.getTileState(new Vector3(x, y, z), world) == State.Box ||
            this.getTileState(new Vector3(x, y, z), world) == State.Ground
        ) {
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

    createLevel(i: number = 0, lbox: Vector3[] = []) {
        this._numberLevel = i;
        this._lMove = [];
        this._currentMove = 0;
        this.boxes = [];
        try {
            this.state = JSON.parse(JSON.stringify(this.grid));

            const buildTilesFromState: fState = (
                state: State,
                position: Vector3,
                world: World,
            ) => {
                if (/^\d+$/.test(state)) {
                    const lvl = parseInt(state);
                    console.log(`testing if level ${lvl} is finished`);
                    if (this.levelsComplete[lvl - 1]) {
                        console.log("it is.");
                        this.createTile(
                            "portalFinished",
                            position,
                            world,
                            true,
                            1,
                            false,
                            true,
                            0,
                            true,
                        );
                    } else {
                        this.createTile(
                            "portal",
                            position,
                            world,
                            true,
                            1,
                            false,
                            true,
                            0,
                            true,
                        );
                    }
                    this.addLight(position.add(up), world);
                }
                if (state === State.Portal) {
                    this.createTile(
                        "portal",
                        position,
                        world,
                        true,
                        1,
                        false,
                        true,
                        0,
                        true,
                    );
                    this.addLight(position.add(up), world);
                }
                if (state === State.PortalRotated) {
                    this.createTile(
                        "portal",
                        position,
                        world,
                        true,
                        1,
                        false,
                        true,
                        Math.PI / 2,
                    ),
                        true;
                    this.addLight(position.add(up), world);
                }
                if (state === State.Rock) {
                    switch (world) {
                        case World.Dream:
                            this.createTile(
                                "rock",
                                position,
                                world,
                                true,
                                1,
                                false,
                                true,
                            );
                            break;
                        case World.Nightmare:
                            this.createTile(
                                "grave",
                                position,
                                world,
                                true,
                                1,
                                false,
                                true,
                            );
                            break;
                    }
                }

                if (state === State.Ground) {
                    if (world === World.Dream) {
                        this.createTile("tile", position, world, false, 1.15);
                    } else {
                        this.createTile(
                            "nightmareTile",
                            position,
                            world,
                            false,
                            1.5,
                            true,
                        );
                    }
                }
                if (state === State.Flag) {
                    this.createTile(
                        "flag",
                        position,
                        world,
                        true,
                        1,
                        false,
                        false,
                        0,
                        true,
                    );
                    this.addLight(position.add(up), world);
                }
                if (state === State.Box) {
                    if (lbox.length == 0) {
                        const box = new Box(this, this.scene, position, world);
                        this.boxes.push(box);
                    } else {
                        this.updateTileState(position, State.Void, world);
                    }
                }
            };

            if (this.shape[0] >= 1)
                this.forEachTile(buildTilesFromState, World.Dream, true);
            if (this.shape[0] >= 2)
                this.forEachTile(buildTilesFromState, World.Nightmare, true);

            // On ajoute à la main les boites si elles ont bougé dans la world map
            let j = 0;
            for (j = 0; j < lbox.length; j++) {
                this.updateTileState(lbox[j], State.Box, World.Dream);
                const box = new Box(this, this.scene, lbox[j], World.Dream);
                this.boxes.push(box);
            }
        } finally {
            this.bus.emit("loaded");
        }
    }

    addLight(pos: Vector3, world: World) {
        const light = new PointLight(
            `light-${pos.x}-${pos.y}-${pos.z}`,
            pos,
            this.scene,
        );
        light.intensity = 3.5;
        this.additionalLights.push(light);
    }

    createTile(
        assetName: string,
        position: Vector3,
        world: World,
        grounded: boolean,
        scaleFactor: number = 1.0,
        forgetAboutProportions: boolean = false,
        center: boolean = false,
        yRotation: number = 0,
        cloneMaterials: boolean = false,
    ) {
        try {
            const tile = this.assets.createInstance(
                assetName,
                position,
                grounded,
                scaleFactor,
                forgetAboutProportions,
                center,
                yRotation,
                cloneMaterials,
            );

            this.tiles.writeTile(world, position.y, position.z, position.x, tile);
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

        if (this._numberLevel != 0) {
            this.forEachTile(
                (state: State, position: Vector3) => {
                    if (/^\d+$/.test(state)) {
                        if (parseInt(state) == this._numberLevel)
                            pos = position;
                    }
                },
                world,
                true,
            );
        } else {
            this.forEachTile(
                (state: State, position: Vector3) => {
                    if (state === State.SpawnPoint) pos = position;
                },
                world,
                true,
            );
        }

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
        this.tiles.dispose();

        this.boxes.forEach((box: Box) => box.dispose());
        this.boxes = [];

        this.additionalLights.forEach((l) => l.dispose());
        this.additionalLights = [];
    }

    addMove(
        nb: number,
        state: State,
        position: Vector3,
        world: World,
        ref: Player | Box | null,
    ) {
        this._lMove.push([nb, state, position, world, ref]);
    }

    backMove() {
        if (this._currentMove == 0) {
            return;
        }
        while (
            this._lMove.length != 0 &&
            this._lMove[this._lMove.length - 1][0] == this._currentMove - 1
        ) {
            const move = this._lMove.pop();
            if (!move) {
                console.log("Hmmm, ptite erreur");
                return;
            }
            if (move[1] == State.Player) {
                // Remet le joueur à sa place et switch si besoin
                if (move[4]) {
                    this.bus.emit("move", {
                        oldPos: move[4].getPosition(),
                        newPos: move[2],
                        anim: false,
                    });
                    if (move[3] != move[4].world) {
                        move[4].setPosition(move[2], move[3]);
                        this.bus.emit("backWorld");
                    } else move[4].setPosition(move[2], move[3]);
                }
            } else if (move[1] == State.Box) {
                // Remet la boite à sa place
                if (move[4]) move[4].setPosition(move[2], move[3]);
            } else if (move[1] == State.Void) {
                // Réactualise les cases qui étaient vides
                this.updateTileState(move[2], State.Void, move[3]);
            }
        }
        this._currentMove--;
    }

    getPath(player: Player) {
        let i;
        let path: number[] = [];
        let pos: Vector3 = this._lMove[0][2];
        for (i = 1; i < this._lMove.length; i++) {
            if (this._lMove[i][1] == State.Player) {
                const newPos = this._lMove[i][2];
                if (pos.x < newPos.x)
                    path.push(0); // Droite = 0
                else if (pos.x > newPos.x)
                    path.push(2); // Gauche = 2
                else if (pos.z < newPos.z)
                    path.push(1); // Haut = 1
                else if (pos.z > newPos.z) path.push(3); // Bas = 3
                pos = newPos;
            }
        }
        const newPos = player.getPosition();
        if (pos.x < newPos.x)
            path.push(0); // Droite = 0
        else if (pos.x > newPos.x)
            path.push(2); // Gauche = 2
        else if (pos.z < newPos.z)
            path.push(1); // Haut = 1
        else if (pos.z > newPos.z) path.push(3); // Bas = 3

        console.log("Path : ", path);
        for (i = 0; i < path.length; i++) {
            // Input selon l'angle de caméra initial
            if (path[i] == 0) console.log("UP");
            if (path[i] == 1) console.log("LEFT");
            if (path[i] == 2) console.log("DOWN");
            if (path[i] == 3) console.log("RIGHT");
        }
        console.log("Fin du path");
    }

    setAlpha(
        position: Vector3,
        alpha: number,
        world: World = World.Dream,
        fallback = 0,
    ) {
        const tile = this.tiles.getTile(world, position.y, position.z, position.x);
        if (!tile) return;
        const meshes = tile.getChildMeshes();
        if (!meshes) return;
        let mesh;
        if (meshes.length > 1) {
            mesh = meshes[1];
        } else {
            mesh = meshes[0];
        }
        if (!mesh) return;
        const mat = mesh.material;
        if (!mat) return;

        mat.transparencyMode = PBRMaterial.MATERIAL_ALPHABLEND;

        const animation = new Animation(
            "alphaAnim",
            "alpha",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        const keys = [
            { frame: 0, value: mat.alpha }, // current alpha
            { frame: 20, value: alpha }, // new alpha
        ];

        animation.setKeys(keys);

        const easing = new BABYLON.SineEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        animation.setEasingFunction(easing);

        // Apply animation to material
        mat.animations = [animation];
        const an = this.scene.beginAnimation(mat, 0, 20, false);
        an.onAnimationEnd = () => {
            if (alpha === 1) {
                mat.transparencyMode = PBRMaterial.MATERIAL_OPAQUE;
            }
            if (fallback > 0) {
                sleep(fallback);
                mat.transparencyMode = PBRMaterial.MATERIAL_OPAQUE;
                mat.alpha = 1;
            }
        };
    }
}
