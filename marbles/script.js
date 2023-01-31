const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

let canvas;

let setupDone = false;

let balls = [];

const FPS = 60;

let ballDefaultRadius = 10;
let ballDefaultRadiusAccessor;

let gravityAccessor;

let spawnCount = 1;
let spawnCountAccessor;

let IO = null;

let turningSpeed = 0.1;
let turningSpeedAccessor =  (_ = turningSpeed) => turningSpeed = _;

const TOOLS = {
    SPAWNER: 1,
    LINE: 2,
    SELECT: 3,
    SELECT_MULTIPLE: 4,
    TURNABLE_SPAWNER: 5
}

let currentTool = TOOLS.SPAWNER;
let currentToolAccessor = (_ = currentTool) => currentTool = _;

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
}

let level = {
    lines: [],
    turnables: []
};
let lineSprites = [];
let placingLine = [];
let trashedLines = [];

let turnableSprites = [];

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
    if(level.lines.length == 0) return;
    trashedLines.push(level.lines.pop());
    lineSprites.pop().remove();
}

function redo(){
    if(trashedLines.length > 0){
        let line = trashedLines.pop();
        let lineSprite = new Sprite(line);
        lineSprite.collider = "static";
        lineSprite.color = "white";
        level.lines.push(line);
        lineSprites.push();
    }
    
}

function draw(){
    if(!setupDone) return;
    const frameDelta = performance.now() - lastFrame;
    lastFrame = performance.now();

    background("#2c2f33");
    
    textSize(24);
    stroke("black");
    fill("white");
    text("FPS: " + Math.floor(frameRate()), 50, 50);
    if(framesSinceLastGc > FPS * 10){ // 10 seconds
        gc();
    }else{
        framesSinceLastGc ++;
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
    ImGui.RadioButton("Select Multiple",currentToolAccessor,TOOLS.SELECT_MULTIPLE);
    ImGui.RadioButton("Spawn Turnables",currentToolAccessor,TOOLS.TURNABLE_SPAWNER);

    if(currentTool == TOOLS.LINE){
        if(kb.pressing("shift")){
        ImGui.Text("Placing line with " + placingLine.length + " points!");
            if(mouse.pressing() && !IO.WantCaptureMouse){
                if(placingLine.length > 3){
                    let lastIndex = placingLine.length - 1;
                    let lastPoint = placingLine[lastIndex];
                    let deltaX = Math.abs(mouse.x - lastPoint[0]);
                    let deltaY = Math.abs(mouse.y - lastPoint[1]);
                    // console.log(deltaX, deltaY);
                    if((deltaX + deltaY) > 5){
                        placingLine.push([mouse.x,mouse.y]);
                    }
                }else{
                    placingLine.push([mouse.x,mouse.y]);
                }
            }
            if(mouse.released()){
                if(placingLine.length > 6){ // 4 points result in square smh
                    level.lines.push(placingLine);
                    let lineSprite = new Sprite(placingLine);
                    lineSprite.collider = "static";
                    lineSprite.color = "white";
                    lineSprites.push(lineSprite);
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
    }else if(currentTool == TOOLS.TURNABLE_SPAWNER && !IO.WantCaptureMouse){
        if(mouse.pressed()){
            let turnable = {
                x: mouse.x,
                y: mouse.y
            }
            let turnableSprite = new Sprite(turnable.x, turnable.y);
            turnableSprite.collider = "static";
            turnableSprite.rotation = 45;
            turnableSprite.width = 64;
            turnableSprite.height = 36;
            turnableSprites.push(turnableSprite);
        }
    }

    turnableSprites.forEach((sprite) => {
        sprite.rotation = (sprite.rotation + frameDelta * turningSpeed) % 360;
    });

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
        ImGui.InputDouble("Turning Speed", turningSpeedAccessor, 0.01,0.1);
        if(ImGui.Button("Sync Rotations of Turnables")){
            turnableSprites.forEach((sprite) => sprite.rotation = 0);
        }
        ImGui.TreePop();
    }
    if(ImGui.TreeNode("Random/Misc")){
        ImGui.InputInt("Offset X", offsetXAccessor);
        ImGui.InputInt("Offset Y", offsetYAccessor);
        ImGui.TreePop();
    }
    ImGui.InputInt("Ball Size (radius) ", ballDefaultRadiusAccessor);
    ImGui.Text("Ball Count: " + balls.length);
    ImGui.Text("Frames since last GC:" + framesSinceLastGc);
    ImGui.End();
    ImGui.EndFrame();
    ImGui.Render();
    ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

    // non-gui dependent tools

    window.ImGui = ImGui;
    // The wants capture mouse tells us if the mouse is hovering above a gui window
    // In that case we do not trigger the tool
    if(currentTool == TOOLS.SPAWNER && !IO.WantCaptureMouse){
        const bulkDropActive = (keyboard.pressing("control") && mouse.pressing() && !kb.pressing("z") && !kb.pressing("shift"));
        if(mouse.presses() || (bulkDropActive)){
            let ball = createBall();
            ball.x = mouse.x;
            ball.y = mouse.y;
        }
        
    }
    
}

async function copyLevel(){
    await navigator.clipboard.writeText(JSON.stringify(level));
}