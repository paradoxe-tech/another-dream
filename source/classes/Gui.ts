import {
  AdvancedDynamicTexture,
  TextBlock,
  StackPanel,
  Control,
  Button,
  Rectangle,
  Image,
} from "babylonjs-gui";
import { Scene } from "babylonjs";
import { EventBus } from "./Bus";
import { Player } from "./Player";
import {
  Orientation,
  InputDirection,
  INPUT_DOWN,
  INPUT_UP,
  INPUT_LEFT,
  INPUT_RIGHT,
} from "@/shared/types";
import { COLORS } from "@/shared/colors";

const DEV_CONTROLS = false; // calmez-vous tout est là

const TEXT_FONT = "DreamyLand";

const FONTS_TO_LOAD = {
  KenneyInput:
    "url('/assets/fonts/KenneyInputKeyboardMouse.eot?#iefix') format('embedded-opentype'), \
        url('/assets/fonts/KenneyInputKeyboardMouse.woff2') format('woff2'), \
        url('/assets/fonts/KenneyInputKeyboardMouse.woff') format('woff'), \
        url('/assets/fonts/KenneyInputKeyboardMouse.ttf') format('truetype');",
  DreamyLand:
    "url('/assets/fonts/Dreamy-Land-Medium.eot'), \
        url('/assets/fonts/Dreamy-Land-Medium.woff2') format('woff2'), \
        url('/assets/fonts/Dreamy-Land-Medium.woff') format('woff'), \
        url('/assets/fonts/Dreamy-Land-Medium.ttf') format('truetype');",
};

export class Gui {
  private ui: AdvancedDynamicTexture;
  private creatorInstance: boolean;
  private defaultHiddenTextBlocks: { [key: string]: TextBlock } = {};
  private defaultHiddenButtons: { [key: string]: Button } = {};
  private arrows?: TextBlock;
  private levelCnt?: TextBlock;
  private discreteOrientation: Orientation;
  private arrowsChar: string;
  private arrowsCharAvailable = {
    neutral: "\uE02D",
    down: "\uE028",
    up: "\uE031",
    left: "\uE02C",
    right: "\uE02F",
  };
  private additionalRotationArray = [1, 0, 3, 2];
  private fontsLoaded: { [key: string]: boolean } = {};
  // DEBUG PURPOSES
  debugCtrl = [];

  constructor(
    scene: Scene,
    private bus: EventBus,
    creatorInstance: boolean,
  ) {
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    this.discreteOrientation = 3;
    this.arrowsChar = this.arrowsCharAvailable.neutral;
    this.creatorInstance = creatorInstance;
    this.createButtons();
    this.createArrow();
    if (!creatorInstance) this.createLevelCount();
    this.listen();
  }

  private async createButtons() {
    if (!this.fontsLoaded["KenneyInput"]) await this.loadFont("KenneyInput");
    if (!this.fontsLoaded[TEXT_FONT]) await this.loadFont(TEXT_FONT);

    const stack = new StackPanel();
    stack.width = "200px";
    stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.ui.addControl(stack);

    const makeButton = (
      label: string,
      event: string,
      kenneyKeyUnicode: string = "",
      hiddenByDefault: boolean = false,
      addToMainStack: boolean = true
    ) => {
      const btn = Button.CreateSimpleButton(label, "");
      const textContainer = new StackPanel(`${label}-sp`);
      //textContainer.isVertical = false;
      textContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      textContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

      // Create the first text block (font 1)
      let textBlock1 = undefined;
      let textBlock1Rect = undefined;
      if (kenneyKeyUnicode !== "") {
        textBlock1 = new TextBlock(`${label}-tb1`, kenneyKeyUnicode);
        textBlock1.fontFamily = "KenneyInput";
        textBlock1.fontSize = 80;
        textBlock1.color = "white";
        textBlock1.width = "120px";
        textBlock1.height = "43px";
        textBlock1.shadowColor = COLORS["Violet"];
        textBlock1.shadowOffsetX = 3;
        textBlock1.shadowOffsetY = 3;
        textBlock1.shadowBlur = 3;
        textBlock1.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        textBlock1.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        textBlock1Rect = new Rectangle();
        textBlock1Rect.width = "120px";
        textBlock1Rect.height = "40px";
        textBlock1Rect.thickness = 0;
        textBlock1Rect.clipChildren = true;
        textBlock1Rect.addControl(textBlock1);
      }

      // Create the second text block (font 2)
      const textBlock2 = new TextBlock(`${label}-tb2`, label);
      textBlock2.fontSize = 28;
      textBlock2.fontFamily = TEXT_FONT;
      textBlock2.color = "white";
      textBlock2.width = "180px";
      textBlock2.height = "30px";
      textBlock2.shadowColor = COLORS["Violet"];
      textBlock2.shadowOffsetX = 3;
      textBlock2.shadowOffsetY = 3;
      textBlock2.shadowBlur = 3;

      if (textBlock1Rect) textContainer.addControl(textBlock1Rect);
      textContainer.addControl(textBlock2);

      btn.addControl(textContainer);
      btn.width = "180px";
      btn.height = "100px";
      btn.color = "white";
      btn.background = "transparent";
      btn.thickness = 0;
      btn.onPointerEnterObservable.add(() => {
        if (textBlock1) textBlock1.color = COLORS["Light cyan"]; 
        textBlock2.color = COLORS["Light cyan"];
      });
      btn.onPointerOutObservable.add(() => {
        if (textBlock1) textBlock1.color = "white"; 
        textBlock2.color = "white";
      });
      btn.onPointerUpObservable.add(() => this.bus.emit(event));
      if (addToMainStack) {
        stack.addControl(btn);
      } else {
        this.ui.addControl(btn);
      }

      if (hiddenByDefault) {
        this.defaultHiddenButtons[event] = btn;
        this.defaultHiddenTextBlocks[event] = textBlock2;
        btn.isVisible = false;
      }

      // DEBUG
      this.debugCtrl.push(
        textBlock1 as never,
        textBlock1Rect as never,
        textBlock2 as never,
        textContainer as never,
        btn as never,
      );
    };

    makeButton("Restart", "restart", "\uE0B6", true);
    makeButton("Undo", "back", "\uE037");
    //makeButton("Recenter", "resetCam", "\uE047");
    if (!this.creatorInstance) {
      if (DEV_CONTROLS) {
        makeButton("Next", "nextlevel", "\uE097");
        makeButton("Previous", "previouslevel", "\uE0A4");
      }
      makeButton("Enter Dream", "changeLevelRequest", "\uE05F", true, false);
      this.defaultHiddenButtons["changeLevelRequest"].linkOffsetY = -185;
      makeButton("Wake Up ?", "exitLevel", "\uE093", true);
    }
  }

