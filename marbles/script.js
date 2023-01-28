const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

let canvas;

let setupDone = false;

let balls = [];

const FPS = 60;

let gravityAccessor;

let spawnCount = 1;
let spawnCountAccessor;

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
    setupDone = true;
    // Init physics
    world.gravity.y = 10;

    gravityAccessor = (_ = world.gravity.y) => world.gravity.y = _;
    spawnCountAccessor = (_ = spawnCount) => spawnCount = _;
    
    frameRate(FPS);
}

let level = {
    lines: []
};
let lineSprites = [];

let placingLine = [];


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

let lastFrame = performance.now();
let framesSinceLastGc = 0;

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
    if(ImGui.Button("Spawn Ball")){
        for(let i = 0; i < spawnCount; i++){
            let ball = new Sprite();
            ball.radius = 10;
            ball.collider = "dynamic";

            ball.x = random(0,WIDTH);
            ball.y = random(0,HEIGHT);

            balls.push(ball);
        }
    }
    if(ImGui.Button("Remove unneeded balls")){
        gc();
    }

    if(kb.pressing("shift")){
        ImGui.Text("Placing line with " + placingLine.length + " points!");
        if(mouse.pressing()){
            if(placingLine.length > 2){
                let lastIndex = placementLine.length - 1;
                let lastPoint = placingLine[lastIndex];
                let deltaX = Math.abs(mouse.x - lastPoint.x);
                let deltaY = Math.abs(mouse.y - lastPoint.y);
                if((deltaX + deltaY) > 5){
                    placingLine.push([mouse.x,mouse.y]);
                }
            }else{
                placingLine.push([mouse.x,mouse.y]);
            }
        }
        if(mouse.released()){
            if(placingLine.length > 2){
                level.lines.push(placingLine);
                let lineSprite = new Sprite(placingLine);
                lineSprite.collider = "static";
                lineSprite.color = "white";
                lineSprites.push(lineSprite);
                console.log("Placed line sprite");
                placingLine = [];
            }
        }
    }

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

    ImGui.InputInt("Gravity", gravityAccessor);
    ImGui.InputInt("Spawn Quantity", spawnCountAccessor);
    ImGui.Text("Ball Count: " + balls.length);
    ImGui.Text("Frames since last GC:" + framesSinceLastGc);
    ImGui.End();
    ImGui.EndFrame();
    ImGui.Render();
    ImGui_Impl.RenderDrawData(ImGui.GetDrawData());
    
}