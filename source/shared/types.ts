import { TransformNode, Nullable, BaseTexture } from "babylonjs";

export enum State {
  Box = "$",
  FixedBox = "~",
  SpawnPoint = "@",
  Void = " ",
  Ground = "#",
  Rock = "X",
  Flag = ".",
  Portal = "§",
  PortalRotated = "µ",
  Player = "P",
  Level = "L"
}

export type Map3 = State[][][];
export type Map4 = Map3[];

export type Tile = TransformNode;

export enum World {
  Dream,
  Nightmare,
};


export type EnvTextureArray = {dream: BaseTexture | null, nightmare: BaseTexture | null};

export const WorldKey = {
    Dream : "dream" as keyof EnvTextureArray,
    Nightmare : "nightmare" as keyof EnvTextureArray
};

export type InputDirection = {x: number, y: number};
export type Orientation = 0 | 1 | 2 | 3;

export const INPUT_RIGHT = {x: 1, y: 0};
export const INPUT_LEFT = {x: -1, y: 0};
export const INPUT_UP = {x: 0, y: 1};
export const INPUT_DOWN = {x: 0, y: -1};

export type RenderingCanvas = Nullable<
    | HTMLCanvasElement
    | OffscreenCanvas
    | WebGLRenderingContext
    | WebGL2RenderingContext
>;