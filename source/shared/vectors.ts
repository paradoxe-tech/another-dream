import { Vector3 } from "babylonjs";

export const up = new Vector3(0, 1, 0);
export const down = new Vector3(0, -1, 0);
export const left = new Vector3(-1, 0, 0);
export const right = new Vector3(1, 0, 0);

export const nightmareOffset = up.scale(130);

export function v(position: Vector3) {
  return `(x: ${position.x}, y: ${position.y}, z: ${position.z}) <=> [${position.y}][${-position.z}][${position.x}]`;
}