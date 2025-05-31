import {
    Engine,
    Scene,
    Nullable,
    HemisphericLight,
    PointLight,
    ArcRotateCameraPointersInput,
    Mesh,
    SpotLight,
    ImageProcessingPostProcess,
    CreateSoundAsync,
    Color4,
    CreateAudioEngineAsync,
    StaticSound,
    ArcFollowCamera,
    EnvironmentTextureTools,
    ParticleSystem,
    GPUParticleSystem,
    CreateBox,
} from "babylonjs";

import {
    ArcRotateCamera,
    FollowCamera,
    Camera,
    EventState,
    StandardMaterial,
    MeshBuilder,
    Animation,
    BezierCurveEase,
} from "babylonjs";

import { Vector3, CubeTexture, Texture, Color3 } from "babylonjs";
import { EventBus } from "./Bus";
import { AssetsManager } from "./Assets";
import { down, up, left, right, nightmareOffset } from "@/shared/vectors";
import { Player } from "./Player";
import { Level } from "./Level";
import { Box } from "./Box";
import { InputController } from "./input/InputController";
import { GameError } from "./Error";
import {
    World,
    EnvTextureArray,
    WorldKey,
    State,
    RenderingCanvas,
    Orientation,
} from "../shared/types";
import { Gui } from "./Gui";

const DEFAULT_CAMANGLE: [number, number] = [
    (3.5 * Math.PI) / 4,
    (1.15 * Math.PI) / 4,
];

export class Game {
    canvas: RenderingCanvas;
    engine: Engine;
    scene: Scene;
    assets: AssetsManager;
    bus: EventBus;
    private skyboxMaterials: EnvTextureArray;
    _postProcess?: ImageProcessingPostProcess;
    skybox?: Mesh;
    volCloudFountain?: Mesh[] = new Array(2);
    volCloudParticles?: GPUParticleSystem[] | ParticleSystem[] = new Array(2);
    win?: StaticSound; 
    helicomgl?: StaticSound;
    player?: Player;
    camera?: ArcRotateCamera;
    private cameraAngleDream: [number, number] = DEFAULT_CAMANGLE;
    private cameraAngleNightmare: [number, number] = DEFAULT_CAMANGLE;

    levelIndex: number;
    levels: Level[];
    levelsComplete: boolean[];
    lMoveLevel0 : [number, State, Vector3, World, Player | Box | number | null][] = [];
    lPosBox: Vector3[] = [];

    _inputController?: InputController;
    gui: Gui;

    constructor(relPath = "/assets/", creatorInstance: boolean = false, safeMode: boolean = false) {
        console.log(`--- Another Dream v0.0.0,5 by Another Dreamteam ----\nCopyright, all rights reserved 2025 Mathéo Tripnaux-Morceau, Eloi Canebière-Kiwitz, Florian Durang-d'Oignons\nPlease wait a little bit because the game is going to take ${Math.floor(Math.random()*3600)} minutes to load today, according to the current local weather and temperatures.\nMeanwhile, you can enjoy scenic pictures of the Norvegian forest on the Internet, by yourself.\nBecause you're a grown up and you can search by yourself.\n\nDon't make me say that again.`);
        
        this.canvas = document.getElementById(
            "renderCanvas",
        ) as RenderingCanvas;
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.bus = new EventBus();
        this.assets = new AssetsManager(this.scene, this.bus);

        this.loadAssets(relPath);

        this.levelIndex = 1;
        this.levels = [];
        this.levelsComplete = [];

        // Don't load JSON level list if creator or SafeMode
        if (!creatorInstance || safeMode) {
            let totalLevelNb = JSON.parse(get("/levels")).n;
            for (let i = 0; i < totalLevelNb; i++) {
                this.levels.push(
                    new Level(
                        this.scene,
                        this.assets,
                        JSON.parse(get(`/level/${i}`)),
                        this.bus,
                        World.Dream,
                    ),
                );
                this.levelsComplete = Array.from({length: totalLevelNb-1}, () => false);
            }
        }

        this.skyboxMaterials = { dream: null, nightmare: null };
        this.createSkyBoxMaterials(relPath);
        this.loadSkyBox(World.Dream);

        this.loadVolClouds();

        window.addEventListener("resize", () => this.engine.resize());

        this._inputController = new InputController(this);

        this.gui = new Gui(this.scene, this.bus, creatorInstance);
        this.bus.on("recalcOrientation", () => this.cameraRotatedEvent());
        this.gameMusic();
    }

