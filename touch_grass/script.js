const WIDTH = 1280;
const HEIGHT = 720;

let grass = [];

function setup(){

    new Canvas(WIDTH,HEIGHT);

    world.gravity.y = 10; // let's our grass fall down
    
    for(let i = 0; i < 256; i ++){
        grass.push(createGrassStroke(random(0,WIDTH),600,1,random(0,100)));
    }   
}


function renderOverlay(){
    textSize(48);
    fill("black");
    strokeWeight(0);
    text("Have you touched the grass today?",100,100);
}

function createGrassStroke(x,y, scale = 1,extraHeight = 0){
    let sprite = new Sprite([[x-scale*10,y],[x+scale*10,y],[x,y-scale*50-extraHeight],[x-scale*10,y]]);
    sprite.fillColor = "green";
    sprite.stroke = "green";
    sprite.collider = "static";    
    return sprite;
}

function draw(){
    background("cyan");
    
    // drawSprites();

    // grass.forEach((g) => g.draw())

    grass.forEach((grassBlade) => {
        if(grassBlade.mouse.pressed()){
            grassBlade.collider = "dynamic";
            grassBlade.velocity.y = -5;
        }
    })

    renderOverlay();

}