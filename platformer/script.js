import {Engine, Tileset} from "./engine.js";

const WIDTH = 1280;
const HEIGHT = 720;

/** @type {Engine} */
let engine = new Engine(WIDTH, HEIGHT);
let characterImg;
/** @type {Tileset} */
let tileset1;
let testTile;

const TILE_MULTIPLIER = 2;

function preload(){
    characterImg = engine.loadAssetImage("platformer/assets/default.png");
    engine.bg = engine.loadAssetImage("platformer/assets/cloudmap_bg.png");
    tileset1 = new Tileset(engine.loadAssetImage("platformer/assets/stringstar_fields/tileset.png"), 16, 16);
}

function setup(){
    new Canvas(WIDTH,HEIGHT);
    engine.createSimplePlayer(characterImg);
    testTile = tileset1.makeTileSprite(10,9,0,200,5);

    window.tileset1 = tileset1;
    window.testTile = testTile;

    engine.addPsuedoSprite(testTile);

    engine.init();
}


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
}

// Expose these to p5

window.preload = preload;
window.setup = setup;
window.draw = draw;

// Expose for console debug

window.engine = engine;