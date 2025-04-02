import { Engine, Scene, Nullable, HemisphericLight } from "babylonjs";
import { ArcRotateCamera, FollowCamera, StandardMaterial, MeshBuilder } from "babylonjs";
import { Vector3, CubeTexture, Texture, Color3 } from "babylonjs";
import { EventBus } from "./Bus";
import { AssetsManager } from "./Assets";
import { up, down, v, r } from "../utils";
import { Player } from "./Player";
import { Level } from "./Level";
import { Map3 } from "../types";

type RenderingCanvas = Nullable<HTMLCanvasElement | OffscreenCanvas | WebGLRenderingContext | WebGL2RenderingContext>;

export class Game {

    canvas: RenderingCanvas;
    engine: Engine;
    scene: Scene;
    assets: AssetsManager;
    bus: EventBus;
    light: HemisphericLight;
    
    player?: Player;
    camera?: ArcRotateCamera | FollowCamera;

    levelIndex: number;
    levels: Level[];
    
    constructor(relPath="/assets/") { 
        this.canvas = document.getElementById("renderCanvas") as RenderingCanvas;
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.bus = new EventBus();
        this.assets = new AssetsManager(this.scene);
        
        this.light = new HemisphericLight("light", up, this.scene);

        this.loadAssets(relPath);

        this.levelIndex = 0;
        this.levels = [];

        for(let i=1; i <= JSON.parse(get('/levels')).n; i++) {
            this.levels.push(
                new Level(this.scene, this.assets, JSON.parse(get(`/level/${i}`)))
            )
        }
        
        this.loadSkyBox(relPath);

        window.addEventListener("resize", () => this.engine.resize());
    } 

    // Renvoie le level actuel
    get level() { 
        return this.levels[this.levelIndex]
    } 

    async loadAssets(relPath: string) {
        relPath = relPath + "/models/";
        
        this.assets.loadAsset("rock", "Rock3.obj", relPath);
        // await this.assets.loadAsset("tile-1", "cloud1.gltf", relPath);
        // await this.assets.loadAsset("tile-2", "cloud2.gltf", relPath);
        // await this.assets.loadAsset("tile-3", "cloud3.gltf", relPath);
        await this.assets.loadAsset("tile-1", "grass.glb", relPath);
        await this.assets.loadAsset("tile-2", "grass.glb", relPath);
        await this.assets.loadAsset("tile-3", "grass.glb", relPath);
        await this.assets.loadAsset("box", "crate.gltf", relPath);
        await this.assets.loadAsset("flag", "flag.gltf", relPath);
        await this.assets.loadAsset("player", "dummy.gltf", relPath);

        this.bus.emit("loaded");
    }

    // Initialise une caméra qui suit le joueur (a priori inutile) et l'affecte
    setupFollowCamera() { 
        this.camera = new FollowCamera("FollowCam", new Vector3(0, 15, 0), this.scene)

        this.camera.radius = 15;
        this.camera.heightOffset = 5;
        this.camera.rotationOffset = -45;
        this.camera.cameraAcceleration = 0.01;
        this.camera.maxCameraSpeed = 2;

        this.scene.activeCamera = this.camera;
        // this.camera.attachControl(this.canvas, true);
        this.camera.inputs.removeByType("FollowCameraKeyboardMoveInput");
        this.camera.inputs.removeByType("FollowCameraMouseInput");

        this.camera.rotation = new Vector3(0, Math.PI / 2, 0);
    } 

    // Initialise une caméra immobile et l'affecte
    setupStaticCamera() { 
        const cz = this.level.shape[1] / 2
        const cx = this.level.shape[2] / 2

        const center = new Vector3(cx, 0, -cz);
            
        this.camera = new ArcRotateCamera(
            "StaticCam",
            3*Math.PI / 4,
            Math.PI / 4,
            15,
            center,
            this.scene,
        );

        this.camera.attachControl(this.canvas, true);
        this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    } 

    // Initialise le ciel
    loadSkyBox(relPath: string) {
        const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000 }, this.scene);
        const skyboxMaterial = new StandardMaterial("skyBoxMaterial", this.scene);

        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture(relPath + "/skybox/sky", this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);

        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true;
    }

    // Initialise le joueur et l'affecte
    initPlayer() {
        if(this.player) this.player.dispose();
        delete this.player;
        this.player = new Player(this.scene, this.level, this.bus);
    }

    // Crée un nouveau niveau (à partir d'une matrice de state) (pour l'éditeur)
    runFromMap(map: Map3) {
        let level = new Level(this.scene, this.assets, map);
        level.createLevel();
        this.initPlayer();
        this.setupCamera("static");
    }

    // Choisit la caméra a initialiser
    setupCamera(mode: string) {
        if(mode == "static") this.setupStaticCamera();
        else this.setupFollowCamera();
        if (!this.camera) throw new Error(`Camera could not be setted up`);
        if (mode == "follow") {
            if (this.player) this.camera.lockedTarget = this.player.mesh;
            else throw new Error("Player needs to be instanciated to setup FollowCamera")
        }
    }

    // Permet de lancer un nouveau niveau
    playLevel(offsetLevel=0, setupCamera=true) {
        this.level.dispose();
        this.levelIndex += offsetLevel;
        this.level.createLevel();
        this.initPlayer();

        if(setupCamera) this.setupCamera("static");
    }
}