  private async loadFont(name: string) {
    const font = new FontFace(
      name,
      FONTS_TO_LOAD[name as keyof typeof FONTS_TO_LOAD],
    );
    await font.load();
    document.fonts.add(font);
    this.fontsLoaded[name] = true;
  }

  private async createLevelCount() {
    if (!this.fontsLoaded[TEXT_FONT]) await this.loadFont(TEXT_FONT);

    const panel = new Rectangle();
    panel.width = "450px";
    panel.height = "80px";
    panel.paddingTop = "30px";
    panel.paddingLeft = "30px";
    panel.thickness = 0;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

    this.levelCnt = new TextBlock("levelCnt", "0/21 DREAMS TRAVELLED");
    this.levelCnt.fontSize = 36;
    this.levelCnt.fontFamily = TEXT_FONT;
    this.levelCnt.color = COLORS["Light cyan"];
    this.levelCnt.alpha = 1;
    this.levelCnt.shadowColor = COLORS["Violet"];
    this.levelCnt.shadowOffsetX = 3;
    this.levelCnt.shadowOffsetY = 3;
    this.levelCnt.shadowBlur = 3;
    this.levelCnt.isVisible = false;
    this.levelCnt.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.addControl(this.levelCnt);

    this.ui.addControl(panel);
  }

  private async createArrow() {
    if (!this.fontsLoaded["KenneyInput"]) await this.loadFont("KenneyInput");
    if (!this.fontsLoaded[TEXT_FONT]) await this.loadFont(TEXT_FONT);

    const panel = new StackPanel();
    panel.width = "250px";
    panel.height = "250px";
    panel.paddingBottom = "30px";
    panel.paddingLeft = "30px";
    //panel.thickness = 0;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    this.arrows = new TextBlock("arrows", this.arrowsChar);
    this.arrows.fontSize = 225;
    this.arrows.fontFamily = "KenneyInput";
    this.arrows.color = COLORS["Light cyan"];
    this.arrows.alpha = 0.95;
    this.arrows.shadowColor = COLORS["Violet"];
    this.arrows.shadowOffsetX = 3;
    this.arrows.shadowOffsetY = 3;
    this.arrows.shadowBlur = 3;

    const makeButtonSpecial = (
      label: string,
      event: string,
      kenneyKeyUnicode: string = ""
    ) => {
      const btn = Button.CreateSimpleButton(label, "");
      const textContainer = new StackPanel(`${label}-sp`);
      textContainer.isVertical = false;
      textContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      textContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

      // Create the first text block (font 1)
      let textBlock1 = undefined;
      textBlock1 = new TextBlock(`${label}-tb1`, kenneyKeyUnicode);
      textBlock1.fontFamily = "KenneyInput";
      textBlock1.fontSize = 55;
      textBlock1.color = "white";
      textBlock1.width = "30px";
      textBlock1.height = "38px";
      textBlock1.paddingBottom = 2;
      textBlock1.shadowColor = COLORS["Violet"];
      textBlock1.shadowOffsetX = 3;
      textBlock1.shadowOffsetY = 3;
      textBlock1.shadowBlur = 3;

      // Create the second text block (font 2)
      const textBlock2 = new TextBlock(`${label}-tb2`, label);
      textBlock2.fontSize = 24;
      textBlock2.fontFamily = TEXT_FONT;
      textBlock2.color = "white";
      textBlock2.width = "90px";
      textBlock2.height = "30px";
      textBlock2.shadowColor = COLORS["Violet"];
      textBlock2.shadowOffsetX = 3;
      textBlock2.shadowOffsetY = 3;
      textBlock2.shadowBlur = 3;

      textContainer.addControl(textBlock1);
      textContainer.addControl(textBlock2);

      btn.addControl(textContainer);
      btn.width = "250px";
      btn.height = "100px";
      btn.color = "white";
      btn.background = "transparent";
      btn.thickness = 0;
      btn.onPointerEnterObservable.add(() => {
        if (textBlock1) textBlock1.color = COLORS["Light cyan"]; 
        textBlock2.color = COLORS["Light cyan"];
      });
      btn.onPointerOutObservable.add(() => {
        if (textBlock1) textBlock1.color = "white"; 
        textBlock2.color = "white";
      });
      btn.onPointerUpObservable.add(() => this.bus.emit(event));

      // DEBUG
      this.debugCtrl.push(
        textBlock1 as never,
        textBlock2 as never,
        textContainer as never,
        btn as never,
      );

      return btn;
    };
    panel.addControl(this.arrows);
    panel.addControl(makeButtonSpecial("Recenter", "resetCam", "\uE047"));

    this.ui.addControl(panel);
  }

