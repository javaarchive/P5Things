// How much extra backgroudn tiles to draw (may go offscreen but better too much than too less)
const OVERDRAW_BG = 4;

function rectangleIntersects(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2){
    return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

// Sprite but minimal for tiles. 
// Supports only rectangle bounding box. 

// These do what you think they do
const VELOCITY_SMOOTHING = 0.2;
const GRAVITY_MULTIPLIER = 0.2;
const JUMP_MULTIPLIER = 5; 
const JUMP_COOLDOWN = 500; // ms

class Tileset {

    // We assign unique IDs to each tilset for debugging purposes.
    static tilesetIDCounter = 0;
    tsID = 0;


    constructor(image, tileWidth, tileHeight){
        this.image = image;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        Tileset.tilesetCounter += 1;
        this.tsID = Tileset.tilesetCounter;
    }

    // Debugging function to show tile coordinates and draws the tilemap. 
    debugTilemap(){
        image(this.image,100,100);
        textSize(16);
        text("X: " + (mouseX - 100) + " Y: " + (mouseY - 100), 100, 100);
        text("TX: " + Math.floor((mouseX - 100) / this.tileWidth) + " TY: " + Math.floor((mouseY - 100) / this.tileHeight), 100, 120);
    }

    // Create a psuedo sprite from a tile
    makeTileSprite(tilex, tiley, offsetX, offsetY, scale = 1, targetSize = null){
        let ps = new PsuedoSprite(offsetX, offsetY);
        ps.image = this.image;
        ps.tileset = this;
        if(targetSize){
            // TODO: non-square tile support when?
            scale = targetSize / this.image.width;
        }
        ps.width = this.tileWidth * scale;
        ps.height = this.tileHeight * scale;
        ps.tx = tilex;
        ps.ty = tiley;
        ps.tileUpscale = scale;
        return ps;
    }

    // Draw a tile from the tileset
    drawTile(offsetX, offsetY, tx, ty, scale, tint = 0){
        // prevent smoothing from messing up the tileset pixel art
        noSmooth();
        image(this.image, offsetX, offsetY,
             this.tileWidth * scale, this.tileHeight * scale,
             tx * this.tileWidth, ty * this.tileHeight,
              this.tileWidth, this.tileHeight);
        if(tint){
            fill(0,100,0,tint);
            stroke("white");
            rect(offsetX, offsetY, offsetX + this.tileWidth * scale, offsetY + this.tileHeight * scale);
        }
        smooth();
    }
}

class PsuedoSprite {
    /**
     * Tileset if applicable. 
     * @type {Tileset}
     * @memberof PsuedoSprite
     */
    tileset = null;
    // Whether to upscale the tile (will be done without smoothing or ditherings)
    tileUpscale = 1;
    // Selected tile x,y
    tx = 0;
    ty = 0;
    // See constructor
    id = -1;

    constructor(x,y){
        this.x = x;
        this.y = y;
        this.width = 0;
        this.height = 0;
        this.image = null;
        // Each sprite gets a unique identifier to identify it apart from the others
        // It is used to idetnify psuedo sprites to delete
        this.id = Math.random().toString(); // so I made nanoid on a budget!
    }

    setSquare(wh){
        this.width = wh;
        this.height = wh;
    }
    
    // draw the sprite. Currently I only use the tile version. 
    draw(){
        if(this.image){
            if(this.tileset){
                // Delegate to tileset draw function. 
                this.tileset.drawTile(this.x,this.y,this.tx,this.ty, this.tileUpscale);
            }else{
                image(this.image, this.x, this.y, this.width, this.height);
            }
        }
    }

    // bounding box as two points
    getBoundingBox(){
        return [
            [this.x, this.y],
            [this.x + this.width, this.y + this.height]
        ];
    }

    serialize(){
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            // we don't serialize the image because it's part of the tileset, and we only support serilaizing tilesets rn
            tid: this.tileset.tsID,
            tx: this.tx,
            ty: this.ty,
            tileUpscale: this.tileUpscale,
            notSolid: this.notSolid ? true: false
        };
    }
}

class Engine {

    movementPerMs = 2;

    // screen width,height to be updated before init. 
    width = 640;
    height = 480;
    // target fps
    fps = 60;

    /**
     * The time in ms since the last frame. Usually taken directly from p5. 
     * @type {number}
     * @memberof Engine
     */
    delta = 0;

