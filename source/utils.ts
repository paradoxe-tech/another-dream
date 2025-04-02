import { Vector3 } from "babylonjs";

export const up = new Vector3(0, 1, 0);
export const down = new Vector3(0, -1, 0);

export function v(position: Vector3) {
    return `(x: ${position.x}, y: ${position.y}, z: ${position.z}) <=> [${position.y}][${-position.z}][${position.x}]`
}

export const r = (max: number) => Math.floor(Math.random() * max) + 1;