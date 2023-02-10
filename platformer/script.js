import {Engine, Tileset} from "./engine.js";

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

/** @type {Engine} */
let engine = new Engine(WIDTH, HEIGHT);
let characterImg;
/** @type {Tileset} */
let tileset1;
let testTile;

// Current selected tile by x and y
let selectedTX = 0;
let selectedTY = 0;

let backgrounds = [];

const TILE_MULTIPLIER = 5;

function preload(){
    characterImg = engine.loadAssetImage("platformer/assets/MiniKingManSingleLarge.png");
    backgrounds = [
        engine.loadAssetImage("platformer/assets/Puffy_Sky-Sunset_01-1024x512.png"),
        engine.loadAssetImage("platformer/assets/skypack_1/2.png"),
        engine.loadAssetImage("platformer/assets/skypack_1/3.png"),
        engine.loadAssetImage("platformer/assets/skypack_1/4.png"),
        engine.loadAssetImage("platformer/assets/skypack_1/5.png"),
        engine.loadAssetImage("platformer/assets/skypack_1/6.png"),
        engine.loadAssetImage("platformer/assets/skypack_1/mountain.png"),
        engine.loadAssetImage("platformer/assets/skypack_1/Puffy_Sky-Blue_01-1024x512.png")
    ];
    engine.bg = backgrounds[0];
    tileset1 = new Tileset(engine.loadAssetImage("platformer/assets/tilemapedit.png"), 16, 16);
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
    
    // Deserialize level
    let levelDataJson = document.getElementById("level-data").innerText;
    let levelData = JSON.parse(levelDataJson);
    for(let psuedoSpriteSerialized of levelData.psuedoSprites){
        let psuedoSprite = tileset1.makeTileSprite(psuedoSpriteSerialized.tx, psuedoSpriteSerialized.ty, psuedoSpriteSerialized.x, psuedoSpriteSerialized.y, TILE_MULTIPLIER);
        psuedoSprite.notSolid = psuedoSpriteSerialized.notSolid;
        if(psuedoSprite.notSolid){
            // Hack: all not solids are coins
            makeCoin(psuedoSprite);
        }
        engine.addPsuedoSprite(psuedoSprite);
    }
    engine.psuedoSpritedrawHook = (phase) => {
        if(kb.pressing("l")){
            if(phase == -1) scale(0.25);
            if(phase == 1) scale(4)
        }
    }
}

let nums = [0,1,2,3,4,5,6,7,8,9];
let coins = 0;

function makeCoin(tSprite){
    tSprite.notSolid = true;
    tSprite.onCollide = function(){
        coins ++;
        console.log(engine.psuedoSprites.map(ps => ps.id));
        engine.psuedoSprites = engine.psuedoSprites.filter(ps => ps.id != tSprite.id);
    }
}

function tickDynamicBg(){
    if(engine.offset.x < -100){
        engine.bg = backgrounds[0];
    }else if(engine.offset.x < 2000){
        engine.bg = backgrounds[7];
    }
}

function draw(){
    engine.drawBackground();
    engine.loop(deltaTime);

    if(kb.pressing("t")){
        if(tileset1) tileset1.debugTilemap();
    }

    if(engine.offset.y >= 1000 || (kb.pressed("r") && kb.pressing("q"))){
        // Respawn Player because they are falling infinitely or they need force reset
        engine.offset.x = 0;
        engine.offset.y = 0;
    }

    let tileScreenSize = tileset1.tileWidth * TILE_MULTIPLIER;

    // Editor
    if(kb.pressing("shift")){
        textSize(16);
        fill("blue");
        stroke("blue");
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
                let tSprite = tileset1.makeTileSprite(selectedTX, selectedTY,nearestTileX, nearestTileY, TILE_MULTIPLIER);
                if(selectedTX == 0 && selectedTY == 11){
                    console.log("Added coin");
                    makeCoin(tSprite);
                }
                engine.addPsuedoSprite(tSprite);
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
    if(kb.pressed("o")){
        // Copy level data to your clipboard. 
        console.log("Exporting level please wait...");
        let levelData = {
            psuedoSprites: engine.psuedoSprites.map((ps) => {
                return ps.serialize();
            })
        }
        navigator.clipboard.writeText(JSON.stringify(levelData)).then(() => {
            alert("Level data copied to clipboard");
        }).catch(console.warn);
    }
    textSize(32)
    fill("blue");
    stroke("blue");

    tickDynamicBg();
    // The coins text covers my "level editor"
    if(!kb.pressing("shift") && !kb.pressing("t")) text(`Coins ${coins}`, 100, 100);
}

// Expose these to p5

window.preload = preload;
window.setup = setup;
window.draw = draw;

// Expose for console debug

window.engine = engine;