    /*constructor(width, height){
        console.log("Engine: Create");
        this.width = width;
        this.height = height;
        this.sprites = [];
        this.world = window.world;
    }*/

    // this does what you think it is 
    syncSettings(){
        frameRate(this.fps);
    }

    sync(){
        
    }

    setup(){
        console.log("Engine: Setup");
        this.syncSettings();
    }

    assets = [];
    fonts = [];
    engine_data = {};
    bg = null; // background to render if needed
    tile = true; // do we tile the background so it isn't stretched?
    offset = {
        x: 0,
        y: 0
    }
    sprites = [];
    /**
     * @type {PsuedoSprite[]}
     * @memberof Engine
     */
    psuedoSprites = [];
    debug = {};
    // Velcoity X and Y
    velocity = {
        x: 0,
        y: 0
    }


    // Controlled players. 
    player = null;
    ghostPlayer = null; 

    // Movement multipliers. 
    horziontalMovementMult = 0.3;
    verticalMovementMult = 1;

    // We keep the double jump state here
    doubleJumpCounter = 1;
    // "Explicit over Implicit" - Zen of Python
    doubleJumpEnabled = false;

    // Asset loader alias that keeps track of stuff it loads
    loadAssetImage(src, id = null){
        // Load assets
        let img = loadImage(src);
        this.assets.push(img);
        return img;
    }

    // TODO: Use this maybe later. 
    loadFont(src){
        // Load font
        this.fonts.push(loadFont(src));
    }

    // I forgot what I wanted to do here
    loadData(src, id){
        engine_data[loadJSON(src)];
    }

    applyOffsetToBB(bb){
        return [
            [bb[0][0] + this.offset.x, bb[0][1] + this.offset.y],
            [bb[1][0] + this.offset.x, bb[1][1] + this.offset.y]
        ]
    }

    /**
     * Add a psuedo sprite to the engine.
     *
     * @param {PsuedoSprite} sprite
     * @memberof Engine
     */
    addPsuedoSprite(sprite){
        console.log("add", sprite);
        this.psuedoSprites.push(sprite);
        return sprite;
    }

    removePsuedoSprite(sprite){
        this.psuedoSprites.splice(this.psuedoSprites.indexOf(sprite), 1);
    }

    get(id){
        // get from map
        // TODO: mb prototype pollution fix
        return engine_data[id];
    }

    // called at the start of a draw

    drawBackground(){
        // No background is set, so we skip
        if(!this.bg) return; 
        if(this.tile){
            for(let x = -(this.offset.x % this.bg.width) - this.bg.width * OVERDRAW_BG; x <= -(this.offset.x % this.bg.width) + this.width + this.bg.width * OVERDRAW_BG; x += this.bg.width){
                for(let y = -(this.offset.y % this.bg.height) - this.bg.height * OVERDRAW_BG; y <= -(this.offset.y % this.bg.height) + this.height + this.bg.height * OVERDRAW_BG; y += this.bg.height){
                    image(this.bg, x, y, this.bg.width, this.bg.height);
                }
            }
        }else{
            image(this.bg, 0, 0, this.width, this.height);
        }
    }

    setPlayer(player){
        this.player = player;
    }

    // See collision functiomn for what the ghostplayer is for
    createGhostPlayer(playerImage){
        this.ghostPlayer = new Sprite(this.width/2, this.height/2);
        this.ghostPlayer.image = playerImage;
        this.ghostPlayer.collider = "static";
        this.ghostPlayer.debug = false;
        this.ghostPlayer.visible = false;
    }

    getPlayerBoundingBox(){
        // TODO: account for sprite.scale if needed
        return [
            [
                this.offset.x - this.player.width/2,
                this.offset.y - this.player.height/2
            ],
            [
                this.offset.x + this.player.width/2,
                this.offset.y + this.player.height/2
            ]
        ];
    }

    // Create a simple player to be controlled based off an image. 
    createSimplePlayer(playerImage){
        let player = new Sprite(this.width/2, this.height/2);
        player.image = playerImage;
        player.collider = "static"; // player doesn't actually move
        this.setPlayer(player);
        // If we set a new player we also nuke the old ghost player. 
        if(this.ghostPlayer){
            this.ghostPlayer.remove();
        }
        this.createGhostPlayer(playerImage);
        this.sprites.push(player);
    }

    
    delta = 0;

