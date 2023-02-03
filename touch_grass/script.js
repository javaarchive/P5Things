const WIDTH = 1280;
const HEIGHT = 720;

let grass = [];

let buttons = [];

let grassTouched = false;

let framesSinceLastQuoteRandomization = 0;

let framesSinceLastGrassRandomization = 0;

const quotes = [
    '"It\'s good to touch green"',
    '"what" - hansen he',
    '"noooooooooooooooo! fine" - bryan guo',
    '"civilized ppl touch grass that\'s why I don\'t" - aryan mudliar',
    '"touching grass is overrated" - someone'
];


let currentOverlayText = "Have you touched grass today?";

// helper function create lots of canvas buttons at once!
function createCanvasButton(x,y,text, url){
    let sprite = new Sprite(x,y, 200,200);
    sprite.text = text;
    sprite.textSize = 18    ;
    sprite.collider = "kinematic";
    sprite.fillColor = "white";
    sprite.target = url;
    sprite.helddownframes = 0;
    sprite.origX = x;
    sprite.origY = y;
    return sprite;
}

function setup(){

    new Canvas(WIDTH,HEIGHT);

    world.gravity.y = 10; // let's our grass fall down
    
    for(let i = 0; i < 1024; i ++){
        grass.push(createGrassStroke(random(0,WIDTH),720,1,random(0,100)));
    }

    buttons.push(createCanvasButton(200,450, "Going outside", "https://www.google.com/maps/search/national+parks+near+me/"));
    buttons.push(createCanvasButton(500,450, "Buying some grass", "https://www.amazon.com/s?k=grass&ref=touch_grass_app"));
    buttons.push(createCanvasButton(800,450, "Finding grass near you. ", "https://www.google.com/maps/search/grass"));

}

// Non-sprite overlays

function renderOverlay(){
    textSize(48);
    fill("black");
    strokeWeight(0);
    framesSinceLastQuoteRandomization ++ ;
    // randomize quote every 180 frames which is 3 seconds
    if(framesSinceLastQuoteRandomization > 3 * 60){
        framesSinceLastQuoteRandomization = 0;
        // somehow p5 random was broken
        currentOverlayText = quotes[Math.floor(Math.random() * quotes.length)];
    }
    text(currentOverlayText,100,100);
    textSize(36);
    text("quotes from those who were asked to touch grass", 100, 150);
    textSize(30);
    text("press space to change quote", 100, 200);
}

function createGrassStroke(x,y, scale = 1,extraHeight = 0){
    let sprite = new Sprite([[x-scale*10,y],[x+scale*10,y],[x,y-scale*50-extraHeight],[x-scale*10,y]]);
    sprite.fillColor = "green";
    sprite.stroke = "green";
    sprite.collider = "static";    
    return sprite;
}

function draw(){
    // basic background
    background("cyan");
    
    // drawSprites();

    // grass.forEach((g) => g.draw())


    // enable physics for grass on click
    grass.forEach((grassBlade) => {
        if(grassBlade.mouse.pressed()){
            grassBlade.collider = "dynamic";
            grassBlade.velocity.y = -5;
            grassTouched = true;
        }
    });

    // button growing and trigger code
    buttons.forEach((btn) => {
        // "Stick" button to mouse a bit
        btn.x = (btn.origX + (mouseX - btn.origX) * 0.1);
        btn.y = (btn.origY + (mouseY - btn.origY) * 0.1);
        if(btn.mouse.pressing()){
            btn.helddownframes ++;
            btn.scale = btn.helddownframes / 300 + 1;
            btn.rotation = btn.helddownframes;
            if(btn.helddownframes > 60 * 1){
                location.href = btn.target; // go to the page
                window.draw = function(){} // disable drawing so we don't go to the page repeatdly
            }
        }
    });

    // keep randomizing grass x positions until the user touches the grass
    framesSinceLastGrassRandomization ++;
    if(framesSinceLastGrassRandomization > 30 && !grassTouched){
        framesSinceLastGrassRandomization = 0;
        grass.forEach((grassBlade) => {
            grassBlade.x = random(0,WIDTH);
        });
    }

    if(kb.pressed("space")){
        currentOverlayText = quotes[Math.floor(Math.random() * quotes.length)];
    }

    renderOverlay();

}