    // Renvoie le level actuel
    get level() {
        return this.levels[this.levelIndex];
    }

    async gameMusic() {
        const audioEngine = await CreateAudioEngineAsync();
        await audioEngine.unlockAsync();

        this.win = await CreateSoundAsync("win", "/assets/sounds/win.wav");
        this.win.volume = 0.5;

        this.helicomgl = await CreateSoundAsync("teleport", "/assets/sounds/teleport.wav");
        this.helicomgl.volume = 0.4;
        
        const theme = await CreateSoundAsync("theme", "/assets/sounds/theme.wav");
        theme.loop = true;
        theme.volume = 0.3;
        theme.play();
    }

    loadVolClouds() {
        let fogTexture = new Texture("/assets/other/smoke_15.png", this.scene);
        const fountainPos = [new Vector3(0, -1, 0), new Vector3(0, 125, 0)];
        const minEmitOffset = new Vector3(-100, -5, -100);
        const minEmit = [minEmitOffset, nightmareOffset.add(minEmitOffset)];
        const maxEmitOffset = new Vector3(100, 0.5, 100);
        const maxEmit = [maxEmitOffset, nightmareOffset.add(maxEmitOffset)];

        const minColor = [new Color4(0.85, 0.78, 0.85, 0.3), new Color4(0.88, 0.41, 0.28, 0.9)];
        const maxColor = [new Color4(0.95, 0.84, 0.91, 0.35), new Color4(0.98, 0.51, 0.38, 0.95)];

        for (let i = 0; i<2; i++) {
            if (!this.volCloudParticles || !this.volCloudFountain) return;
            if (GPUParticleSystem.IsSupported) {
                this.volCloudParticles[i] = new GPUParticleSystem( `volClouds${i}`, {capacity: 50000}, this.scene);
                this.volCloudParticles[i].activeParticleCount = 8000;
                this.volCloudParticles[i].manualEmitCount = this.volCloudParticles[i].activeParticleCount;
            } else {
                this.volCloudParticles[i] = new ParticleSystem(`volClouds${i}`, 4500, this.scene);
                this.volCloudParticles[i].manualEmitCount = this.volCloudParticles[i].getCapacity();
            }
            this.volCloudParticles[i].minEmitBox = minEmit[i];
            this.volCloudParticles[i].maxEmitBox = maxEmit[i];
            this.volCloudParticles[i].particleTexture = fogTexture.clone();

            this.volCloudFountain[i] = CreateBox(`volCloudsFountain${i}`, {size: .01}, this.scene);
            this.volCloudFountain[i].position = fountainPos[0];
            this.volCloudFountain[i].visibility = 0;
            this.volCloudParticles[i].emitter = this.volCloudFountain[i];

            this.volCloudParticles[i].color1 = minColor[i];
            this.volCloudParticles[i].color2 = maxColor[i];
            this.volCloudParticles[i].colorDead = minColor[i];
            this.volCloudParticles[i].minSize = 3.5;
            this.volCloudParticles[i].maxSize = 5.0;
            this.volCloudParticles[i].minLifeTime = 15;
            this.volCloudParticles[i].maxLifeTime = 15;
            this.volCloudParticles[i].emitRate = 50000;
            this.volCloudParticles[i].blendMode = ParticleSystem.BLENDMODE_STANDARD;
            this.volCloudParticles[i].gravity = new Vector3(0, 0, 0);
            this.volCloudParticles[i].direction1 = new Vector3(2, 0, 0);
            this.volCloudParticles[i].direction2 = new Vector3(12, 0, 0);
            this.volCloudParticles[i].minAngularSpeed = -2;
            this.volCloudParticles[i].maxAngularSpeed = 2;
            this.volCloudParticles[i].minEmitPower = .5;
            this.volCloudParticles[i].maxEmitPower = 1;
            this.volCloudParticles[i].updateSpeed = 0.005;

            this.volCloudParticles[i].start();
        }
        
    }

    async launchSound(name:string) {
        if (name == "win") this.win?.play() ;
        else if (name == "teleport") this.helicomgl?.play();
        else {
            const sound = await CreateSoundAsync(name, "/assets/sounds/"+name+".wav");
            switch (name) {  
                case "teleport":
                    sound.volume = 0.4;
                    break;
                default :
                    sound.volume = 0.05;
                    break;
            }
            sound.play(); 
        }
    }
    
