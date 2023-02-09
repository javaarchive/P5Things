// How much extra backgroudn tiles to draw (may go offscreen)
const OVERDRAW_BG = 4;

function rectangleIntersects(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2){
    return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

// Sprite but minimal for tiles. 
// Supports only rectangle bounding box. 

class Tileset {
    constructor(image, tileWidth, tileHeight){
        this.image = image;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
    }

    debugTilemap(){
        image(this.image,100,100);
        text("X: " + (mouseX - 100) + " Y: " + (mouseY - 100), 100, 100);
    }

    makeTileSprite(tilex, tiley, offsetX, offsetY){
        let ps = new PsuedoSprite(offsetX, offsetY);
        ps.image = this.image;
        ps.tileset = this;
        ps.width = this.tileWidth;
        ps.height = this.tileHeight;
        ps.tx = tilex;
        ps.ty = tiley;
        return ps;
    }

    drawTile(offsetX, offsetY, tx, ty, scale){
        // prevent smoothing from messing up the tileset pixel art
        noSmooth();
        image(this.image, offsetX, offsetY,
             this.tileWidth * scale, this.tileHeight * scale,
             tx * this.tileWidth, ty * this.tileHeight,
              this.tileWidth, this.tileHeight);
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
    // Selected tile x,y
    tx = 0;
    ty = 0;

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
                this.tileset.drawTile(this.x,this.y,this.tx,this.ty, 4);
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

    movementPerMs = 0.5;

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

    player = null;
    ghostPlayer = null; 

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
                this.player.x - this.player.width/2,
                this.player.y - this.player.height/2
            ],
            [
                this.player.x + this.player.width/2,
                this.player.y + this.player.height/2
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
        let bb = this.getPlayerBoundingBox;
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
        this.debug["psCount"] = this.psuedoSprites.length
    }

    runDebugControls(){
        this.generateDebug();
        if(kb.pressing("q")){
            text("FPS: " + Math.round(frameRate()), 10,10);
            text("Offset: " + this.offset.x + ", " + this.offset.y, 10, 30);
            this.ghostPlayer.visible = true;
            this.ghostPlayer.debug = true;
            let curDebugY = 50;
            let keys = Object.keys(this.debug);
            for(let key of keys){
                text(key + ": " + this.debug[key], 10, curDebugY);
                curDebugY += 20;
            }
        }else {
            this.ghostPlayer.visible = false;
            this.ghostPlayer.debug = false;
        }
        if(kb.pressed("e")){
            this.tile = !this.tile;
        }
    }

    runKeyboardControls(){
        let movementAmount = this.movementPerMs * deltaTime;
        let movementVector = [0,0];
        if(kb.pressing("left")){
            movementVector[0] -= movementAmount;
        }
        if(kb.pressing("right")){
            movementVector[0] += movementAmount;
        }
        if(kb.pressing("up")){
            movementVector[1] -= movementAmount;
        }
        if(kb.pressing("down")){
            movementVector[1] += movementAmount;
        }
        if(this.checkCanMoveInVector(movementVector)){
            this.offset.x += movementVector[0];
            this.offset.y += movementVector[1];
        }
    }

    runControls(){
        this.runDebugControls();
        this.runKeyboardControls();
    }

    clear(){
        background("gray");
    }

    loop(deltaTime_ms){
        this.delta = deltaTime_ms;
        this.clear();
        this.drawBackground();
        this.sync();
        this.runControls();
        // Draw the psuedo sprites
        translate(this.offset.x, this.offset.y);
        for(let ps of this.psuedoSprites){
            ps.draw();
        }
        translate(-this.offset.x, -this.offset.y);
        // Draw the real sprites
        for(let sprite of this.sprites){
            sprite.draw();
        }
        // Draw the player (on top of everything)
        if(this.player){
            this.player.draw();
        }
    }


}

export {Engine, PsuedoSprite, Tileset};