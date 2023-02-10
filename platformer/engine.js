// How much extra backgroudn tiles to draw (may go offscreen)
const OVERDRAW_BG = 4;

function rectangleIntersects(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2){
    return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

// Sprite but minimal for tiles. 
// Supports only rectangle bounding box. 

const VELOCITY_SMOOTHING = 0.2;
const GRAVITY_MULTIPLIER = 0.2;
const JUMP_MULTIPLIER = 5;
const JUMP_COOLDOWN = 500;

class Tileset {
    constructor(image, tileWidth, tileHeight){
        this.image = image;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
    }

    debugTilemap(){
        image(this.image,100,100);
        text("X: " + (mouseX - 100) + " Y: " + (mouseY - 100), 100, 100);
        text("TX: " + Math.floor((mouseX - 100) / this.tileWidth) + " TY: " + Math.floor((mouseY - 100) / this.tileHeight), 100, 120);
    }

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
    tileUpscale = 1;
    // Selected tile x,y
    tx = 0;
    ty = 0;

    /**
     * Double jump enabled.
     * @type {boolean}
     * @memberof PsuedoSprite
     */
    doubleJumpEnabled = false;
    doubleJumpCounter = 0;

    constructor(x,y){
        this.x = x;
        this.y = y;
        this.width = 0;
        this.height = 0;
        this.image = null;
    }

    setSquare(wh){
        this.width = wh;
        this.height = wh;
    }
    
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

    getBoundingBox(){
        return [
            [this.x, this.y],
            [this.x + this.width, this.y + this.height]
        ];
    }
}

class Engine {

    movementPerMs = 2;

    width = 640;
    height = 480;
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
    bg = null;
    tile = true;
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
    velocity = {
        x: 0,
        y: 0
    }

    player = null;
    ghostPlayer = null; 

    horziontalMovementMult = 0.3;
    verticalMovementMult = 1;

    loadAssetImage(src, id = null){
        // Load assets
        let img = loadImage(src);
        this.assets.push(img);
        return img;
    }

    loadFont(src){
        // Load font
        this.fonts.push(loadFont(src));
    }

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
        console.log("Engine: Create");
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
        for(let psuedoSprites of this.psuedoSprites){
            let psbb = psuedoSprites.getBoundingBox();
            // Get the two bounding boxes and check for intersect
            if(rectangleIntersects(...bb[0], ...bb[1], ...psbb[0], ...psbb[1])){
                this.debug["intersectsPS"] = true;
                return false;
            }
        }
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
            text("FPS: " + Math.round(frameRate()), 10,10);
            text("Offset: " + Math.floor(this.offset.x) + ", " + Math.floor(this.offset.y), 10, 30);
            this.ghostPlayer.visible = true;
            this.ghostPlayer.debug = true;
            let curDebugY = 50;
            let keys = Object.keys(this.debug);
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

    lastJump = 0;

    runKeyboardControls(){
        let movementAmount = this.movementPerMs * deltaTime;
        let movementVector = [0,0];
        // If you can't move downwards then you are on the ground
        const onGround = !this.checkCanMoveInVector([0, this.player.height/16]);
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
            if(onGround){
                this.velocity.y -= movementAmount * this.verticalMovementMult * JUMP_MULTIPLIER;
            }else if(this.doubleJumpCounter > 0 && triggerDoubleJump){
                // else try to do a double jump but not if the player is holding the jump button
                this.velocity.y -= movementAmount * this.verticalMovementMult * JUMP_MULTIPLIER;
                this.doubleJumpCounter--;
            }
        }
        if(!onGround){
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
    }

    clear(){
        background("gray");
    }

    update(){
        // Apply velocity
        this.offset.x += this.velocity.x * VELOCITY_SMOOTHING;
        this.offset.y += this.velocity.y * VELOCITY_SMOOTHING;
        this.velocity.x *= (1 - VELOCITY_SMOOTHING);
        this.velocity.y *= (1 - VELOCITY_SMOOTHING);
    }

    getWorldCoords(x,y){
        // Undo our transform, to go from screen coords to where our "world" it is. so not relative to the player. 
        return [x + this.offset.x - this.width / 2, y + this.offset.y - this.height/2];
    }

    beginWorldTranslation(){
        translate(this.width/2,this.height/2);
        translate(-this.offset.x, -this.offset.y);
    }

    endWorldTranslation(){
        translate(this.offset.x, this.offset.y);
        translate(-this.width/2,-this.height/2);
    }

    loop(deltaTime_ms){
        this.delta = deltaTime_ms;
        this.clear();
        this.drawBackground();
        this.sync();
        this.runControls();
        this.update();
        // Draw the psuedo sprites
        this.beginWorldTranslation();
        for(let ps of this.psuedoSprites){
            ps.draw();
        }
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

    init(){
        rectMode(CORNERS);
    }

}

export {Engine, PsuedoSprite, Tileset};