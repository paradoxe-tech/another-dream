import { CreatorGame } from "@/classes/CreatorGame";
import { World, Map4, State } from "@/shared/types";
import { up } from "@/shared/vectors";
import { deepCopy, padLevel } from "@/shared/utils"

//// CREATOR CONFIGURATION
// Size of a layer
const N_ROWS = 20;
const N_COLS = 20;
// Number of layers for each world
const N_LAYERS = 5;
// Local storage saving interval (seconds)
const SAVE_INTERVAL = 5000;
// History size
const MAX_UNDOS = 60;
// Tile to begin with when page loaded
const DEFAULT_TILE = State.Ground; 

// If saved, we recover stateArray
let stateArray: Map4;
// State histories (for undo/redo functions)
let undoStack: Map4[] = [];
let redoStack: Map4[] = [];
// Save state timeout
let lastSave = Date.now();
// Current tile
let selectedTile = DEFAULT_TILE;
// Current layer
let selectedLayer = [0, 0];
// Game state (for handling errors)
let gameRunning = true;
// Game instance
var game: CreatorGame;

// Main script (at load)
window.addEventListener("DOMContentLoaded", () => {
  updateMsg("Loading creator...");
  // Try to load browser save
  loadFromBrowser();
  // Create dynamic DOM elements
  createLayerList();
  createTileList();
  generateGrids();
  showLayer(selectedLayer[0], selectedLayer[1]); 
  // Create and setup game instance
  updateMsg("Creating game preview...");  
  game = new CreatorGame(stateArray);
  (window as any).game = game;
  setupGameListeners();
  // Setup buttons and file input
  setupEventListeners();
});


//// GAME INTERACTION FUNCTIONS

// Game setup (ran at page load + at each GameError thrown by the game in order to reset it)
function setupGameListeners() {
  gameRunning = true;
  updateMsg("Setting up new game...");

  game.bus.on("preloaded", () => {
    updateGame();
    game.engine.runRenderLoop(() => game.scene.render());
  });

  game.bus.on("restart", () => {
    game.playLevel(0);
    updateMsgWithCurrentWorld();
  });

  game.bus.on("loaded", () => {
    // Clear previous error message in creator
    let errorMsgDiv = document.getElementById("error-msg");
    if (errorMsgDiv) errorMsgDiv.innerHTML = "";
    
    if(game.player) {
      game.player.animateSpawn(
        game.level.getSpawnPoint(
          game.player.world
        ).add(up.scale(-0.5))
      );
    }
    updateMsgWithCurrentWorld();
  });

  game.bus.on("addMove", (obj) => {
    //console.log("On ajoute le move", obj.move, obj.tileState, obj.position, obj.world, obj.ref);
    game.level.addMove(obj.move, obj.tileState, obj.position, obj.world, obj.ref);
  })

  game.bus.on("back", () => {
    if (!game.player) return;
    if (game.player._queue != 0 || !game.player._canMove) return;
    game.level.backMove();
  })

  game.bus.on("backWorld", () => {
    game.backWorld();
  });

  game.bus.on("addQueue", ()=> {
    if (!game.player) return;
    game.player.queue = 1;
  });

  game.bus.on("removeQueue", ()=> {
    if (!game.player) return;
    game.player.queue = -1;
  });

  game.bus.on("resetCam", ()=> {
    game.resetCamera();
  });

  game.bus.on("path", ()=> {
    if (!game.player) return ;
    game.level.getPath(game.player) ;
  });

  game.bus.on("shake", () => {
    game.cameraShake();
  });

  game.bus.on("sound", (name: string) => {
    game.launchSound(name);
  });
  
  game.bus.on("nextlevel", () => {
    updateMsg("Level exited. Press Play to restart");
  });

  game.bus.on("switch", () => {
    game.switchWorld();
    updateMsgWithCurrentWorld();
  });

  game.bus.on("error", (data: { message: string }) => {
    let errorMsgDiv = document.getElementById("error-msg");
    if (errorMsgDiv) errorMsgDiv.innerHTML = "Error : " + data.message;

    updateMsg("Reloading game... Press Play to start a new game instance");
    gameRunning = false;
    //updateGame();
  });
}

