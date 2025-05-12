import {
    Engine,
    Scene,
    Nullable,
    HemisphericLight,
    PointLight,
    ArcRotateCameraPointersInput,
    Mesh,
    SpotLight,
} from "babylonjs";

import {
    ArcRotateCamera,
    FollowCamera,
    Camera,
    EventState,
    StandardMaterial,
    MeshBuilder,
} from "babylonjs";

import { Vector3, CubeTexture, Texture, Color3 } from "babylonjs";
import { EventBus } from "./Bus";
import { AssetsManager } from "./Assets";
import { down, up, left, right, nightmareOffset } from "@/shared/vectors";
import { Player } from "./Player";
import { Level } from "./Level";
import { InputController } from "./input/InputController";
import { GameError } from "./Error";
import {
    World,
    SkyBoxMaterialArray,
    WorldKey,
    State,
    RenderingCanvas,
} from "../shared/types";
import { Gui } from "./Gui";

export class Game {
    canvas: RenderingCanvas;
    engine: Engine;
    scene: Scene;
    assets: AssetsManager;
    bus: EventBus;
    private globalLight: HemisphericLight;
    light: SpotLight;
    private nightmareLight: PointLight;
    private skyboxMaterials: SkyBoxMaterialArray;
    skybox?: Mesh;

    player?: Player;
    camera?: ArcRotateCamera;
    private cameraAngleDream: [number, number] = [
        (3.5 * Math.PI) / 4,
        (1.15 * Math.PI) / 4,
    ];
    private cameraAngleNightmare: [number, number] = [
        (3.5 * Math.PI) / 4,
        (1.15 * Math.PI) / 4,
    ];

    levelIndex: number;
    levels: Level[];
    _queue: number = 0;

    _inputController?: InputController;
    gui: Gui;

    constructor(
        relPath = "/assets/",
        creatorInstance: boolean = false,
        safeMode: boolean = false,
    ) {
        this.canvas = document.getElementById(
            "renderCanvas",
        ) as RenderingCanvas;
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.bus = new EventBus();
        this.assets = new AssetsManager(this.scene, this.bus);

        //this.light = new HemisphericLight("light", up, this.scene);
        this.globalLight = new HemisphericLight(
            "globalLight",
            new Vector3(-0.5, 1, 0),
            this.scene,
        );
        this.light = new SpotLight(
            "dreamLight",
            new Vector3(10, 20, 10),
            new Vector3(-10, -1, -10),
            Math.PI / 8,
            1,
            this.scene,
        );
        debugger;
        this.light.intensity = 1800;
        this.nightmareLight = new PointLight(
            "nightmareLight",
            nightmareOffset.add(new Vector3(20, 2, 0)),
            this.scene,
        );
        //this.nightmareLight.intensity = 600;

        this.loadAssets(relPath);

        this.levelIndex = 0;
        this.levels = [];

        // Don't load JSON level list if creator or SafeMode
        if (!creatorInstance || safeMode) {
            for (let i = 1; i <= JSON.parse(get("/levels")).n; i++) {
                this.levels.push(
                    new Level(
                        this.scene,
                        this.assets,
                        JSON.parse(get(`/level/${i}`)),
                        this.bus,
                        World.Dream,
                    ),
                );
            }
        }

        this.skyboxMaterials = { dream: null, nightmare: null };
        this.createSkyBoxMaterials(relPath);
        this.loadSkyBox(World.Dream);

        window.addEventListener("resize", () => this.engine.resize());

        this._inputController = new InputController(this);

        this.gui = new Gui(this.scene, this.bus);
    }

    // Renvoie le level actuel
    get level() {
        return this.levels[this.levelIndex];
    }

    set queue(nb: number) {
        this._queue += nb;
        //console.log("Queue : ", this._queue);
        if (this._queue == 0) {
            this.player?.processNextMove();
        }
    }

