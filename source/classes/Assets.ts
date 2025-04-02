import { Scene, TransformNode, SceneLoader, Vector3 } from "babylonjs";
import "babylonjs-loaders";

export class AssetsManager {

  scene: Scene;
  assets: { [key: string]: TransformNode };
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.assets = {};
  }

  loadAsset(name: string, filename: string, path: string): Promise<TransformNode> {
    return new Promise((resolve, reject) => {
      if (this.assets[name]) {
        resolve(this.assets[name]);
        return;
      }

      SceneLoader.ImportMesh("", path, filename, this.scene, 
        (meshes) => {

          let rootMesh = new TransformNode(name, this.scene);
          meshes.forEach(mesh => {
            mesh.parent = rootMesh;
          });

          rootMesh.setEnabled(false);
          this.assets[name] = rootMesh;
          resolve(rootMesh);
          
        }, 
        null, 
        (_scene: Scene, message: string, exception: DOMException) => {
          reject(message);
          console.error(message, exception);
        }
      );
    });
  }

  createInstance(name: string, position: Vector3, stickToGround=true): TransformNode {
    if (!this.assets[name]) throw new Error(`Asset '${name}' instance could not be loaded.`);

    let rootMesh = this.assets[name];
    let instance = rootMesh.clone(`${name}_instance`, null);
    if (!instance) throw new Error(`Asset '${name}' instance could not be cloned.`)
    
    instance.setEnabled(true);

    let childMeshes = instance.getChildMeshes();
    if (childMeshes.length === 0) throw new Error(`Asset '${name}' instance has no child meshes.`)

    childMeshes.forEach(mesh => mesh.isVisible = true);
    
    let minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE;
    let minY = Number.MAX_VALUE, maxY = Number.MIN_VALUE;
    let minZ = Number.MAX_VALUE, maxZ = Number.MIN_VALUE;

    childMeshes.forEach(mesh => {
      mesh.refreshBoundingInfo({});
      
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
    instance.scaling = new Vector3(scale, scale, scale);

    instance.position = position.clone();
    
    if(stickToGround) {
      const normalY = Math.floor(position.y) - 0.5;
      instance.position.y = normalY;
    }

    return instance;
  }

}