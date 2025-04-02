class Box {
    constructor(level, scene, position) {
        this.level = level;
        this.scene = scene;
        this.mesh = this.level.assets.createInstance("box", position, false);
        this.mesh.position = position;
        this.mesh.material = new BABYLON.StandardMaterial("boxMat", scene);
        this.mesh.material.diffuseColor = new BABYLON.Color3(1, 0.6, 0);
    }

    dispose() {
        this.mesh.dispose();
    }

    push(direction) {
        const newPosition = this.mesh.position.add(direction);
        this.level.updateTileState(this.mesh.position, " ");
        this.level.updateTileState(newPosition, "$");
        this.mesh.position = newPosition;
    }

    tryToPush(direction, stack=1) {
        if (stack >= 3) return false;
        
        const position = this.mesh.position;
        const nextPosition = position.add(direction);
        const nextGroundPosition = nextPosition.add(down);
        
        const nextFrontState = this.level.getTileState(nextPosition);
        const nextGroundState = this.level.getTileState(nextGroundPosition);

        if (nextFrontState == "#") return false;

        if (nextGroundState == " ") {
            this.push(direction.add(down));
            return true;
        }

        if (nextFrontState == "$") {
            const nextBox = this.level.findBoxByPos(nextPosition);
            const hasBeenPushed = nextBox.tryToPush(direction, stack + 1);
            
            if (hasBeenPushed) this.push(direction);
            return hasBeenPushed;
        }
        
        this.push(direction);

        return true;
    }
}
