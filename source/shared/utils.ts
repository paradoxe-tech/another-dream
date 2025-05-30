import { Map3, Map4, State } from "./types";

export const r = (max: number) => Math.floor(Math.random() * max) + 1;

export function deepCopy(obj: Object) {
  return JSON.parse(JSON.stringify(obj));
}

export const levelShape = [2, 5, 20, 20];
export const levelMapShape = [2, 5, 120, 120];

export function padLevel(data: Map4, shape: number[] = levelShape) {
  const worldPaddingSize = shape[0] - data.length;
  let worldPadding = [];
  if (worldPaddingSize > 0) worldPadding = new Array(worldPaddingSize).fill([]);
  const paddedData: Map4 = [...data, ...worldPadding].map((world: Map3) => {
    const layerPaddingSize = shape[1] - world.length;
    let layerPadding = [];
    if (layerPaddingSize > 0)
      layerPadding = new Array(layerPaddingSize).fill([]);
    return [...world, ...layerPadding].map((layer: State[][]) => {
      const colPaddingSize = shape[2] - layer.length;
      let colPaddingL = [];
      let colPaddingR = [];
      if (colPaddingSize > 0) {
        colPaddingL = new Array(Math.floor(colPaddingSize / 2)).fill([]);
        colPaddingR = new Array(Math.ceil(colPaddingSize / 2)).fill([]);
      }
      return [...colPaddingL, ...layer, ...colPaddingR].map((row: State[]) => {
        const rowPaddingSize = shape[3] - row.length;
        let rowPaddingL = [];
        let rowPaddingR = [];
        if (rowPaddingSize > 0) {
          rowPaddingL = new Array(Math.floor(rowPaddingSize / 2)).fill(
            State.Void,
          );
          rowPaddingR = new Array(Math.ceil(rowPaddingSize / 2)).fill(
            State.Void,
          );
        }
        return [...rowPaddingL, ...row, ...rowPaddingR];
      });
    });
  });

  return paddedData;
}
