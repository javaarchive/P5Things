const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

let canvas;

let setupDone = false;

let balls = [];
let turnables = [];

const FPS = 60;

let ballDefaultRadius = 10;
let ballDefaultRadiusAccessor;

let gravityAccessor;

let spawnCount = 1;
let spawnCountAccessor;

let IO = null;

const TOOLS = {
    SPAWNER: 1,
    LINE: 2,
    SELECT: 3,
    TURNABLE_SPAWNER: 4
}

let currentTool = TOOLS.SPAWNER;
let currentToolAccessor = (_ = currentTool) => currentTool = _;

let rotationSpeed = 3;
let rotationSpeedAccessor = (_ = rotationSpeed) => rotationSpeed = _;

let defaultTurnableWidth = 80;
let defaultTurnableHeight = 16;

let defaultTurnableWidthAccessor = (_ = defaultTurnableWidth) => defaultTurnableWidth = _;
let defaultTurnableHeightAccessor = (_ = defaultTurnableHeight) => defaultTurnableHeight = _;

let offsetXAccessor, offsetYAccessor;

async function setup(){
    new Canvas(WIDTH,HEIGHT);
    await ImGui.default();
    canvas = document.getElementsByTagName("canvas")[0];
    // canvas.style.width = "100%";
    // canvas.style.height = "auto";
    console.log("Canvas",canvas);
    ImGui.CreateContext();
    ImGui.StyleColorsDark();
    ImGui_Impl.Init(canvas);
    IO = ImGui.GetIO();
    setupDone = true;
    // Init physics
    world.gravity.y = 10;

    gravityAccessor = (_ = world.gravity.y) => world.gravity.y = _;
    offsetXAccessor = (_ = world.offset.x) => world.offset.x = _;
    offsetYAccessor = (_ = world.offset.y) => world.offset.y = _;

    spawnCountAccessor = (_ = spawnCount) => spawnCount = _;
    ballDefaultRadiusAccessor = (_ = ballDefaultRadius) => ballDefaultRadius = _;
    
    frameRate(FPS);

    let usp = new URLSearchParams(location.search);
    if(usp.get("default_level")){
        loadJson(JSON.parse(document.getElementById("level-json").textContent));
    }
}

let level = {
    lines: [],
    turnables: [],
    extras: {}
};
let lineSprites = [];
let placingLine = [];
let trashedLines = [];
let trashedTurnables = [];

function shutdown() {
    ImGui_Impl.Shutdown();
    ImGui.DestroyContext();
}

function gc(){
    framesSinceLastGc = 0;
    // bnadish code but works
    try{
        for(let i = 0; i < balls.length; i++){
            if(balls[i].x > WIDTH + 100 || balls[i].x < -100){
                balls[i].remove();
                balls.splice(i,1);
                i--;
            }
            if(balls[i].y > HEIGHT + 100 || balls[i].y < -100){
                balls[i].remove();
                balls.splice(i,1);
                i--;
            }
            
        }
    }catch(ex){
        // yea there's a bug but I'm not dealing with it
        return;
    }
}

function nukeAll(){
    for(let i = 0; i < balls.length; i++){
        balls[i].remove();
    }
    balls = [];
}

let lastFrame = performance.now();
let framesSinceLastGc = 0;
let framesSinceLastAutoSpawn = 0;

function createBall(){
    let ball = new Sprite();
    ball.radius = ballDefaultRadius;
    ball.collider = "dynamic";

    balls.push(ball);

    return ball;
}

function getHoveringBalls(){
    return balls.filter(ball => dist(mouse.x, mouse.y, ball.x, ball.y) <= ball.radius);
}

function undo(){
    if(currentTool == TOOLS.LINE){
        if(level.lines.length == 0) return;
        trashedLines.push(level.lines.pop());
        lineSprites.pop().remove();
    }else if(currentTool == TOOLS.TURNABLE_SPAWNER){
        if(level.turnables.length == 0) return;
        trashedTurnables.push(level.turnables.pop());
        turnables.pop().remove();
    }
}

function redo(){
    if(currentTool == TOOLS.LINE){
        if(trashedLines.length == 0) return
        let line = trashedLines.pop();
        let lineSprite = new Sprite(line);
        lineSprite.collider = "static";
        lineSprite.color = "white";
        level.lines.push(line);
        lineSprites.push();
    }else if(currentTool == TOOLS.TURNABLE_SPAWNER){
        if(trashedTurnables.length == 0) return;
        let turnable = trashedTurnables.pop();
        let turnableSprite = deserializeTurnable(turnable);
        level.turnables.push(turnable);
        turnables.push(turnableSprite); 
        syncRotations();
    }
        
}

