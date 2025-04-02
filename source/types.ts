import { TransformNode } from "babylonjs";

export enum State {
  Box = "$",
  FixedBox = "~",
  SpawnPoint = "@",
  Void = " ",
  Ground = "#",
  Rock = "X",
  Flag = ".",
  Portal = "§",
}

export type Map3 = State[][][];

export interface LevelMap {
  dream: Map3,
  nightmare: Map3
}

export type Tile = TransformNode;