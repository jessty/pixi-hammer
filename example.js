var PIXI = require('pixi.js');
var Connector = require('./index.js');

var app = new PIXI.Application(320, 400, {
  backgroundColor: 0x1099bb
});
document.body.appendChild(app.view);

var world = new PIXI.Graphics();
world.beginFill(0xFF3300);
world.drawRect(0, 0, 1000, 1000);
app.stage.addChild(world);

var rect = new PIXI.Graphics();
rect.beginFill(0x000000);
rect.drawRect(100, 100, 100, 100);
rect.priority = 1;
app.stage.addChild(rect);

var rect2 = new PIXI.Graphics();
rect2.beginFill(0x0000FF);
rect2.drawRect(150, 50, 100, 100);
rect2.priority = 2;
app.stage.addChild(rect2);

/**
 * connect events
 */
var c = new Connector(app);

c.listen(world, 'pan', function(e) {
  console.log('panning on the world!');
});

c.listen(rect, 'tap', function(e) {
  console.log('tapping on the rect1!');
});

c.listen(rect2, 'tap', function(e) {
  console.log('tapping on the rect2!');
});

c.start();