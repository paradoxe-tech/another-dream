const r = (max) => Math.floor(Math.random() * max) + 1

class Level {
    constructor(scene, assets, map) {
        this.shape = map.shape();
        this.scene = scene;
        this.grid = JSON.parse(JSON.stringify(map));
        this.state = map;
        this.assets = assets;
        this.tiles = [];
        this.boxes = [];
    }

    forEachGridTile(func) {
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

    forEachTile(func) {
        for (let y = 0; y < this.state.length; y++) {
            for (let z = 0; z < this.state[y].length; z++) {
                for (let x = 0; x < this.state[y][z].length; x++) {
                    const char = this.state[y][z][x];
                    const position = new BABYLON.Vector3(x, y, -z);
                    func(char, position);
                }
            }
        }
    }

    updateTileState(position, newState) {
        if(!this.isPositionValid(position)) console.error(`Trying to set state to '${newState}' at invalid position (x: ${position.x}, y: ${position.y}, z: ${position.z}) <=> [${position.y}][${-position.z}][${position.x}]`)
        this.state[position.y][position.z * -1][position.x] = newState;
    }

    getTileState(position) {
        try {
            return this.state[position.y][position.z * -1][position.x] || " ";
        } catch {
            return " ";
        }
    }

    isPositionValid(position) {
        return (
            position.y >= 0 && position.y < this.state.length &&
            position.z * -1 >= 0 && position.z * -1 < this.state[0].length &&
            position.x >= 0 && position.x < this.state[0][0].length
        );
    }

    findBoxByPos(position) {
        return this.boxes.find(tile => tile.mesh.position.equals(position));
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

    getSpawnPoint() {
        let pos = null;
        
        this.forEachTile((char, position) => {
            if (char === "@") pos = position;
        });

        return pos;
    }
    
    dispose() {
        this.tiles.forEach(tile => tile.dispose());
        this.tiles = [];

        this.boxes.forEach(box => box.dispose());
        this.boxes = [];
    }
}
