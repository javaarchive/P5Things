let balls = [];
let cubes = [];
let floor;

const WIDTH = 2420;
const HEIGHT = 1500;

function setup(){
    new Canvas(2420,1500);
    floor = new Sprite(400,100);
    floor.color = "orange";
    floor.y = 900;
    floor.x = 960;  
    floor.width = 1800;
    floor.collider = "static";

    world.gravity.y = 10;

    for(let i = 0; i < 125; i ++){
        let ball = new Sprite();
        ball.radius = 10 + Math.random() * 50;
        ball.color = Math.random() * 100 + 100;
        ball.x = Math.random() * 800;
        ball.y = Math.random() * 500;
        ball.gravity = 1;
        ball.collider = "dynamic";
        ball.vx = Math.random() * 250 - 500;
        ball.vy = Math.random() * 250 - 500;
        ball.addSpeed(Math.random() * 360, Math.random() * 360);
        balls.push(ball);
    }

    frameRate(25);
}

function countAlive(){
    let count = 0;
    const counter = (ball) => {
        if(0 <= ball.x && ball.x <= WIDTH && 0 <= ball.y && ball.y <= HEIGHT){
            count ++;
        }
    };
    balls.forEach(counter);
    cubes.forEach(counter);
    return count;
}

function draw(){
    background("grey");
    stroke("green");
    if(kb.pressing('space')){
        balls.forEach((ball) => {
            // ball.rotateTowards(mouse);
            ball.moveTowards(mouse.x,mouse.y, 0.1);
        });
    }
    if(mouse.pressing()){
        // Spawn sprite lol
        let cube = new Sprite();
        // prob inefficient i can do one line
        cube.x = mouse.x;
        cube.y = mouse.y;
        let wh = 10 + Math.floor(Math.random() * 50);
        if(kb.pressing("shift")){
            wh += Math.floor(Math.random() * 100);
        }
        cube.width = wh;
        cube.height = wh;
        cubes.push(cube);
    }
    drawSprites();
    textSize(128);
    text("FPS: " + Math.floor(frameRate())  , 100,100);
    text("Score " + countAlive()  , 100,200);
}