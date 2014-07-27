/*{
	"title": "Pong",
	"author": "Chakra",
	"date": "2014-07-27",
	"version": 0,
	"description": "Pong is one of the first computer games ever created. This simple tennis-like game features two paddles and a ball with the goal to get the ball past the opponent. The first player to 10 goals wins.",
	"preview": {
		"small": "http://www.tutorialhero.com/uploads/83861.png",
		"medium": "http://sandbox.yoyogames.com/extras/image/name/san2/201/593201/original/pong.png",
		"large": "http://d1w7nqlfxfj094.cloudfront.net/wp-content/uploads/2012/11/Pong-game-620x310.jpg"
	}
}*/



/*********************************************************************
**********************************************************************
**********************************************************************
**	Standard stuff, expected in all protocols
**********************************************************************
**********************************************************************
*********************************************************************/

var url = _initData.url;

importScripts(
	url + "r/applyProperties.js",
	url + "r/EventTarget.js",
	url + "r/Widget.js"
);

//Player data we already have
var players		= _initData.players;
var localPlayer	= _initData.localPlayer;

//Superevent objects
var local	= new EventTarget();	//For callbacks on functions
var ui		= new EventTarget();	//For user interface
var host	= new EventTarget();	//For network

addEventListener('message', function(e) {
	
	//Reatime traffic from a host
	if (e.data.type == "host")
		host.fire(e.data.data.id, e.data.data);
	
	else if (e.data.type == "local")
		local.fire(e.data.data.id, e.data.data);
		
	else if (e.data.type == "ui")
		ui.fire(e.data.data.id, e.data.data);
	
	//Some other type of traffic not yet programmed
	else console.log("uncoded data type");
	
}, false);

/*********************************************************************
**********************************************************************
**********************************************************************
**	Pong
**********************************************************************
**********************************************************************
*********************************************************************/

/**********************************
**	Types
**********************************/

function Paddle(props) {
	Widget.apply(this, [props, true])
	
	this.model.geometry.size = {
		height: 250,
		width: 25,
		depth: 25
	};
	
	this.pathingmap = [
		{x: -0.5, y: -2.5},
		{x: -0.5, y:  2.5},
		{x:  0.5, y: -2.5},
		{x:  0.5, y:  2.5}
	];
	
	applyProperties(this, props);
	
	postMessage({
		_func: "newWidget", 
		randID: this.randID,
		position: this.position,
		offset: this.offset,
		model: this.model
	});
}

Paddle.prototype = Object.create(Widget.prototype);

/**********************************
***********************************
**	Init
***********************************
**********************************/

//Objects
var lPaddle = new Paddle({position: {x: -750, y: 0}});
var rlPaddle = new Paddle({position: {x:  750, y: 0}});
var ball;
var boundary;

//There are already more than two players here, so they are probably already started
if (players.length > 2) {
	
}

/**********************************
***********************************
**	Hooks
***********************************
**********************************/

local.on("onJoin", function(e) {
	players.concat(e.accounts);
});

//Users who join mid-game
host.on("onJoin", function(e) {
	players.concat(e.accounts);
});