// Update game instance if update button is clicked
function updateGame() {
  if (!gameRunning) {
    game = new CreatorGame(deepCopy(stateArray));
    setupGameListeners();
  } else {
    updateMsg("Updating game...");
    game.runFromMap(deepCopy(stateArray));
    updateMsgWithCurrentWorld();
  }
}


/// FUNCTIONS INVOLVING STATE ARRAY AND HISTORY

// Create empty array for storing all current states of tiles
function newStateArray(): Map4 {
  let arr = new Array(2)
    .fill(null)
    .map(() =>
      new Array(N_LAYERS)
        .fill(null)
        .map(() =>
          new Array(N_ROWS)
            .fill(null)
            .map(() => new Array(N_COLS).fill(State.Void)),
    ),
  );
  
  //// Default spawn point (dream world)
  // Dream, layer 2, x: 0, y: 0
  arr[0][1][0][0] = State.SpawnPoint;

  return arr;
}

// Save state to history (for undoing)
function saveState() {
  if (undoStack.length >= MAX_UNDOS) {
    undoStack.shift();
  }
  undoStack.push(deepCopy(stateArray));
  redoStack = [];
  console.log("State saved in history");
}

// Undo
function undo() {
  if (undoStack.length > 0) {
    if (redoStack.length >= MAX_UNDOS) {
      redoStack.shift();
    }
    redoStack.push(deepCopy(stateArray));
    let lastEl = undoStack.pop() || null;
    let gridCtr = document.getElementById("grid-ctr") || null;
    if (gridCtr) gridCtr.innerHTML = "";
    generateGrids();
    showLayer(selectedLayer[0], selectedLayer[1]);
  } else {
    console.log("Nothing to undo.");
  }
}

// Redo
function redo() {
  if (redoStack.length > 0) {
    if (undoStack.length >= MAX_UNDOS) {
      undoStack.shift();
    }
    undoStack.push(deepCopy(stateArray));
    let lastEl = redoStack.pop() || null;
    if (lastEl) stateArray = lastEl;
    let gridCtr = document.getElementById("grid-ctr") || null;
    if (gridCtr) gridCtr.innerHTML = "";
    generateGrids();
    showLayer(selectedLayer[0], selectedLayer[1]);
  } else {
    console.log("Nothing to redo.");
  }
}


/// FUNCTIONS INVOLVING FILE INTERACTIONS
// Trigger file input dialog (on click Load)
function selectFile() {
  let fileInput = document.getElementById("file-input") || null;
  if (fileInput) fileInput.click();
}

