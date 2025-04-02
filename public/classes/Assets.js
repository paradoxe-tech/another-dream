class AssetManager {
  constructor(scene) {
    this.scene = scene;
    this.assets = {};
  }

  loadAsset(name, filename, path) {
    return new Promise((resolve, reject) => {
      if (this.assets[name]) {
        resolve(this.assets[name]);
        return;
      }

      BABYLON.SceneLoader.ImportMesh("", path, filename, this.scene, 
        (meshes) => {

          let rootMesh = new BABYLON.TransformNode(name, this.scene);
          meshes.forEach(mesh => {
            mesh.parent = rootMesh;
          });

          rootMesh.setEnabled(false);
          this.assets[name] = rootMesh;
          resolve(rootMesh);
          
        }, 
        null, 
        (_scene, message, exception) => {
          reject(message);
          console.error(message, exception);
        }
      );
    });
  }

  createInstance(name, position, stickToGround=true) {
    if (!this.assets[name]) {
      console.error(`Asset ${name} not loaded.`);
      return null;
    }

    let rootMesh = this.assets[name];
    let instance = rootMesh.clone(`${name}_instance`);
    instance.setEnabled(true);

    let childMeshes = instance.getChildMeshes();
    if (childMeshes.length === 0) {
      console.error("Instance has no child meshes.");
      return null;
    }

    childMeshes.forEach(mesh => mesh.isVisible = true);
    
    let minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE;
    let minY = Number.MAX_VALUE, maxY = Number.MIN_VALUE;
    let minZ = Number.MAX_VALUE, maxZ = Number.MIN_VALUE;

    childMeshes.forEach(mesh => {
      mesh.refreshBoundingInfo(true);
      let bbox = mesh.getBoundingInfo().boundingBox;
      minX = Math.min(minX, bbox.minimumWorld.x);
      maxX = Math.max(maxX, bbox.maximumWorld.x);
      minY = Math.min(minY, bbox.minimumWorld.y);
      maxY = Math.max(maxY, bbox.maximumWorld.y);
      minZ = Math.min(minZ, bbox.minimumWorld.z);
      maxZ = Math.max(maxZ, bbox.maximumWorld.z);
    });

    let sizeX = maxX - minX;
    let sizeZ = maxZ - minZ;
    let sizeY = maxY - minY;

    let scaleX = 1 / sizeX;
    let scaleZ = 1 / sizeZ;
    let scale = Math.min(scaleX, scaleZ);
    instance.scaling = new BABYLON.Vector3(scale, scale, scale);

    instance.position = position.clone();
    
    if(stickToGround) instance.position.y = position.y - 0.5 + (sizeY / 2);

    return instance;
  }

}