    constructor(width, height){
        console.log("Engine: Create"); // so I know the engine started in console. 
        this.width = width;
        this.height = height;
        this.sprites = [];
        this.world = window.world;
    }

    syncSettings(){
        frameRate(this.fps);
    }

    sync(){
        
    }
        
    /**
     * Check if player can move in the vector.  
     *
     * @param {number[2]} vec
     * @return {boolean} 
     * @memberof Engine
     */
    checkCanMoveInVector(vec){
        if(!this.ghostPlayer) return true;
        // We have an unseen "ghost sprite" that moves to the future position and check for collisions with it. 
        this.ghostPlayer.x = this.player.x + vec[0];
        this.ghostPlayer.y = this.player.y + vec[1];
        let bb = this.getPlayerBoundingBox();
        bb[0][0] += vec[0];
        bb[0][1] += vec[1];
        bb[1][0] += vec[0];
        bb[1][1] += vec[1];
        let point1 = bb[0];
        let point2 = bb[1];
        this.debug["intersectsPS"] = false;
        // Loop through every psuedosprite and check for collision of their bounding boxes
        for(let psuedoSprite of this.psuedoSprites){
            let psbb = psuedoSprite.getBoundingBox();
            if(psuedoSprite.notSolid){ // a bit lazy so I'm doing an inverse boolean
                if(psuedoSprite.onCollide){
                    if(rectangleIntersects(...bb[0], ...bb[1], ...psbb[0], ...psbb[1])){
                        psuedoSprite.onCollide();
                    }
                }
                continue;
            }
            // Get the two bounding boxes and check for intersect
            if(rectangleIntersects(...bb[0], ...bb[1], ...psbb[0], ...psbb[1])){
                this.debug["intersectsPS"] = true;
                return false;
            }
        }
        // Loop through every p5 sprite and check for collision. 
        this.debug["intersectsSpr"] = false;
        for(let objSprite of this.sprites){
            if(objSprite.solid){
                if(this.ghostPlayer.colliding(objSprite)){
                    this.debug["intersectsSpr"] = true;
                    return false;
                }
            }
        }
        
        return true;
    }

    generateDebug(){
        this.debug["psCount"] = this.psuedoSprites.length;
        this.debug["player_bb"] = this.getPlayerBoundingBox();
        if(this.psuedoSprites[0]){
            this.debug["ps_bb"] = this.psuedoSprites[0].getBoundingBox();
        }else{
            if(this.debug["ps_bb"]){
                delete this.debug["ps_bb"];
            }
        }
    }

    runDebugControls(){
        this.generateDebug();
        if(kb.pressing("q")){
            fill("red");
            stroke("red");
            textSize(16);
            text("FPS: " + Math.round(frameRate()), 10,10);
            text("Offset: " + Math.floor(this.offset.x) + ", " + Math.floor(this.offset.y), 10, 30);
            this.ghostPlayer.visible = true;
            this.ghostPlayer.debug = true;
            let curDebugY = 50;
            let keys = Object.keys(this.debug);
            // Render debug text spaced apart apporiately. 
            for(let key of keys){
                text(key + ": " + this.debug[key], 10, curDebugY);
                curDebugY += 20;
            }
            // Draw bounding boxes if r is pressed
            let bb = this.getPlayerBoundingBox();
            /*let dbg = document.getElementById("debug-rect");
            dbg.style.backgroundColor = "cyan";
            dbg.style.left = bb[0][0] + "px";
            dbg.style.top = bb[0][1] + "px";
            dbg.style.minWidth = (bb[1][0] - bb[1][0]) + "px";
            dbg.style.width = (bb[1][0] - bb[0][0]) + "px";
            dbg.style.minHeight = (bb[1][1] - bb[0][1]) + "px";
            dbg.style.height = (bb[1][1] - bb[0][1]) + "px";*/
            if(kb.pressing("r")){
                rectMode(CORNERS);
                fill("red");
                console.log(...bb[0], ...bb[1]);
                rect(...bb[0], ...bb[1]);

                bb = this.psuedoSprites[0].getBoundingBox();
                fill("pink");
                rect(...bb[0], ...bb[1]);
            }
        }else {
            this.ghostPlayer.visible = false;
            this.ghostPlayer.debug = false;
        }
        if(kb.pressed("e")){
            this.tile = !this.tile;
        }
    }

    // Last in ms time. 
    lastJump = 0;

