let game = null;

window.addEventListener("DOMContentLoaded", () => {
  game = new Game();

  game.bus.on("loaded", () => {
    game.playLevel();
  })

  game.bus.on("nextlevel", () => {
    game.nextLevel();
  })
  
});

window.addEventListener("mousemove", () => {
  let coords = game.camera._position;
});