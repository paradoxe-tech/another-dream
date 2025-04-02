class Player {
    constructor(scene, level, bus) {
        this.scene = scene;
        this.level = level;
        this.bus = bus;

        const spawnPoint = this.level.getSpawnPoint();
        this.mesh = this.level.assets.createInstance("player", spawnPoint);
        this.mesh.rotation.y = Math.atan2(1, 0);
        
        this.setupControls();
    }

    move(dx, dz) {
        if (this.isMoving) return;
        
        const direction = new BABYLON.Vector3(dx, 0, dz);
        const position = new BABYLON.Vector3(
            Math.round(this.mesh.position.x),
            Math.round(this.mesh.position.y),
            Math.round(this.mesh.position.z),
        )
        
        const frontPosition = position.add(direction);
        const frontState = this.level.getTileState(frontPosition);
        const frontGroundState = this.level.getTileState(frontPosition.add(down));
        
        if(frontGroundState == " ") return;
        if(frontState == "#" || frontState == "X") return;
        if(frontState == ".") this.bus.emit("nextlevel")
        if(frontState == "$") {
            const box = this.level.findBoxByPos(frontPosition);
            const hasBeenPushed = box.tryToPush(direction);
            if (!hasBeenPushed) return;
        }

        let nextPosition = this.mesh.position.add(direction);
        nextPosition.y =  Math.floor(nextPosition.y / this.mesh.normY) * this.mesh.normY;
        
        this.animateMove(nextPosition)
    }

    animateMove(newPosition) {
        this.isMoving = true;

        const duration = 14;
        const midDuration = Math.floor(duration / 2)
        
        let moveAnim = new BABYLON.Animation(
            "moveAnim", "position", 60, 
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        let moveKeys = []; 

        moveKeys.push({ frame: 0, value: this.mesh.position.clone() });

        let midPosition = BABYLON.Vector3.Lerp(this.mesh.position, newPosition, 0.5);
        midPosition.y += 0.2;
        moveKeys.push({ frame: midDuration, value: midPosition });
        moveKeys.push({ frame: duration, value: newPosition });

        moveAnim.setKeys(moveKeys);
        let direction = newPosition.subtract(this.mesh.position);
        let targetRotation = Math.atan2(direction.x, direction.z);
        const currentRotation = this.mesh.rotation.y;
        let delta = targetRotation - currentRotation;

        if (delta > Math.PI) {
            targetRotation -= 2 * Math.PI;
        } else if (delta < -Math.PI) {
            targetRotation += 2 * Math.PI;
        }

        let rotationAnim = new BABYLON.Animation(
            "rotateAnim", "rotation.y", 60, 
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        let rotationKeys = [];
        rotationKeys.push({ frame: 0, value: currentRotation });
        rotationKeys.push({ frame: duration, value: targetRotation });

        rotationAnim.setKeys(rotationKeys);
        this.mesh.animations = [moveAnim, rotationAnim];
        
        let anim = this.scene.beginAnimation(this.mesh, 0, duration, false);
        
        anim.onAnimationEnd = () => {
            this.isMoving = false;
        };
        
        this.targetPosition = newPosition;
    }

    setupControls() {
        this._keyHandler = (event) => {
            if (event.key === "ArrowUp") this.move(1, 0);
            if (event.key === "ArrowDown") this.move(-1, 0);
            if (event.key === "ArrowLeft") this.move(0, 1);
            if (event.key === "ArrowRight") this.move(0, -1);
            if (event.key === "p") this.bus.emit("previouslevel")
            if (event.key === "n") this.bus.emit("nextlevel")
            if (event.key === "r") this.bus.emit("restart")
        };
        
        window.addEventListener("keydown", this._keyHandler);
    }

    dispose() {
        window.removeEventListener("keydown", this._keyHandler);
        this.mesh.dispose();
    }
}