    runKeyboardControls(){
        // We use the time between frames so slower computers don't get a disadvantage. 
        let movementAmount = this.movementPerMs * deltaTime;
        // Calculate vector of movement based off keyboard controls and gravity
        let movementVector = [0,0];
        // If you can't move downwards then you are on the ground
        const onGround = !this.checkCanMoveInVector([0, this.player.height/16]);
        // Horizontal movement. 
        if(kb.pressing("left")){
            movementVector[0] -= movementAmount * this.horziontalMovementMult;
        }
        if(kb.pressing("right")){
            movementVector[0] += movementAmount * this.horziontalMovementMult;
        }
        this.debug["onGround"] = onGround;
        const triggerDoubleJump = (kb.pressed("up") || kb.pressed("space")) && performance.now() - this.lastJump < JUMP_COOLDOWN;
        if(kb.pressing("up") || kb.pressing("space") || triggerDoubleJump){
            // This does the jump logic
            this.lastJump = performance.now();
            // Require the player to be on the ground, so we check collision going bottom
            // We use velocity Y to have a very smooth jump with acceleration. 
            if(onGround){
                this.velocity.y -= movementAmount * this.verticalMovementMult * JUMP_MULTIPLIER;
            }else if(this.doubleJumpCounter > 0 && triggerDoubleJump){
                // else try to do a double jump but not if the player is holding the jump button
                this.velocity.y -= movementAmount * this.verticalMovementMult * JUMP_MULTIPLIER;
                this.doubleJumpCounter--;
            }
        }
        if(!onGround){
            // Gravity is done through a constant move vector thing
            movementVector[1] += deltaTime * GRAVITY_MULTIPLIER;
        }else{
            // Reset double jump counter if enabled
            if(this.doubleJumpEnabled){
                this.doubleJumpCounter = 1;
            }
        }
        if(kb.pressing("down")){
            movementVector[1] += movementAmount * this.verticalMovementMult;
        }
        if(movementVector[0] == movementVector[1] && movementVector[1] == 0) return;
        // wall check code, multiply vec by a scalar to check in advance
        if(this.checkCanMoveInVector(movementVector.map(v => v*1.2))){
            this.offset.x += movementVector[0];
            this.offset.y += movementVector[1];
        }else{
            // this.offset.x -= movementVector[0];
            // this.offset.y -= movementVector[1];
        }
    }

    runControls(){
        this.runDebugControls();
        this.runKeyboardControls();
        // TODO: Mouse controls. 
    }

    clear(){
        background("gray");
    }

    update(){
        // Apply velocity
        // So how this works is we "approach" the intended velocity through the smoothing value
        // Just pick up a math book and read what a limit is. 
        this.offset.x += this.velocity.x * VELOCITY_SMOOTHING;
        this.offset.y += this.velocity.y * VELOCITY_SMOOTHING;
        this.velocity.x *= (1 - VELOCITY_SMOOTHING);
        this.velocity.y *= (1 - VELOCITY_SMOOTHING);
    }

    getWorldCoords(x,y){
        // Undo our transform, to go from screen coords to where our "world" it is. so not relative to the player. 
        return [x + this.offset.x - this.width / 2, y + this.offset.y - this.height/2];
    }

    // Translate world coords to actual on screen controls
    beginWorldTranslation(){
        translate(this.width/2,this.height/2);
        translate(-this.offset.x, -this.offset.y);
    }

    endWorldTranslation(){
        translate(this.offset.x, this.offset.y);
        translate(-this.width/2,-this.height/2);
    }

    // To be called by actual loop. You want to pass the deltatime. 
    loop(deltaTime_ms){
        this.delta = deltaTime_ms;
        this.clear();
        this.drawBackground();
        this.sync();
        this.runControls();
        this.update();
        // Draw the psuedo sprites
        this.beginWorldTranslation();
        if(this.psuedoSpritedrawHook) this.psuedoSpritedrawHook(-1);
        for(let ps of this.psuedoSprites){
            ps.draw();
        }
        if(this.psuedoSpritedrawHook) this.psuedoSpritedrawHook(1);
        this.endWorldTranslation();
        // Draw the real sprites
        for(let sprite of this.sprites){
            sprite.draw();
        }
        // Draw the player (on top of everything)
        if(this.player){
            this.player.draw();
        }
    }

    // Initalization stuff
    init(){
        rectMode(CORNERS);
    }

}

export {Engine, PsuedoSprite, Tileset};