// TODO: func to build sprite from serialized version

function syncRotations(){
    turnables.forEach((sprite) => {
        sprite.rotation = 0;
        sprite.rotationSpeed = rotationSpeed;
    });
}

function deserializeTurnable(obj){
    let turnableSprite = new Sprite(obj.x,obj.y);
    turnableSprite.width = obj.width;
    turnableSprite.height = obj.height;
    // allows sprite to autorotate but not fall due to gravity
    turnableSprite.collider = "kinematic";
    turnableSprite.rotationSpeed = obj.speed;

    return turnableSprite;
}

function createTurnable(x = mouse.x, y = mouse.y, width = defaultTurnableWidth, height = defaultTurnableHeight, speed = 4){
    let turnable = {
        x,y,width,height,speed
    };

    let turnableSprite = deserializeTurnable(turnable);
    
    turnables.push(turnableSprite);
    level.turnables.push(turnable);

    syncRotations();

    return [turnableSprite, turnable];
}

function deserializeLine(points){
    let lineSprite = new Sprite(points);
    lineSprite.collider = "static";
    lineSprite.color = "white";
    return lineSprite;
}

function createLine(line){
    let lineSprite = deserializeLine(line);
    level.lines.push(line);
    lineSprites.push(lineSprite);
    return lineSprite;
}

function loadJson(newLevel){
    balls.forEach((ball) => ball.remove());
    balls = [];
    turnables = [];
    lineSprites = [];
    level.lines = newLevel.lines;
    level.turnables = newLevel.turnables;
    level.lines.forEach((line) => {
        createLine(line);
    });
    level.turnables.forEach((turnable) => {
        let turnableSprite = deserializeTurnable(turnable);
        turnables.push(turnableSprite);
    })
    if(newLevel.extras){
        level.extras = newLevel.extras;
    }else{
        level.extras = {};
    }
}