  private switchArrows(char: string = this.arrowsCharAvailable.neutral) {
    this.arrowsChar = char;
    if (this.arrows) this.arrows.text = char;
  }

  private listen() {
    this.bus.on("rotated", (data: { orientation: Orientation }) => {
      //console.log("GUI helper : received quadrant from bus ", data.orientation);
      this.discreteOrientation = data.orientation;
    });

    this.bus.on("rotatedContinuous", (data: { restrictedAlpha: number }) => {
      if (this.arrows)
        this.arrows.rotation =
          data.restrictedAlpha +
          this.additionalRotationArray[this.discreteOrientation] *
            (Math.PI / 2);
    });

    this.bus.on("primitiveMove", (data: InputDirection) => {
      switch (data) {
        case INPUT_DOWN:
          this.switchArrows(this.arrowsCharAvailable.down);
          break;
        case INPUT_UP:
          this.switchArrows(this.arrowsCharAvailable.up);
          break;
        case INPUT_LEFT:
          this.switchArrows(this.arrowsCharAvailable.left);
          break;
        case INPUT_RIGHT:
          this.switchArrows(this.arrowsCharAvailable.right);
          break;
      }
    });

    this.bus.on("keyup", () => {
      this.switchArrows(this.arrowsCharAvailable.neutral);
    });

    // Everything related to level change (=> only in main game)
    if (!this.creatorInstance) {
      this.bus.on("levelCntVisible", () => {
          if (!this.levelCnt) return;
          this.levelCnt.isVisible = true;
      });
      
      this.bus.on("levelCntUpdate", (data: {levelCnt: number, totalLevelCnt: number}) => {
        if (!this.levelCnt) return;
        this.levelCnt.text = `${data.levelCnt}/${data.totalLevelCnt} dreams travelled`
      });

      this.bus.on("changeLevelPossible", (data: {level: number}) => {
        if (!this.defaultHiddenTextBlocks["changeLevelRequest"]) return;
        this.defaultHiddenTextBlocks["changeLevelRequest"].text = `FALL IN DREAM ${data.level}`;
        this.defaultHiddenButtons["changeLevelRequest"].isVisible = true;
      });
      this.bus.on("changeLevelNotPossible", () => {
        if (!this.defaultHiddenTextBlocks["changeLevelRequest"]) return;
        this.defaultHiddenButtons["changeLevelRequest"].isVisible = false;
      });
      this.bus.on("exitLevelPossible", () => {
        if (!this.defaultHiddenTextBlocks["exitLevel"] || !this.defaultHiddenButtons["restart"] || !this.levelCnt) return;
        this.defaultHiddenButtons["exitLevel"].isVisible = true;
        this.defaultHiddenButtons["restart"].isVisible = true;

        this.levelCnt.isVisible = false;
      });
      this.bus.on("exitLevelNotPossible", () => {
        if (!this.defaultHiddenTextBlocks["exitLevel"] || !this.defaultHiddenButtons["restart"] || !this.levelCnt) return;
        this.defaultHiddenButtons["exitLevel"].isVisible = false;
        this.defaultHiddenButtons["restart"].isVisible = false;
        this.levelCnt.isVisible = true;
      });
    }

    // for linked to mesh buttons
    this.bus.on("newPlayer", (data: {player: Player}) => {
      console.log("gui : new player handler received", console.log(data.player));
      if (data.player.mesh && this.defaultHiddenButtons["changeLevelRequest"]) this.defaultHiddenButtons["changeLevelRequest"].linkWithMesh(data.player.mesh);
    });
  }
}
