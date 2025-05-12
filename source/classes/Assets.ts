import {
  Scene,
  TransformNode,
  SceneLoader,
  Vector3,
  AnimationGroup,
} from "babylonjs";
import { EventBus } from "./Bus";
import { GameError } from "./Error";
import { r } from "@/shared/utils";
import "babylonjs-loaders";

export class AssetsManager {
  bus: EventBus;
  scene: Scene;
  assets: { [key: string]: TransformNode };
  animationGroupsByAsset: { [key: string]: AnimationGroup[] };
  groups: { [key: string]: number };

  constructor(scene: Scene, bus: EventBus) {
    this.scene = scene;
    this.bus = bus;
    this.assets = {};
    this.animationGroupsByAsset = {};
    this.groups = {};
  }

  async loadAsset(name: string, filenames: string[], path: string) {
    this.groups[name] = filenames.length;

    for (let i = 1; i <= filenames.length; i++) {
      await this.loadSingleAsset(`${name}-${i}`, filenames[i - 1], path);
    }

    this.bus.on(
      "playAnim",
      (data: {
        asset: string;
        anim: string;
        stopAll: boolean;
        loop: boolean;
      }) => {
        this.playAnim(data.asset, data.anim, data.stopAll, data.loop);
      },
    );
  }

  loadSingleAsset(
    name: string,
    filename: string,
    path: string,
  ): Promise<TransformNode> {
    return new Promise((resolve, reject) => {
      if (this.assets[name]) {
        resolve(this.assets[name]);
        return;
      }

      SceneLoader.ImportMesh(
        "",
        path,
        filename,
        this.scene,
        (meshes, particleSystem, skeletons, animationGroups) => {
          let rootMesh = new TransformNode(name, this.scene);
          meshes.forEach((mesh) => {
            mesh.parent = rootMesh;
          });

          rootMesh.setEnabled(false);
          this.assets[name] = rootMesh;
          this.animationGroupsByAsset[name] = animationGroups;
          resolve(rootMesh);
        },
        null,
        (_scene: Scene, message: string, exception: DOMException) => {
          reject(message);
          console.error(exception);
        },
      );
    });
  }

  createInstance(
    name: string,
    position: Vector3,
    stickToGround = true,
    scaleFactor: number = 1.0,
  ): TransformNode {
    return this.createSingleInstance(
      `${name}-${r(this.groups[name])}`,
      position,
      stickToGround,
      scaleFactor,
    );
  }

  createSingleInstance(
    name: string,
    position: Vector3,
    stickToGround = true,
    scaleFactor: number = 1.0,
  ): TransformNode {
    if (!this.assets[name])
      throw new GameError(
        `Asset '${name}' instance could not be loaded.`,
        this.bus,
      );

    let rootMesh = this.assets[name];
    let instance = rootMesh.clone(`${name}_instance`, null);
    if (!instance)
      throw new GameError(
        `Asset '${name}' instance could not be cloned.`,
        this.bus,
      );

    instance.setEnabled(true);

    let childMeshes = instance.getChildMeshes();
    if (childMeshes.length === 0)
      throw new GameError(
        `Asset '${name}' instance has no child meshes.`,
        this.bus,
      );

    childMeshes.forEach((mesh) => (mesh.isVisible = true));

    let minX = Number.MAX_VALUE,
      maxX = Number.MIN_VALUE;
    let minY = Number.MAX_VALUE,
      maxY = Number.MIN_VALUE;
    let minZ = Number.MAX_VALUE,
      maxZ = Number.MIN_VALUE;

    childMeshes.forEach((mesh) => {
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
    let scale = Math.min(scaleX, scaleZ) * scaleFactor;
    instance.scaling = new Vector3(scale, scale, scale);

    instance.position = position.clone();

    // "C'est voué à être un peu mieux"
    //  - Mathéo Tripnaux-Mangemoilepoiro, 16 avril 2025
    if (stickToGround) {
      const normalY = Math.floor(position.y) - 0.5;
      instance.position.y = normalY;
    }

    return instance;
  }

  getAnimationGroupByName(asset: string, animGroup: string) {
    return (
      this.animationGroupsByAsset[asset]?.find(
        (group) => group.name === animGroup,
      ) || undefined
    );
  }

  playAnim(asset: string, name: string, stopAll = true, loop = true) {
    if (!this.animationGroupsByAsset[asset])
      throw new GameError(
        `Requesting to play animation group ${name} from ${asset}, but no animation group exist from this asset. :( This is very sad.`,
        this.bus,
      );
    
    if (stopAll)
      this.animationGroupsByAsset[asset].forEach((group) => group.stop());
    
    let anim = this.getAnimationGroupByName(asset, name);
    if (!anim) {
      throw new GameError(
        `Requesting to play animation group ${name} from ${asset}, but this group does not exist in this asset.`,
        this.bus,
      );
    } else {
      anim.loopAnimation = loop;
      anim.start(true);
    }
  }
}
