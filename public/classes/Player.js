class Player {
    constructor(scene, level, bus) {
        this.scene = scene;
        this.level = level;
        this.bus = bus;
        
        this.mesh = BABYLON.MeshBuilder.CreateSphere(
            "player", 
            { diameter: 0.9 }, 
            scene
        );
        
        this.mesh.position = level.getSpawnPoint();
        this.setupControls();
    }

    move(dx, dz) {
        const direction = new BABYLON.Vector3(dx, 0, dz);
        const newPosition = this.mesh.position.add(direction);
        const groundState = this.level.getTileState(newPosition.add(down));
        const frontState = this.level.getTileState(newPosition);

        if(groundState == " ") return;
        
        if(frontState == "#") return;
        if(frontState == ".") this.bus.emit("nextlevel")
        if(frontState == "$") {
            const box = this.level.findBoxByPos(newPosition);
            const hasBeenPushed = box.tryToPush(direction);
            if (!hasBeenPushed) return;
        }

        this.mesh.position = newPosition;
    }

    setupControls() {
        this._keyHandler = (event) => {
            if (event.key === "ArrowUp") this.move(0, -1);
            if (event.key === "ArrowDown") this.move(0, 1);
            if (event.key === "ArrowLeft") this.move(1, 0);
            if (event.key === "ArrowRight") this.move(-1, 0);
        };
        
        window.addEventListener("keydown", this._keyHandler);
    }

    dispose() {
        window.removeEventListener("keydown", this._keyHandler);
        this.mesh.dispose();
    }
}
