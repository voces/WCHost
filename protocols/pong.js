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
***********************************
**	Types
***********************************
**********************************/

/**********************************
**	Paddle
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
	
	this.speed = 500;
	this._slide = {
		start: NaN,
		startPosition: {
			x: NaN,
			y: NaN
		},
		direction: NaN,
		speed: NaN
	};
	
	this.boundingBox = {
		max: {
			y: 500
		},
		min: {
			y: -500
		}
	}
	
	applyProperties(this, props);
	
	widgets.push(this);
	
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
**	Functions
***********************************
**********************************/

function g(obj, props, index) {
	if (index == props.length - 1) return obj[props[index]];
	else if (typeof obj[props[index || 0]] != "undefined")
		g(obj[props[index || 0]], props, (index || 0) + 1);
	else return false;
}

function isPlaying(account) {
	return lPlayer == account || rPlayer == account;
}

/**********************************
**	Boundary
**********************************/

function Boundary(props) {
	
	this.max = {
		x: NaN,
		y: NaN
	}
	
	this.min = {
		x: NaN,
		y: NaN
	}
	
	this.global = false;
	
	this.widgets = [];
	
	applyProperties(this, props);
}

/**********************************
***********************************
**	Init
***********************************
**********************************/

/**********************************
**	Globals
**********************************/

var widgets = [];

var localKeys = {
	up: false,
	down: false
};

var lPaddle = new Paddle({position: {x: -750, y: 0}});
console.log("lPaddle", lPaddle.randID);
var rPaddle = new Paddle({position: {x:  750, y: 0}});
console.log("rPaddle", rPaddle.randID);
var ball;

var lPlayer = null;
var rPlayer = null;
var waitingPlayers = players;

/**********************************
**	Now create some objects
**********************************/

//White part...
var boundingBox = new Widget({
	model: {
		geometry: {
			size: {
				width:  1550,
				height: 1250,
				depth:  200
			}
		}
	},
	position: {
		z: -113
	}
});

//Black part (creates a 
var boundingBox2 = new Widget({
	model: {
		geometry: {
			size: {
				width:  1525,
				height: 1200,
				depth:  1
			}
		},
		material: {
			color: "black"
		}
	},
	position: {
		z: -0.5
	}
});

//There are already more than two players here, so they are probably already started
if (players.length > 2) {
	
}

/**********************************
***********************************
**	Hooks
***********************************
**********************************/

local.on("widget", function(e) {
	for (var i = 0; i < widgets.length; i++)
		if (widgets[i].randID == e.randID) {
			widgets[i].id = e.oid;
			break;
		}
});

ui.on("keydown", function(e) {
	
	if (!isPlaying(localPlayer)) return;
	
	if (e.which == 38 && !localKeys.up) {
		localKeys.up = true;
		
		postMessage({
			_func:	"broadcast",
			sid:	"up",
			state:	"down"
		});
	}
		
	else if (e.which == 40 && !localKeys.down) {
		localKeys.down = true;
		
		postMessage({
			_func:	"broadcast",
			sid:	"down",
			state:	"down"
		});
	}
});

ui.on("keyup", function(e) {
	
	if (!isPlaying(localPlayer)) return;
	
	if (e.which == 38) {
		localKeys.up = false;
		
		postMessage({
			_func:	"broadcast",
			sid:	"up",
			state:	"up"
		});
	}
		
	else if (e.which == 40) {
		localKeys.down = false;
		
		postMessage({
			_func:	"broadcast",
			sid:	"down",
			state:	"up"
		});
	}
});

host.on("onBroadcast", function(e) {
	
	var paddle;
	if (e.account == lPlayer)
		paddle = lPaddle;
	else if (e.account == rPlayer)
		paddle = rPaddle;
	
	if (e.sid == "up" && paddle)
		if (e.state == "down")
			paddle.slide({timestamp: e.timestamp, direction: Math.PI * 0.5});
		else
			paddle.stopSlide({timestamp: e.timestamp});
	else if (e.sid == "down" && paddle)
		if (e.state == "down")
			paddle.slide({timestamp: e.timestamp, direction: Math.PI * 1.5});
		else
			paddle.stopSlide({timestamp: e.timestamp});
	
});

//Users who join mid-game
host.on("onJoin", function(e) {
	players.concat(e.accounts);
	
	waitingPlayers.concat(e.accounts);
	
	
	/*	We can't be sure of the players, need a vote on state...
	if (lPlayer == null)
		lPlayer = waitingPlayers.shift(0, 1);
		
	if (rPlayer == null)
		rPlayer = waitingPlayers.shift(0, 1);*/
	
});