    createSkyBoxMaterials(relPath: string) {
        relPath = relPath.replaceAll("//", "/");
        const skyboxPath = {
            dream: relPath + "/skybox/skybox_dream.env",
            nightmare: relPath + "/skybox/skybox_nightmare.env",
        };
        if (!this.skyboxMaterials) return;
        [WorldKey.Dream, WorldKey.Nightmare].forEach((world) => {
            this.skyboxMaterials[world] = CubeTexture.CreateFromPrefilteredData(skyboxPath[world], this.scene);
        });
    }

    async loadAssets(relPath: string) {
        relPath = relPath + "/models/";
        relPath = relPath.replaceAll("//", "/");

        await this.assets.loadAsset(
            "rock",
            ["rocks-small.glb", "rocks-large.glb"],
            relPath + "/castle/",
        );
        await this.assets.loadAsset(
            "grave",
            ["gravestone-broken.glb", "gravestone-bevel.glb", "gravestone-roof.glb"],
            relPath + "/graveyard/",
        );
        

        // grass.glb
        await this.assets.loadAsset("tile", ["cloud_test2.glb"], relPath);
        await this.assets.loadAsset(
            "nightmareTile",
            ["nm_test2.glb"],
            relPath,
        );

        await this.assets.loadAsset("portal", ["Door_A_edited.glb"], relPath);
        await this.assets.loadAsset("portalFinished", ["Door_A_Target_edited.glb"], relPath);

        await this.assets.loadAsset("box", ["crate.gltf"], relPath);
    
        await this.assets.loadAsset("flag", ["flag.gltf"], relPath);
        await this.assets.loadAsset("player", ["rogue_edited.glb"], relPath);

        this.bus.emit("preloaded");
    }

    // Initialise le ciel en fonction du monde (r/c) actuel
    loadSkyBox(world: World) {
        const key = world === World.Dream ? WorldKey.Dream : WorldKey.Nightmare;
        const envTexture = this.skyboxMaterials[key];
        if (!envTexture) return;
        this.scene.environmentTexture = envTexture;
        this.scene.environmentIntensity = 0.8;
        this.scene.createDefaultSkybox(envTexture, true, 1000);
    }

    // Initialise le joueur et l'affecte
    initPlayer() {
        console.debug("A player was initialized.");
        if (this.player) this.player.dispose();
        delete this.player;
        this.player = new Player(this.scene, this.level, this.bus);
        this.bus.emit("newPlayer", {player: this.player});
    }

    setupCamera() {
        this.bus.remove("move");
        if (!this.player)
            throw new GameError(
                "Player needs to be instanciated to setup Camera",
                this.bus,
            );

        if (this.camera) {
            this.camera.dispose();
        }
        if (this._postProcess) {
            this._postProcess.dispose();
        }

        
        this.camera = new ArcRotateCamera(
            "StaticCam",
            DEFAULT_CAMANGLE[0],
            DEFAULT_CAMANGLE[1],
            15, // Radius
            this.level.getCenter(this.player.world), // Camera target
            this.scene,
        );

        if (!this.camera)
            throw new GameError(`Camera could not be setted up`, this.bus);

        this._postProcess = new ImageProcessingPostProcess(
            "processing",
            1.0,
            this.camera,
        );
        this._postProcess.vignetteWeight = 100000;
        this._postProcess.vignetteStretch = 2;
        this._postProcess.vignetteColor = new Color4(0, 0, 0, 0);
        this._postProcess.vignetteEnabled = true;
        
        // Restrict beta angle (because it's ugly below the ground)
        this.camera.lowerBetaLimit = Math.PI / 8;
        this.camera.upperBetaLimit = (3 * Math.PI) / 8;
        this.camera.lowerRadiusLimit = 12;
        this.camera.upperRadiusLimit = 30;

        // to make other world invisible
        this.camera.maxZ = 110;

        this.camera?.onViewMatrixChangedObservable.add(() =>
            this.bus.emit("recalcOrientation"),
        );

        this._inputController?.updateCamera(this.camera, this.canvas);
        this.fade(false);
    }

