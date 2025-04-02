class Game {
    constructor(relPath="/assets/models/") {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.assets = new AssetManager(this.scene);
        this.bus = new Bus();

        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            3*Math.PI / 4,
            Math.PI / 4,
            15,
            BABYLON.Vector3.Zero(),
            this.scene,
        );

        this.camera.attachControl(this.canvas, true);
        this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
        
        // pas toucher à ça
        this.light = new BABYLON.HemisphericLight(
            "light",
            new BABYLON.Vector3(1, 1, 0),
            this.scene,
        );

        (async () => {
            await this.assets.loadAsset("rock", "Rock3.obj", relPath);
            await this.assets.loadAsset("tile", "grass.glb", relPath);
            await this.assets.loadAsset("box", "crate.gltf", relPath);
            await this.assets.loadAsset("flag", "flag.gltf", relPath);
            this.bus.emit("loaded")
        })()

        this.levelIndex = 0;
        this.levels = [
            new Level(this.scene, this.assets, JSON.parse(get("/level/1"))),
            new Level(this.scene, this.assets, JSON.parse(get("/level/2"))),
            new Level(this.scene, this.assets, JSON.parse(get("/level/3"))),
            new Level(this.scene, this.assets, JSON.parse(get("/level/4"))),
            new Level(this.scene, this.assets, JSON.parse(get("/level/5"))),
            new Level(this.scene, this.assets, JSON.parse(get("/level/6"))),

            /*
            new Level(this.scene, JSON.parse(get("/tilemaps/level6.json"))),
            new Level(this.scene, JSON.parse(get("/tilemaps/level7.json"))),
            new Level(this.scene, JSON.parse(get("/tilemaps/level8.json"))),
            new Level(this.scene, JSON.parse(get("/tilemaps/level9.json"))),
            */
        ]
        
        this.player = null;

        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener("resize", () => this.engine.resize());
    }

    get level() {
        return this.levels[this.levelIndex]
    }

    nextLevel() {
        this.level.dispose();
        this.player.dispose();
        this.player = null;
        this.levelIndex ++;
        this.playLevel();
    }

    runFromMap(map) {
        // salut ?
        let level = new Level(this.scene, this.assets, map);
        level.createLevel();
        this.player = new Player(this.scene, level, this.bus);

        console.log(map.shape())
    }

    playLevel() {
        let level = this.levels[this.levelIndex];
        level.createLevel();
        this.player = new Player(this.scene, level, this.bus);
    }
}
