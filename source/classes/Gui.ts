import {
  AdvancedDynamicTexture,
  TextBlock,
  StackPanel,
  Control,
  Button,
  Rectangle,
} from "babylonjs-gui";
import { Scene } from "babylonjs";
import { EventBus } from "./Bus";
import { Orientation } from "@/shared/types";

export class Gui {
  private ui: AdvancedDynamicTexture;
  private arrowText?: TextBlock;

  constructor(scene: Scene, private bus: EventBus) {
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    this.createButtons();
    this.createArrow();
    this.listen();
  }

  private createButtons() {
    const stack = new StackPanel();
    stack.width = "200px";
    stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.ui.addControl(stack);

    const makeButton = (label: string, event: string) => {
      const btn = Button.CreateSimpleButton(label, label);
      btn.width = "150px";
      btn.height = "40px";
      btn.color = "white";
      btn.background = "black";
      btn.onPointerUpObservable.add(() => this.bus.emit(event));
      stack.addControl(btn);
    };

    makeButton("Restart", "restart");
    makeButton("Undo", "back");
    makeButton("Next Level", "nextlevel");
    makeButton("Previous Level", "previouslevel");
  }

  private createArrow() {
    const panel = new Rectangle();
    panel.width = "100px";
    panel.height = "100px";
    panel.thickness = 0;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    this.arrowText = new TextBlock("arrow", "↑");
    this.arrowText.fontSize = 48;
    this.arrowText.color = "white";

    panel.addControl(this.arrowText);
    this.ui.addControl(panel);
  }

  private listen() {
    this.bus.on("rotated", (orientation: Orientation) => {
      const arrows = ["↑", "→", "↓", "←"];
      console.log("GUI helper : switching to orientation ", orientation%4);
      if (this.arrowText) this.arrowText.text = arrows[orientation % 4];
    });
  }
}