    setupCameraWorldMap() {
        if (!this.player)
            throw new GameError(
                "Player needs to be instanciated to setup Camera",
                this.bus,
            );

        if (this.camera) {
            this.camera.dispose();
        }
        if (this._postProcess) {
            this._postProcess.dispose();
        }

        const center = this.level.getCenter(this.player.world);
        this.camera = new ArcRotateCamera(
            "StaticCam",
            DEFAULT_CAMANGLE[0],
            DEFAULT_CAMANGLE[1],
            15, // Radius
            new Vector3(
                center.x, 
                center.y,
                this.level.getSpawnPoint(World.Dream).z),
            // Camera target
            this.scene,
        );

        if (!this.camera)
            throw new GameError(`Camera could not be setted up`, this.bus);

        this._postProcess = new ImageProcessingPostProcess(
            "processing",
            1.0,
            this.camera,
        );
        this._postProcess.vignetteWeight = 100000;
        this._postProcess.vignetteStretch = 2;
        this._postProcess.vignetteColor = new Color4(0, 0, 0, 0);
        this._postProcess.vignetteEnabled = true;

        // Restrict beta angle (because it's ugly below the ground)
        this.camera.lowerBetaLimit = Math.PI / 8;
        this.camera.upperBetaLimit = (3 * Math.PI) / 8;
        this.camera.lowerRadiusLimit = 12;
        this.camera.upperRadiusLimit = 34;

        // to make other world invisible
        this.camera.maxZ = 110;

        this.camera?.onViewMatrixChangedObservable.add(() =>
            this.bus.emit("recalcOrientation"),
        );

        this._inputController?.updateCamera(this.camera, this.canvas);
        this.fade(false);
        this.bus.on("move", (pos) => this.moveCamera(pos.oldPos, pos.newPos, pos.anim? true : false));
    }

    moveCamera(oldPos:Vector3, newPos : Vector3, anim : boolean) {
        if (!this.camera) return;
        if (oldPos.z != newPos.z) {
            const z = newPos.z - oldPos.z;
            
            if (anim) {
                this.camera.target.z += z;
                return ;
            }
            
            const duration = 12;

            let moveAnim = new Animation(
                "moveAnim",
                "target.z",
                60,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );


            let moveKeys = [];
            moveKeys.push({ frame: 0, value: this.camera.target.z });
            moveKeys.push({ frame: duration, value: this.camera.target.z + z });

            moveAnim.setKeys(moveKeys);
            this.camera.animations = [moveAnim];
            this.scene.beginAnimation(this.camera, 0, duration, false);
        }
    }
    
    async resetCamera() {
        if (!this.camera) return;

        if (this.levelIndex == 0 && this.player) {
            const center = this.level.getCenter(this.player?.world || World.Dream);
            this.camera.setTarget(new Vector3(center.x, center.y, this.player.getPosition().z));
        } else {
            this.camera.setTarget(
                this.level.getCenter(this.player?.world || World.Dream),
            );
        }
        this.camera.alpha = DEFAULT_CAMANGLE[0];
        this.camera.beta = DEFAULT_CAMANGLE[1];
        this.camera.radius = 15;
    }

    cameraRotatedEvent() {
        if (this.camera) {
            if (this.camera?.alpha) {
                const rawAlpha = this.camera?.alpha;
                let alpha = Math.atan2(Math.sin(rawAlpha), Math.cos(rawAlpha));
                if (alpha < 0) {
                    alpha = Math.abs(alpha) + 2 * (Math.PI - Math.abs(alpha));
                }
                let orientation: Orientation = 0;
                if (alpha > (3 * Math.PI) / 4 && alpha <= (5 * Math.PI) / 4) {
                    // Initial camera angle
                    orientation = 3;
                } else if (
                    alpha > (5 * Math.PI) / 4 &&
                    alpha <= (7 * Math.PI) / 4
                ) {
                    // Rotated right once
                    orientation = 0;
                } else if (alpha > (7 * Math.PI) / 4 || alpha <= Math.PI / 4) {
                    // Rotated right twice
                    orientation = 1;
                } else if (
                    alpha > (1 * Math.PI) / 4 &&
                    alpha <= (3 * Math.PI) / 4
                ) {
                    // Last quadrant : rotated right 3 times
                    orientation = 2;
                }
                //console.log("View matrix changed, so switching to orientation ", orientation);
                this.bus.emit("rotated", {
                    orientation: orientation,
                });
                this.bus.emit("rotatedContinuous", {
                    restrictedAlpha: alpha,
                });
            }
        }
    }

