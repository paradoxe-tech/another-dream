import { Vector3 } from "babylonjs";
import { Game } from "./classes/Game";
import { State, World } from "./shared/types";
import { up } from "./shared/vectors";
import { Player } from "./classes/Player";
import { Box } from "./classes/Box";
var game: Game;

const url = new URLSearchParams(window.location.search);
const level = url.get("lvl");
let startLevel;
if (level) {
  startLevel = parseInt(level) - 1;
} else {
  startLevel = parseInt(localStorage.getItem("startLevel") || "0");
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
    game.playLevel(startLevel);
    game.engine.runRenderLoop(() => game.scene.render());
  });

  game.bus.on("previouslevel", () => {
    game.playLevel(-1);
  });

  game.bus.on("nextlevel", () => {
    game.playLevel(1);
  });

  game.bus.on("restart", () => {
    game.playLevel(0);
  });

  game.bus.on("loaded", () => {
    if (game.player) {
      game.player.animateSpawn(
        game.level.getSpawnPoint(game.player.world).add(up.scale(-0.5)),
      );
    }
  });

  game.bus.on("switch", () => {
    game.switchWorld();
  });

  game.bus.on("addMove", (obj) => {
    //console.log("On ajoute le move", obj.move, obj.tileState, obj.position, obj.world, obj.ref);
    game.level.addMove(obj.move, obj.tileState, obj.position, obj.world, obj.ref);
  })

  game.bus.on("back", () => {
    if (!game.player) return;
    if (game.player._isMoving) return;
    game.level.backMove();
  })

  game.bus.on("backWorld", () => {
    game.backWorld();
  });

  game.bus.on("addQueue", ()=> {
    game.queue = 1;
  });

  game.bus.on("removeQueue", ()=> {
    game.queue = -1;
  });
});