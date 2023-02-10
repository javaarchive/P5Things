import {Engine, Tileset} from "./engine.js";

const WIDTH = 1280;
const HEIGHT = 720;

/** @type {Engine} */
let engine = new Engine(WIDTH, HEIGHT);
let characterImg;
/** @type {Tileset} */
let tileset1;
let testTile;

// Current selected tile by x and y
let selectedTX = 0;
let selectedTY = 0;

const TILE_MULTIPLIER = 5;

function preload(){
    characterImg = engine.loadAssetImage("platformer/assets/default.png");
    engine.bg = engine.loadAssetImage("platformer/assets/cloudmap_bg.png");
    tileset1 = new Tileset(engine.loadAssetImage("platformer/assets/stringstar_fields/tileset.png"), 16, 16);
}

function setup(){
    new Canvas(WIDTH,HEIGHT);
    engine.createSimplePlayer(characterImg);
    testTile = tileset1.makeTileSprite(10,9,0,16*5*2,TILE_MULTIPLIER);

    window.tileset1 = tileset1;
    window.testTile = testTile;

    engine.doubleJumpEnabled = true;

    // engine.addPsuedoSprite(testTile);

    engine.init();
}

let nums = [0,1,2,3,4,5,6,7,8,9];

function draw(){
    engine.drawBackground();
    engine.loop(deltaTime);

    if(kb.pressing("t")){
        if(tileset1) tileset1.debugTilemap();
    }

    if(engine.offset.y >= 1000){
        engine.offset.x = 0;
        engine.offset.y = 0;
    }

    let tileScreenSize = tileset1.tileWidth * TILE_MULTIPLIER;

    // Editor
    if(kb.pressing("shift")){
        let [worldX, worldY] = engine.getWorldCoords(mouse.x, mouse.y);
        let nearestTileX = Math.floor(worldX / tileScreenSize) * tileScreenSize;
        let nearestTileY = Math.floor(worldY / tileScreenSize) * tileScreenSize;
        engine.debug["mouseTileCoords"] = [nearestTileX, nearestTileY];
        engine.beginWorldTranslation();
        tileset1.drawTile(nearestTileX, nearestTileY, selectedTX, selectedTY, TILE_MULTIPLIER, 50);
        engine.endWorldTranslation();
        if(mouse.pressed()){
            if(engine.psuedoSprites.filter(ps => ps.x == nearestTileX && ps.y == nearestTileY).length == 0){
                console.log("Pusedo sprite added");
                engine.addPsuedoSprite(tileset1.makeTileSprite(selectedTX, selectedTY,nearestTileX, nearestTileY, TILE_MULTIPLIER));
            }
        }else if(mouse.pressed("right")){ // I had to look at p5play's internal implementation to figure this out
            let psMatches = engine.psuedoSprites.filter(ps => ps.x == nearestTileX && ps.y == nearestTileY);
            psMatches.forEach((ps) => {
                engine.removePsuedoSprite(ps);
            });
            if(psMatches.length == 0){
                console.log("No psuedo sprites found");
            }
        }
    }
    if(kb.pressing("z")){
        nums.forEach((n) => {
            if(kb.pressing(n.toString())){
                selectedTX = n;
                console.log("Swapped tx")
            }
        });
    }
    if(kb.pressing("x")){
        nums.forEach((n) => {
            if(kb.pressing(n.toString())){
                selectedTY = n;
                console.log("Swapped ty")
            }
        });
    }
    if(kb.pressing("control")){
        tileset1.debugTilemap();
        if(mouse.pressed()){
            selectedTX = Math.floor((mouse.x - 100) / tileset1.tileWidth);
            selectedTY = Math.floor((mouse.y - 100) / tileset1.tileHeight);
        }
    }
}

// Expose these to p5

window.preload = preload;
window.setup = setup;
window.draw = draw;

// Expose for console debug

window.engine = engine;