    createSkyBoxMaterials(relPath: string) {
        relPath = relPath.replaceAll("//", "/");
        const skyboxPath = {
            dream: relPath + "/skybox/lowres_skybox",
            nightmare: relPath + "/skybox/nightmare_lowres_skybox",
        };
        if (!this.skyboxMaterials) return;
        [WorldKey.Dream, WorldKey.Nightmare].forEach((world) => {
            const worldStr = world === WorldKey.Dream ? "dream" : "nightmare";
            this.skyboxMaterials[world] = new StandardMaterial(
                `skyBoxMaterial_${worldStr}`,
                this.scene,
            );
            this.skyboxMaterials[world].backFaceCulling = false;

            this.skyboxMaterials[world].diffuseColor = new Color3(0, 0, 0);
            this.skyboxMaterials[world].specularColor = new Color3(0, 0, 0);
            this.skyboxMaterials[world].reflectionTexture = new CubeTexture(
                skyboxPath[world as keyof typeof skyboxPath],
                this.scene,
            );
            if (this.skyboxMaterials[world].reflectionTexture) {
                this.skyboxMaterials[world].reflectionTexture.coordinatesMode =
                    Texture.SKYBOX_MODE;
            }
        });
    }

    async loadAssets(relPath: string) {
        relPath = relPath + "/models/";
        relPath = relPath.replaceAll("//", "/");

        await this.assets.loadAsset(
            "rock",
            ["Rock1.obj", "Rock2.obj", "Rock3.obj", "Rock4.obj"],
            relPath,
        );

        // grass.glb
        await this.assets.loadAsset("tile", ["cloud_test2.glb"], relPath);
        await this.assets.loadAsset(
            "nightmareTile",
            ["cloud_test3.glb"],
            relPath,
        );

        await this.assets.loadAsset("portal", ["Door.obj"], relPath);

        await this.assets.loadAsset("box", ["crate.gltf"], relPath);
        await this.assets.loadAsset("flag", ["flag.gltf"], relPath);
        await this.assets.loadAsset("player", ["Rogue.glb"], relPath);

        this.bus.emit("preloaded");
    }

    // Initialise le ciel en fonction du monde (r/c) actuel
    loadSkyBox(world: World) {
        if (this.skybox) this.skybox.dispose();
        const worldStr = world === World.Dream ? "dream" : "nightmare";
        this.skybox = MeshBuilder.CreateBox(
            `skyBox_${worldStr}`,
            { size: 100 },
            this.scene,
        );
        const key = world === World.Dream ? WorldKey.Dream : WorldKey.Nightmare;
        this.skybox.material = this.skyboxMaterials[key];
        this.skybox.infiniteDistance = true;
    }

    // Initialise le joueur et l'affecte
    initPlayer() {
        console.debug("A player was initialized.");
        if (this.player) this.player.dispose();
        delete this.player;
        this.player = new Player(
            this.scene,
            this.level,
            this.bus,
            this.light
        );
    }

    setupCamera() {
        if (!this.player)
            throw new GameError(
                "Player needs to be instanciated to setup Camera",
                this.bus,
            );

        // Keep old camera rotation angle then dispose

        if (this.camera) {
            this.camera.dispose();
        }

        this.camera = new ArcRotateCamera(
            "StaticCam",
            this.cameraAngleDream[0],
            this.cameraAngleDream[1],
            15, // Radius
            this.level.getCenter(this.player.world), // Camera target
            this.scene,
        );

        if (!this.camera)
            throw new GameError(`Camera could not be setted up`, this.bus);

        // Restrict beta angle (because it's ugly below the ground)
        this.camera.lowerBetaLimit = Math.PI / 8;
        this.camera.upperBetaLimit = (3 * Math.PI) / 8;

        // to make other world invisible
        this.camera.maxZ = 110;

        this._inputController?.updateCamera(this.camera, this.canvas);
    }