function draw(){
    if(!setupDone) return;
    const frameDelta = deltaTime; performance.now() - lastFrame;
    lastFrame = performance.now();

    background("#2c2f33");
    
    textSize(24);
    stroke("black");
    fill("white");
    text("FPS: " + Math.floor(frameRate()), 50, 50);
    if(framesSinceLastGc > FPS * 1){ // 1 second
        gc();
    }else{
        framesSinceLastGc ++;
    }
    if(level.extras.autospawn){
        framesSinceLastAutoSpawn ++;
        if(framesSinceLastAutoSpawn > FPS * (level.extras.autospawn.interval || 1)){
            // Every 2 seconds we may spawn a ball if the level asks
            let ball = createBall();
            ball.x = level.extras.autospawn.x;
            ball.y = level.extras.autospawn.y;
            framesSinceLastAutoSpawn = 0;
        }
    }
    drawSprites();

    ImGui_Impl.NewFrame(frameDelta);
    ImGui.NewFrame();

    ImGui.Begin("Debugging");
    if(ImGui.TreeNode("Ball Control")){
        if(ImGui.Button("Spawn Ball (randomly)")){
            for(let i = 0; i < spawnCount; i++){
            
                let ball = createBall();

                ball.x = random(0,WIDTH);
                ball.y = random(0,HEIGHT);
            }
        }
        if(ImGui.Button("Remove unneeded balls")){
            gc();
        }
        ImGui.SameLine();
        if(ImGui.Button("Nuke all balls")){
            nukeAll();
        }
        ImGui.TreePop();
    }

    // Tool Selection
    ImGui.RadioButton("Spawn Balls",currentToolAccessor,TOOLS.SPAWNER);
    ImGui.RadioButton("Line",currentToolAccessor,TOOLS.LINE);
    ImGui.RadioButton("Select",currentToolAccessor,TOOLS.SELECT);
    ImGui.RadioButton("Spawn Turnables",currentToolAccessor,TOOLS.TURNABLE_SPAWNER);

    if(currentTool == TOOLS.LINE){
        if(kb.pressing("shift") || kb.released("shift")){
        ImGui.Text("Placing line with " + placingLine.length + " points!");
            if(mouse.pressing() && !IO.WantCaptureMouse){
                if(placingLine.length > 3){
                    let lastIndex = placingLine.length - 1;
                    let lastPoint = placingLine[lastIndex];
                    let deltaX = Math.abs(mouse.x - lastPoint[0]);
                    let deltaY = Math.abs(mouse.y - lastPoint[1]);
                    // console.log(deltaX, deltaY);
                    if((deltaX + deltaY) > 10){
                        placingLine.push([mouse.x,mouse.y]);
                    }
                }else{
                    placingLine.push([mouse.x,mouse.y]);
                }
            }
            if(mouse.released() || keyboard.released("shift")){
                if(placingLine.length > 6){ // 4 points result in square smh
                    createLine(placingLine);
                    console.log("Placed line sprite",placingLine);
                    placingLine = [];
                }else{
                    ImGui.Text("Cancelled line place due to not enough points");
                    placingLine = [];
                }
            }
        }else{
            ImGui.Text("Hold shift and drag to create a line. Control+Z to undo. Redo is a button due to a bug. ");
            if(ImGui.Button("Clear lines")){
                level.lines = [];
                lineSprites.forEach(sprite => sprite.remove());
                lineSprites = [];
            }
            ImGui.SameLine();
            if(ImGui.Button("Clear trashed lines")){
                trashedLines = [];
            }
            ImGui.SameLine();
            if(ImGui.Button("Clear placing line")){
                placingLine = [];
            }
        }
    }else if(currentTool == TOOLS.LINE && kb.pressing("control")){
        ImGui.Text("Trashed lines: " + trashedLines.length);
        if(kb.pressed("z")){
           if(level.lines.length > 0){
                undo();
            }
        }
    }else if(currentTool == TOOLS.TURNABLE_SPAWNER){
        ImGui.InputDouble("Rotation Speed (requires sync)",rotationSpeedAccessor,0.1,0.01   );
        if(ImGui.Button("Sync Turnables")){
            syncRotations();
        }
        ImGui.InputInt("Default Turnable Width", defaultTurnableWidthAccessor);
        ImGui.InputInt("Default Turnable Height", defaultTurnableHeightAccessor);
    }else if(currentTool == TOOLS.SELECT){
        balls.forEach((ball) => {
            if(ball.mouse.pressing()){
                ball.moveTowards(mouse.x, mouse.y, 0.999);
            }
        });
    }

    if(ImGui.Button("Undo")) undo();
    ImGui.SameLine();
    if(ImGui.Button("Redo")) redo();

    if(ImGui.TreeNode("Explosives")){
        if(ImGui.Button("Kaboom")){
            balls.forEach((ball) => {
                ball.velocity.x = random(-10,10);
                ball.velocity.y = random(-10,10);
            })
        }

        ImGui.SameLine();

        if(ImGui.Button("Kaboom Large")){
            balls.forEach((ball) => {
                ball.velocity.x = random(-100,100);
                ball.velocity.y = random(-100,100);
            })
        }
        ImGui.TreePop();
    }

    if(ImGui.TreeNode("Physics")){
        ImGui.InputInt("Gravity", gravityAccessor);
        ImGui.InputInt("Spawn Quantity", spawnCountAccessor);
        ImGui.TreePop();
    }
    if(ImGui.TreeNode("Random/Misc")){
        ImGui.InputInt("Offset X", offsetXAccessor);
        ImGui.InputInt("Offset Y", offsetYAccessor);
        ImGui.TreePop();
    }


    if(ImGui.TreeNode("Level Data")){
        if(ImGui.Button("Save to Clipboard")){
            navigator.clipboard.writeText(JSON.stringify(level));
        }
        if(ImGui.Button("Load from Clipboard")){
            navigator.clipboard.readText().then((text) => {
                try{
                    let level = JSON.parse(text);
                    loadJson(level);
                }catch(ex){
                    alert("Error loading level " + ex);
                }
            })
            
        }
        ImGui.TreePop();
    }
    ImGui.InputInt("Ball Size (radius) ", ballDefaultRadiusAccessor);
    ImGui.Text("Ball Count: " + balls.length);
    ImGui.Text("Frames since last GC:" + framesSinceLastGc + " as: " + framesSinceLastAutoSpawn);
    ImGui.Text("x: " + mouse.x + " " + mouse.y + " mouse ");
    ImGui.End();
    ImGui.EndFrame();
    ImGui.Render();
    ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

    // non-gui dependent tools

    window.ImGui = ImGui;
    // The wants capture mouse tells us if the mouse is hovering above a gui window
    // In that case we do not trigger the tool
    if(currentTool == TOOLS.SPAWNER && !IO.WantCaptureMouse){
        const bulkDropActive = keyboard.pressing("control") && mouse.pressing();
        if(mouse.presses() || (bulkDropActive)){
            let ball = createBall();
            ball.x = mouse.x;
            ball.y = mouse.y;
        }
        
    }

    if(currentTool == TOOLS.TURNABLE_SPAWNER && !IO.WantCaptureMouse){
        if(mouse.presses()){
            let turnable = createTurnable(mouse.x, mouse.y);
        }
    }
    
}