import { Game } from "./classes/Game";

var game: Game;

const url = new URLSearchParams(window.location.search);
const level = url.get("lvl");
const startLevel = level ? parseInt(level) + 1 : 0;

window.addEventListener("DOMContentLoaded", () => {
  game = new Game();
  console.log(game);

  game.bus.on("loaded", () => {
    game.playLevel(startLevel);
    game.engine.runRenderLoop(() => game.scene.render());
  })

  game.bus.on("previous", () => {
    game.playLevel(-1);
  })

  game.bus.on("nextlevel", () => {
    game.playLevel(1);
  })

  game.bus.on("restart", () => {
    game.playLevel(0, false);
  })
  
});