    cameraShake() {
        if (!this.camera) return;

        const duration = 6;
        const midDuration = Math.floor(duration / 2);

        let shakeAnim = new Animation(
            "shakeAnim",
            "radius",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        let shakeKeys = [];
        shakeKeys.push({ frame: 0, value: this.camera.radius });
        shakeKeys.push({ frame: midDuration, value: this.camera.radius - 0.3 });
        shakeKeys.push({ frame: duration, value: this.camera.radius });
        shakeAnim.setKeys(shakeKeys);

        this.camera.animations = [shakeAnim];

        this.scene.beginAnimation(this.camera, 0, duration, false);
    }

    fade(mode: boolean) {
        // True = fade in, false = fade out
        if (!this.camera) return;
        if (!this._postProcess) return;

        var fadeAnim = new Animation(
            "fadeAnim",
            "vignetteWeight",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        let fadeKeys = [];
        if (mode) {
            fadeKeys.push({ frame: 0, value: 0 });
            fadeKeys.push({ frame: 60, value: 100000 });
        } else {
            fadeKeys.push({ frame: 0, value: 100000 });
            fadeKeys.push({ frame: 60, value: 0 });
        }

        fadeAnim.setKeys(fadeKeys);
        this._postProcess.animations = [fadeAnim];

        // Creating an easing function
        const easingFunction = mode
            ? new BezierCurveEase(1, 0.0, 1, 0)
            : new BezierCurveEase(0, 1, 0, 1);

        // Adding the easing function to the animation
        fadeAnim.setEasingFunction(easingFunction);

        const anim = this.scene.beginAnimation(this._postProcess, 0, 60, false); 
        anim.onAnimationEnd = () => {
            this.bus.emit("fadeoutcomplete");
        };
    }

    // Permet de lancer un nouveau niveau
    async playLevel(offsetLevel = 0) {
        if (offsetLevel != 0) {
            this.fade(true);
            await sleep(1000);
        }
        console.debug(`Playing a new level`);
        if (offsetLevel != 0) {
            this.cameraAngleDream = DEFAULT_CAMANGLE;
            this.cameraAngleNightmare = DEFAULT_CAMANGLE;
        } else if (this.camera && this.player) {
            if (this.player.world == World.Dream) {
                this.cameraAngleDream = [this.camera.alpha, this.camera.beta];
            } else
                this.cameraAngleNightmare = [
                    this.camera.alpha,
                    this.camera.beta,
                ];
        }
        const oldLevelIndex = this.levelIndex;
        if (oldLevelIndex == 0) { // Si on quitte la world map
            this.lMoveLevel0 = [];
            this.level._lMove.forEach(
                (x:[number, State, Vector3, World, Player | Box | null]) => {this.lMoveLevel0.push(x);}
            );
            this.lPosBox = [];
            this.level.boxes.forEach( (box) => {
                this.lPosBox.push(box.getPosition());
                this.lMoveLevel0.forEach(
                    (x:[number, State, Vector3, World, Player | Box | number | null]) => {
                        if (x[1] == State.Box && x[4] == box) {
                            x[4] = this.lPosBox.length - 1;
                        }
                    }
                );
            });
            console.log(this.lMoveLevel0, this.lPosBox);
        }
        this.level.dispose();
        this.levelIndex += offsetLevel;
        if (this.levelIndex == 0) { // Quand on entre dans la world map 
            this.playWorldMap(oldLevelIndex);
            return;
        }
        this.initPlayer();
        this.level.createLevel();
        this.loadSkyBox(World.Dream);
        this.setupCamera();
    }

    playLevelAbs(levelIndex: number) {
        this.playLevel(-this.levelIndex + levelIndex);
    }

    playWorldMap(i:number) {
        this.initPlayer();
        // console.log(this.lMoveLevel0, this.lPosBox);
        this.level.levelsComplete = this.levelsComplete;
        this.level.createLevel(i, this.lPosBox);

        this.level._lMove = [];
        this.lMoveLevel0.forEach(
            (x:[number, State, Vector3, World, Player | Box | number | null]) => {
                if (x[1] == State.Player) {
                    this.level._lMove.push([
                        x[0], x[1], x[2], x[3], this.player? this.player : null
                    ]);
                } else if (x[1] == State.Box ) {
                    this.level._lMove.push([
                        x[0], x[1], x[2], x[3], this.level.findBoxByPos(this.lPosBox[ x[4] as number ])
                    ]);
                } else {
                    this.level._lMove.push(x);
                }
            }
        );
        if (this.level._lMove.length != 0) this.level._currentMove = this.level._lMove[this.level._lMove.length - 1][0] + 1;
        else this.level._currentMove = 0;
        this.loadSkyBox(World.Dream);
        this.setupCameraWorldMap();
    }
    
    // Permet de switch entre le monde rêve et cauchemar
    switchWorld() {
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
            const alpha = this.camera.alpha;
            const beta = this.camera.beta;
            this.camera.setTarget(this.level.getCenter(world));

            this.camera.radius = 15;
            this.camera.alpha = alpha;
            this.camera.beta = beta;

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
