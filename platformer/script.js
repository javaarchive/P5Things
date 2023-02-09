import {Engine, Tileset} from "./engine.js";

const WIDTH = 1280;
const HEIGHT = 720;

/** @type {Engine} */
let engine = new Engine(WIDTH, HEIGHT);
let characterImg;
/** @type {Tileset} */
let tileset1;
let testTile;

function preload(){
    characterImg = engine.loadAssetImage("platformer/assets/default.png");
    engine.bg = engine.loadAssetImage("platformer/assets/cloudmap_bg.png");
    tileset1 = new Tileset(engine.loadAssetImage("platformer/assets/stringstar_fields/tileset.png"), 16, 16);
}

function setup(){
    new Canvas(WIDTH,HEIGHT);
    engine.createSimplePlayer(characterImg);
    testTile = tileset1.makeTileSprite(10,9,200,200);

    window.tileset1 = tileset1;
    window.testTile = testTile;

    engine.addPsuedoSprite(testTile);
}


function draw(){
    engine.drawBackground();
    engine.loop(deltaTime);

    if(kb.pressing("t")){
        if(tileset1) tileset1.debugTilemap();
    }
}

// Expose these to p5

window.preload = preload;
window.setup = setup;
window.draw = draw;

// Expose for console debug

window.engine = engine;