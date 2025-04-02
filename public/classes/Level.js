const up = new BABYLON.Vector3(0, 1, 0);
const down = new BABYLON.Vector3(0, -1, 0);

class Level {
    constructor(scene, assets, grid) {

        const shape = grid.shape();
        console.info("Loading level of shape :", shape)
        console.info("Full map is available here :", grid)
        
        this.scene = scene;
        this.grid = grid;
        this.assets = assets;
        this.boxes = [];
        this.grounds = [];
        this.rocks = [];
    }

    forEachTile(func) {
        for (let y = 0; y < this.grid.length; y++) {
            for (let z = 0; z < this.grid[y].length; z++) {
                for (let x = 0; x < this.grid[y][z].length; x++) {
                    const char = this.grid[y][z][x];
                    const position = new BABYLON.Vector3(x, y, -z);
                    func(char, position);
                }
            }
        }
    }

    updateTileState(position, newState) {
        // console.log(`trying to set grid[${position.y}][${position.z * -1}][${position.x}] = '${newState}'`)
        this.grid[position.y][position.z * -1][position.x] = newState;
    }

    getTileState(position) {
        try {
            return this.grid[position.y][position.z * -1][position.x] || " ";
        } catch {
            return " ";
        }
    }

    isPositionValid(position) {
        return (
            position.y >= 0 && position.y < this.grid.length &&
            position.z * -1 >= 0 && position.z * -1 < this.grid[0].length &&
            position.x >= 0 && position.x < this.grid[0][0].length
        );
    }

    findBoxByPos(position) {
        return this.boxes.find(tile => tile.mesh.position.equals(position));
    }

    createLevel() {
        this.forEachTile((char, position) => {
            if (char === "#") {
                if(position.y > 0) {
                    this.rocks.push(this.assets.createInstance("rock", position));
                } else {
                    this.grounds.push(this.assets.createInstance("tile", position, false));
                }
            } else if (char === "$") {
                const box = new Box(this, this.scene, position);
                this.boxes.push(box);
            }
        });
    }

    getSpawnPoint() {
        let pos = null;
        
        this.forEachTile((char, position) => {
            if (char === "@") pos = position;
        });

        return pos;
    }

    createGround(position, r = 0.3, g = 0.3, b = 0.3) {
        const ground = BABYLON.MeshBuilder.CreateBox("ground", {}, this.scene);
        ground.position = position;
        ground.material = new BABYLON.StandardMaterial("groundMat", this.scene);
        ground.material.diffuseColor = new BABYLON.Color3(r, g, b);
        this.grounds.push(ground);
    }
    
    dispose() {
        this.boxes.forEach(box => box.dispose());
        this.boxes = [];

        this.rocks.forEach(rock => rock.dispose());
        this.rocks = [];

        this.grounds.forEach(ground => ground.dispose());
        this.grounds = [];
    }
}
