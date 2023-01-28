// Reinventing a portion of p5play lol

const WIDTH = 1280;
const HEIGHT = 720;

let state = [];
let font; 
let circleShape;

const ANIM_MULT = 0.1;
const FPS = 60;

class Message {
    image;
    x = 50;
    y = 50;
    tx = 50;
    ty = 50;

    pfp = ""; // TODO: default
    username = "username";
    message = "Test message";

    constructor(username, message, pfp) {
        this.pfp = pfp;
        this.username = username;
        this.message = message;
    }

    preload(){
        this.image = loadImage(this.pfp);
    }

    render(){
        image(this.image,this.x,this.y,64,64);
        fill("white");
        stroke("white");
        textFont(font);
        textSize(16);
        textStyle(BOLD);
        text(this.username,this.x+70,this.y + 16);
        textStyle(NORMAL);
        textSize(14);
        text(this.message,this.x+70,this.y+36);
    }

    processAnimations(){
        this.moveTowards();
    }

    moveTowards(){
        console.log(this.x, this.y);
        if(Math.abs(this.tx - this.x) > 0.01) this.x += Math.round((this.tx - this.x)*ANIM_MULT);
        if(Math.abs(this.ty - this.y) > 0.01) this.y += Math.round((this.ty - this.y)*ANIM_MULT)
    }
}

let messages = {
    "evan_initial": new Message("Evan",
    "https://finalharvest.app/share/b944ed36032d4f43a9675befef9528c0\nclick this link for free cisco answers",
    "souls/assets/dranx.webp"),
    "jona_sus": new Message("Jonathan",
    "-_-\nok dude",
    "souls/assets/jona.png"),
    "evan_convince": new Message("Evan",`no jonathan
actually
click into it
its free cisco answers`, "souls/assets/dranx.webp")
};

let messagesArr = Object.values(messages);

let visibleMessages = [];

function preload(){
    font = loadFont('/souls/assets/whitneybook.otf');
    for(let message of messagesArr){
        // TODO: dedupe images for performance
        message.image = loadImage(message.pfp);
    }
}

function setup(){
    new Canvas(WIDTH,HEIGHT);
    state.push(new Message());
    fill("black");new Promise(resolve => setTimeout(resolve, 1000));
    stroke("black");
    circleShape = createGraphics(64, 64);
    circleShape.ellipse(32, 32, 64, 64);
    for(let msg of messagesArr){
        msg.image.mask(circleShape);
    }
    frameRate(FPS);
}


let startedAsyncRoutine = false;

function slideIn(message){
    let targetPosition = [50,50 + visibleMessages.length * 80];
    message.tx = targetPosition[0];
    message.ty = targetPosition[1];
    message.x = targetPosition[0];
    message.y = HEIGHT + 100;
    visibleMessages.push(message);
}

function wait(ms){
    // weird solution to wait async I like using
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function routine(){
    await slideIn(messages["evan_initial"]);
    await wait(2500);
    await slideIn(messages["jona_sus"]);
    await wait(1500);
    await slideIn(messages["evan_convince"]);
}

function draw(){
    background("#2c2f33");
    if(!startedAsyncRoutine){
        startedAsyncRoutine = true;
        routine();
    }
    for(let message of visibleMessages){
        message.processAnimations();
        message.render();
    }
}