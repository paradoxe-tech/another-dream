import { Vector3 } from "babylonjs";
import { Game } from "./classes/Game";
import { State, World } from "./shared/types";
import { up } from "./shared/vectors";
import { Player } from "./classes/Player";
import { Box } from "./classes/Box";
var game: Game;

const url = new URLSearchParams(window.location.search);
const level = url.get("lvl");
let startLevel: number;
if (level) {
  startLevel = parseInt(level);
} else {
  startLevel = 0;
}

const $ = (sel: string) => document.querySelector(sel);
const $$ = (sel: string) => document.querySelectorAll(sel);

const urlSafeMode = url.get("safemode");

window.addEventListener("DOMContentLoaded", () => {
  if (urlSafeMode && parseInt(urlSafeMode) == 1) {
    game = new Game("/assets/", false, true);
  } else {
    game = new Game();
  }
  (window as any).game = game;

  game.bus.on("preloaded", () => {
    const levelsCompleteStr = localStorage.getItem("levelsComplete") || null;
    if (levelsCompleteStr) {
      const levelsComplete = JSON.parse(levelsCompleteStr);
      if (levelsComplete) {
        game.levelsComplete = levelsComplete;
        const lastFinishedLvl = levelsComplete.lastIndexOf(true);
        if (lastFinishedLvl > -1) {
          // Pour arriver au dernier niveau complété sur la map
          game.levelIndex = lastFinishedLvl + 1;
        }
        startLevel = -game.levelIndex;
      }
      game.bus.emit("levelCntVisible");
    }
    game.playLevel(startLevel);
    const levelCnt = game.levelsComplete.filter(i => i === true).length;
    game.bus.emit("levelCntUpdate", {levelCnt: levelCnt, totalLevelCnt: game.levelsComplete.length, levelsComplete: game.levelsComplete});
    game.engine.runRenderLoop(() => {
      if (game.scene.activeCamera) game.scene.render()
    });
  });

  game.bus.on("previouslevel", () => {
    if (!game.player) return;
    game.player._canMove = false;
    game.playLevel(-1);
  });

  game.bus.on("nextlevel", () => {
    if (!game.player) return;
    game.player._canMove = false;
    game.bus.emit("exitLevelPossible");
    game.playLevel(1);
  });

  game.bus.on("changeLevel", (i: number = 0) => {
    if (!game.player) return;
    game.player._canMove = false;
    game.bus.emit("changeLevelNotPossible");
    /*
    if (i == 0) {
      game.bus.emit("exitLevelNotPossible");
    } else {
      game.bus.emit("exitLevelPossible");
    }
    */
    game.playLevelAbs(i);
  });

  game.bus.on("exitLevel", () => {
    game.bus.emit("changeLevel", 0);
  });

  game.bus.on("restart", () => {
    if (game.levelIndex != 0) game.playLevel(0);
  });

  game.bus.on("loaded", () => {
    if (game.player) {
      game.player.animateSpawn(
        game.level.getSpawnPoint(game.player.world).add(up.scale(-0.5)),
      );
      if (game.levelIndex == 0 && game.camera) {
        console.log("yey");
        const center = game.level.getCenter(game.player.world);
        game.camera.setTarget(new Vector3(center.x, center.y, game.level.getSpawnPoint(game.player.world).z));
      }
    }
  });

  game.bus.on("switch", () => {
    game.switchWorld();
  });

  game.bus.on("addMove", (obj) => {
    //console.log("On ajoute le move", obj.move, obj.tileState, obj.position, obj.world, obj.ref);
    game.level.addMove(
      obj.move,
      obj.tileState,
      obj.position,
      obj.world,
      obj.ref,
    );
  });

  game.bus.on("back", () => {
    if (!game.player) return;
    if (game.player._queue != 0 || !game.player._canMove) return;
    game.level.backMove();
  });

  game.bus.on("backWorld", () => {
    game.backWorld();
  });

  game.bus.on("addQueue", () => {
    if (!game.player) return;
    game.player.queue = 1;
  });

  game.bus.on("removeQueue", () => {
    if (!game.player) return;
    game.player.queue = -1;
  });

  game.bus.on("resetCam", () => {
    game.resetCamera();
  });

  game.bus.on("path", () => {
    if (!game.player) return;
    game.level.getPath(game.player);
  });

  game.bus.on("shake", () => {
    game.cameraShake();
  });

  game.bus.on("completeLevel", () => {
    game.levelsComplete[game.levelIndex - 1] = true;
    localStorage.setItem("levelsComplete", JSON.stringify(game.levelsComplete));
    const levelCnt = game.levelsComplete.filter(i => i === true).length;
    game.bus.emit("levelCntUpdate", {levelCnt: levelCnt, totalLevelCnt: game.levelsComplete.length, levelsComplete: game.levelsComplete});
  });

  game.bus.on("fadeoutcomplete", () => {
    if (game.levelIndex == 0) {
      game.bus.emit("exitLevelNotPossible");
    } else {
      game.bus.emit("exitLevelPossible");
    }
  });

  game.bus.on("sound", (name: string) => {
    game.launchSound(name);
  });

  game.bus.on("backMap", () => {
    if (
      !game.player ||
      game.levelIndex == 0 ||
      game.player._queue != 0 ||
      !game.player._canMove
    )
      return;
    game.bus.emit("changeLevel", 0);
  });
});