// Aux function to read level data from file
async function readLevelFromFileInput(file: File): Promise<Map4> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string) as Map4);
      } catch {
        reject(new Error("Invalid JSON"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}


// Read from user file, but don't update states
// until file is read. (on file select)
async function receiveFile(event: Event) {
  console.log("receive");
  const target = event.target as HTMLInputElement || null;
  let file: File | null = null;
  if (target) {
    let files = target.files || null;
    if (files) file = files[0] || null;
    console.log(file);
  }
  if (!file) {
    updateMsg("Please select a file.");
    return;
  }

  // wait til reader finished
  let tempArray: Map4 = [];
  await readLevelFromFileInput(file)
    .then(data => tempArray = data as Map4)
    .catch(err => {
      updateMsg(err)
        return;
    });

  if (tempArray && tempArray.length != 0) {
    if (tempArray?.[0]?.[0]?.[0]?.[0] === undefined) {
      updateMsg(
        `Error : JSON level must be the representation of a array that has a depth of 4 (worlds, layers, rows, columns). Level not loaded.`,
      );
      return;
    }

    let sure = confirm(
      "Do you really want to load this level and delete everything in the grid ?",
    );
    if (!sure) return;

    console.log("Loading this map :");
    console.log(tempArray);
    let paddedData: Map4 = [];
    try {
      paddedData = padLevel(tempArray);
      stateArray = paddedData;

      saveState();
      let gridCtr = document.getElementById("grid-ctr");
      if (gridCtr) gridCtr.innerHTML = "";
      generateGrids();
      saveInBrowser(true);
      showLayer(0, 0);
      updateGame();
    } catch (e) {
      updateMsg("Error : Cannot correctly pad import level to game dimensions.");
    }
  }
}

// Serialize state array into JSON (on clicking Save)
function storeLevel() {
  const jsonString = JSON.stringify(stateArray, null, 2);
  console.log("Downloading level");
  console.log(jsonString);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "level.json";
  a.click();
  URL.revokeObjectURL(url);
}


//// BROWSER SAVING & LOADING FUNCTIONS

// Save to local storage (by interval)
function saveInBrowser(forced: boolean = false) {
  const currTime = Date.now();
  if (forced || currTime - lastSave >= SAVE_INTERVAL) {
    localStorage.setItem("stateArray", JSON.stringify(stateArray));
    lastSave = currTime;
    console.log("State saved in browser");
  }
}

// Try to load from browser (at load)
function loadFromBrowser() {
  // Retrieve state array from browser save (if existing)
  let storedArray: string = localStorage.getItem("stateArray") || "";
  console.log(storedArray);
  if (storedArray && storedArray !== undefined && storedArray !== "") {
    stateArray = padLevel(JSON.parse(storedArray));
  } else {
    stateArray = newStateArray();
  }
}

// Reset level
function resetLevel() {
  let sure = confirm("Do you really want to reset all layers ?");
  if (!sure) return;
  saveState(); // For undo()
  stateArray = newStateArray();
  let gridCtr = document.getElementById("grid-ctr") || null;
  if (gridCtr) gridCtr.innerHTML = "";
  generateGrids();
  showLayer(0, 0);
  saveInBrowser(true); // forced = true
  updateGame();
}


//// FUNCTIONS HANDLING GRID INITIALIZATION

// Create layer list and switch between layers
function createLayerList() {
  // Aux function to not write same code for the two layers
function createLayerSubList(layerId: number, layerName: string) {
    let dreamCat = document.createElement("li");
    dreamCat.className = "layer-list-el";
    dreamCat.innerHTML = `${layerName} :`;
    if (layerList) layerList.appendChild(dreamCat);

    for (let i = 0; i < N_LAYERS; i++) {
      let layerEl = document.createElement("li");
      layerEl.className = "layer-list-el tabbed";
      layerEl.innerHTML = `Layer ${i + 1}`;
      layerEl.addEventListener("click", function () {
        selectedLayer[0] = layerId; // Dream (0) or nightmare (1)
        selectedLayer[1] = i;
        showLayer(selectedLayer[0], selectedLayer[1]);
        let items = document.querySelectorAll(".layer-list-el");
        items.forEach((i) => i.classList.remove("selected"));
        layerEl.classList.add("selected");
      });
      if (i == 0) layerEl.classList.add("selected");
      if (layerList) layerList.appendChild(layerEl);
    }
  }

  let layerList = document.getElementById("layerlist") || null;
  createLayerSubList(0, "DREAM");
  createLayerSubList(1, "NIGHTMARE");
}

// Create tile list
function createTileList() {
  let tileList = document.getElementById("tilelist") || null;

  let nmCat = document.createElement("li");
  nmCat.className = "tile-list-el";
  nmCat.innerHTML = "TILE TYPE :";
  if (tileList) tileList.appendChild(nmCat);

  for (const key of Object.keys(State)) {
    let tileEl = document.createElement("li");
    tileEl.className = "tile-list-el tabbed";
    tileEl.innerHTML = key;
    tileEl.addEventListener("click", function () {
      selectedTile = State[key as keyof typeof State];
      let items = document.querySelectorAll(".tile-list-el");
      items.forEach((i) => i.classList.remove("selected"));
      tileEl.classList.add("selected");
    });
    if (State[key as keyof typeof State] == DEFAULT_TILE) tileEl.classList.add("selected");
    if (tileList) 
      tileList.appendChild(tileEl);
  }
}

// Generate a generic grid with callbacks from left & right clicks
function clickableGrid(cat: number, rows: number, cols: number, layer: number, left_call: (el: HTMLTableCellElement, r: number, c: number, l: number, categ: number) => void, right_call: (el: HTMLTableCellElement, r: number, c: number, l: number, categ: number) => void) {
  let grid = document.createElement("table");
  grid.className = "grid";

  grid.setAttribute("n-layer", layer.toString());
  grid.setAttribute("cat", cat.toString());

  for (let r = 0; r < rows; ++r) {
    let tr = grid.appendChild(document.createElement("tr"));

    for (let c = 0; c < cols; ++c) {
      let cell = tr.appendChild(document.createElement("td"));
      // Update DOM tile state according to stateArray
      updateDOMCell(cell, stateArray[cat][layer][r][c]);

      (function (el, r, c, l, categ) {
        // Left click listener
        cell.addEventListener(
          "click",
          () => left_call(el, r, c, layer, categ),
          false,
        );
        // Right click listerner
        cell.addEventListener(
          "contextmenu",
          (ev) => {
            ev.preventDefault();
            right_call(el, r, c, layer, categ);
            return false;
          },
          false,
        );
      })(cell, r, c, layer, cat);
    }
  }
  return grid;
}

// Generate specific grids for each layer
function generateGrids() {
  for (let cat = 0; cat < 2; cat++) {
    for (let layer = 0; layer < N_LAYERS; layer++) {
      let grid = clickableGrid(
        cat, // Dream (0) or nightmare (1)
        N_ROWS,
        N_COLS,
        layer,
        // Left click callback
        function (el, row, col, layer, categ) {
          // Save in state history
          saveState();
          // Change cell to selected tile
          stateArray[categ][layer][row][col] = selectedTile;
          // Update tile state in DOM
          updateDOMCell(el, selectedTile);
          // Save in local storage
          saveInBrowser();
        },
        // Right click callback
        function (el, row, col, layer, categ) {
          saveState();
          // Change cell to VOID
          stateArray[categ][layer][row][col] = State.Void;
          updateDOMCell(el, State.Void);
          saveInBrowser();
        },
      );

      let gridCtr = document.getElementById("grid-ctr") || null;
      if (gridCtr) gridCtr.appendChild(grid);
    }
  }
}


//// DOM INTERACTION FUNCTIONS

// Setup event listeners
function setupEventListeners() {
  console.log("hello");
  // Add event listeners to all buttons
  document.getElementById("update-btn")?.addEventListener("click", updateGame);
  document.getElementById("savestate-btn")?.addEventListener("savestate-btn", function() {
    saveInBrowser(true);
  });
  document.getElementById("reset-btn")?.addEventListener("click", resetLevel);
  document.getElementById("store-btn")?.addEventListener("click", storeLevel);
  document.getElementById("undo-btn")?.addEventListener("click", undo);
  document.getElementById("redo-btn")?.addEventListener("click", redo);
  // DEBUG
  document.getElementById("log-btn").addEventListener("click", logMap);

  // File loading
  let fileInput = document.getElementById("file-input");
  if (fileInput) fileInput.addEventListener("change", receiveFile);
  document.getElementById("load-btn")?.addEventListener("click", selectFile);
}

// Update DOM cell with new state
function updateDOMCell(el: HTMLTableCellElement, state: State) {
  el.className = Object.keys(State).find((key) => State[key as keyof typeof State] === state) || "";
  switch (state) {
    case State.SpawnPoint:
      el.innerHTML = '<img src="/creator/images/player.png">';
      break;
    case State.Rock:
      el.innerHTML = '<img src="/creator/images/rock.png">';
      break;
    case State.Box:
      el.innerHTML = '<img src="/creator/images/box.png">';
      break;
    default:
      el.innerHTML = "";
  }
}

// Show the selected layer's grid
function showLayer(layerCat: number, layerIndex: number) {
  // Hide all layers
  let grids = Array.from(document.querySelectorAll(".grid")).map(
    (grid_el: Element) => grid_el as HTMLElement
  );

  grids.forEach((grid: HTMLElement) => grid.style.display = "none");

  // Show the selected layer's grid
  let grid = document.querySelector(
    `.grid[n-layer="${layerIndex}"][cat="${layerCat}"]`,
  ) as HTMLElement;

  if (grid) grid.style.display = "table";
}

// Update generic msg div (#world-msg) in DOM
function updateMsg(msg: string) {
  let currWorldDiv = document.getElementById("world-msg");
  if (currWorldDiv) currWorldDiv.innerHTML = msg;
}

// Update #world-msg with current world name
function updateMsgWithCurrentWorld() {
  if (game.player) {
    const currentWorld = game.player.world == World.Dream ? "DREAM" : "NIGHTMARE";
    updateMsg("Current world : " + currentWorld);
  }
}


// DEBUG
function logMap() {
  console.log(JSON.stringify(stateArray));
}