    // Permet de lancer un nouveau niveau
    playLevel(offsetLevel = 0) {
        console.debug(`Playing a new level`);
        if (this.camera && this.player) {
            if (this.player.world == World.Dream) {
                this.cameraAngleDream = [this.camera.alpha, this.camera.beta];
            } else
                this.cameraAngleNightmare = [
                    this.camera.alpha,
                    this.camera.beta,
                ];
        }
        this.level.dispose();
        this.levelIndex += offsetLevel;
        this.initPlayer();
        this.level.createLevel();
        this.loadSkyBox(World.Dream);
        this.setupCamera();
    }

    // Permet de switch entre le monde rêve et cauchemar
    switchWorld() {
        // Du coup y'aura l'anim spécifique aux caisses également

        if (!this.player)
            throw new GameError(
                "Player is missing, we need to find him really quick sinon the game will explode !  ...  Too late",
                this.bus,
            );

        const world =
            this.player.world == World.Dream ? World.Nightmare : World.Dream;

        // Switching skybox
        this.loadSkyBox(world);

        // On renverse le player
        if (this.player) {
            const spawnpoint = this.level.getDroppablePosition(
                this.player.getPosition(),
                world,
            );
            this.player.mesh.position = spawnpoint.add(up.scale(2));
            this.player.animateSwitchWorld(spawnpoint.add(down.scale(0.5)));
            this.player.world = world;
        }

        // On renverse les caisses
        this.level.boxes.forEach((box) => {
            const pos = box.getPosition();

            this.bus.emit("addMove", {
                move: this.level._currentMove - 1,
                tileState: State.Box,
                position: pos,
                world: box.world,
                ref: box,
            });

            const spawnpoint = this.level.getDroppablePosition(
                box.getPosition(),
                world,
            );

            this.bus.emit("addMove", {
                move: this.level._currentMove - 1,
                tileState: State.Void,
                position: spawnpoint,
                world: world,
                ref: null,
            });

            this.level.updateTileState(pos, State.Void, box.world);
            this.level.updateTileState(
                box.getPositionByPos(spawnpoint, box.world),
                State.Box,
                world,
            );
            box.world = world;
            box.switchWorldAnim(spawnpoint);
        });

        // On déplace la caméra
        if (this.camera) {
            if (world == World.Nightmare) {
                this.cameraAngleDream = [this.camera.alpha, this.camera.beta];
            } else
                this.cameraAngleNightmare = [
                    this.camera.alpha,
                    this.camera.beta,
                ];
            this.camera.setTarget(this.level.getCenter(world));
            //this.camera.alpha = (3.5 * Math.PI) / 4;
            //this.camera.beta = (1.15 * Math.PI) / 4;
            this.camera.radius = 15;

            if (world == World.Dream) {
                this.camera.alpha = this.cameraAngleDream[0];
                this.camera.beta = this.cameraAngleDream[1];
            } else {
                this.camera.alpha = this.cameraAngleNightmare[0];
                this.camera.beta = this.cameraAngleNightmare[1];
            }

            this.camera.lowerBetaLimit = Math.PI / 8;
            this.camera.upperBetaLimit = (3 * Math.PI) / 8;
        }
    }

    backWorld() {
        if (!this.player) return;
        const world = this.player.world;
        this.loadSkyBox(world);

        if (this.camera) {
            if (world == World.Nightmare) {
                this.cameraAngleDream = [this.camera.alpha, this.camera.beta];
            } else
                this.cameraAngleNightmare = [
                    this.camera.alpha,
                    this.camera.beta,
                ];
            this.camera.setTarget(this.level.getCenter(world));
            //this.camera.alpha = (3.5 * Math.PI) / 4;
            //this.camera.beta = (1.15 * Math.PI) / 4;
            this.camera.radius = 15;

            if (world == World.Dream) {
                this.camera.alpha = this.cameraAngleDream[0];
                this.camera.beta = this.cameraAngleDream[1];
            } else {
                this.camera.alpha = this.cameraAngleNightmare[0];
                this.camera.beta = this.cameraAngleNightmare[1];
            }

            this.camera.lowerBetaLimit = Math.PI / 8;
            this.camera.upperBetaLimit = (3 * Math.PI) / 8;
        }
    }
}
