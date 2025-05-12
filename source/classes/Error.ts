import { EventBus } from "./Bus";

export class GameError extends Error {
  constructor(message: string, bus: EventBus, catched?: any) {
    bus.emit("error", { message });

    if(catched) console.error(catched);
    
    super(message);
    this.name = "GameError";
  }
}