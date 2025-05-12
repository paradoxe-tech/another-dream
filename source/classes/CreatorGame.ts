import { Game } from "@/classes/Game";
import { Level } from "./Level";
import { Map4, World } from "@/shared/types";

export class CreatorGame extends Game {
  customLevel: Level
  
  constructor(maps: Map4) {
    super("/assets/", true);
    this.customLevel = new Level(
      this.scene,
      this.assets,
      maps,
      this.bus,
      World.Dream
    );
  }

  get level() {
    return this.customLevel;
  }
  
  // Crée un nouveau niveau (à partir d'une matrice de state) (pour l'éditeur)
  runFromMap(maps: Map4) {
    this.customLevel.dispose();
    this.customLevel = new Level(
        this.scene,
        this.assets,
        maps,
        this.bus,
        World.Dream,
    );
    this.initPlayer();
    this.customLevel.createLevel();
    this.setupCamera();
  }
}