const up = new BABYLON.Vector3(0, 1, 0);
const down = new BABYLON.Vector3(0, -1, 0);

class Game {
    // Création du jeu
    constructor(relPath="/assets/models/") { 
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.assets = new AssetManager(this.scene);
        this.bus = new Bus();
        
        this.light = new BABYLON.HemisphericLight("light", up, this.scene);

        (async () => {
            await this.assets.loadAsset("rock", "Rock3.obj", relPath);
            // await this.assets.loadAsset("tile-1", "cloud1.gltf", relPath);
            // await this.assets.loadAsset("tile-2", "cloud2.gltf", relPath);
            // await this.assets.loadAsset("tile-3", "cloud3.gltf", relPath);
            await this.assets.loadAsset("tile-1", "grass.glb", relPath);
            await this.assets.loadAsset("tile-2", "grass.glb", relPath);
            await this.assets.loadAsset("tile-3", "grass.glb", relPath);
            await this.assets.loadAsset("box", "crate.gltf", relPath);
            await this.assets.loadAsset("flag", "flag.gltf", relPath);
            await this.assets.loadAsset("player", "dummy.gltf", relPath);
            this.bus.emit("loaded")
        })()

        this.levelIndex = 0;
        this.levels = [];

        for(let i=1; i <= JSON.parse(get('/levels')).n; i++) {
            this.levels.push(
                new Level(this.scene, this.assets, JSON.parse(get(`/level/${i}`)))
            )
        }
        
        this.player = null;
        this.loadSkyBox();

        window.addEventListener("resize", () => this.engine.resize());
    } 

    // Renvoie le level actuel
    get level() { 
        return this.levels[this.levelIndex]
    } 

    // Initialise une caméra qui suit le joueur (a priori inutile) et l'affecte
    setupFollowCamera() { 
        this.camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 15, 0), this.scene)

        this.camera.radius = 15;
        this.camera.heightOffset = 5;
        this.camera.rotationOffset = -45;
        this.camera.cameraAcceleration = 0.01;
        this.camera.maxCameraSpeed = 2;

        this.scene.activeCamera = this.camera;
        // this.camera.attachControl(this.canvas, true);
        this.camera.inputs.removeByType("FollowCameraKeyboardMoveInput");
        this.camera.inputs.removeByType("FollowCameraMouseInput");

        this.camera.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
    } 

    // Initialise une caméra immobile et l'affecte
    setupStaticCamera() { 
        const cz = this.level.shape[1] / 2
        const cx = this.level.shape[2] / 2

        const center = new BABYLON.Vector3(cx, 0, -cz);
            
        this.camera = new BABYLON.ArcRotateCamera(
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
    loadSkyBox() {
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000 }, this.scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", this.scene);

        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("/assets/skybox/sky", this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true;
    }

    // Initialise le joueur et l'affecte
    initPlayer() {
        if(this.player) this.player.dispose();
        this.player = null;
        this.player = new Player(this.scene, this.level, this.bus);
    }

    // Crée un nouveau niveau (à partir d'une matrice de string) (pour l'éditeur)
    runFromMap(map) {
        let level = new Level(this.scene, this.assets, map);
        level.createLevel();
        this.initPlayer();
        this.setupCamera("static");
    }

    // Choisis la caméra a initialiser
    setupCamera(mode) {
        if(mode == "static") this.setupStaticCamera();
        else {
            this.setupFollowCamera();
            this.camera.lockedTarget = this.player.mesh;    
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
