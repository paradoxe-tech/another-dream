let game = null;

const url = new URLSearchParams(window.location.search)
const startLevel = url.has("lvl") ? +(url.get("lvl")) + 1 : 0

window.addEventListener("DOMContentLoaded", () => {
  game = new Game();

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