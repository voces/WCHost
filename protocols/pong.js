/*{
	"title": "Pong",
	"author": "Chakra",
	"date": "2014-08-02",
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
	url + "r/local.js",
	url + "r/Widget.js"
);

//Player data we already have
var players		= _initData.players;
var localPlayer	= _initData.localPlayer;

//Superevent objects
var host = new EventTarget();	//For network

addEventListener('message', function(e) {
	
	//Reatime traffic from a host
	if (e.data.type == "host")
		host.fire(e.data.data.id, e.data.data);
	
	else if (e.data.type == "local")
		local.fire(e.data.data.id, e.data.data);
		
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
	
	applyProperties(this, props);
	console.log(this, this.tempID);
	postMessage({
		_func: "createWidget", 
		tempID: this.tempID,
		position: this.position,
		offset: this.offset,
		boundingBox: this.boundingBox,
		model: this.model
	});
}

Paddle.prototype = Object.create(Widget.prototype);

/**********************************
***********************************
**	Functions
***********************************
**********************************/

function isPlaying(account) {
	return account != null && (lPlayer == account || rPlayer == account);
}

/**********************************
***********************************
**	Init
***********************************
**********************************/

/**********************************
**	Globals
**********************************/

var lPlayer = null;
var rPlayer = null;
var waitingPlayers = players;

/**********************************
**	Now create some objects
**********************************/

var boundingBox = {
	max: {y: 1075},
	min: {y: -1075},
};

var lPaddle = new Paddle({position: {x: -750}, boundingBox: boundingBox});
var rPaddle = new Paddle({position: {x:  750}, boundingBox: boundingBox});
var ball;

//White part...
var outline = new Widget({
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
var outline2 = new Widget({
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

//Create our UI
postMessage({
	_func: "addHTML", 
	html: [{
		tag: "div",
		id: "panel",
		children: [{
			tag: "div",
			id: "header",
			children: [{
				tag: "span",
				id: "lPlayer",
				class: "player",
				text: "Left Player"
			}, {
				tag: "span",
				text: " vs. "
			}, {
				tag: "span",
				id: "rPlayer",
				class: "player",
				text: "Right Player"
			}]
		}, {
			tag: "div",
			id: "queue"
		}]
	}, {
		tag: "style",
		rules: [{
			id: "panel",
			position: "absolute",
			right: "1em",
			top: "1em"
		}]
	}]
});

/**********************************
**	Some player stuff
**********************************/

//This is the only case we know and it means we are the first player in the game
if (waitingPlayers.length == 1) {
	lPlayer = waitingPlayers.shift(0, 1);
}

/**********************************
***********************************
**	Hooks
***********************************
**********************************/

local.on("keydown", function(e) {
	
	if (!isPlaying(localPlayer)) return;
	
	if (e.which == 38 && e.firstDown) {
		postMessage({
			_func:	"broadcast",
			sid:	"keydown",
			which:	38
		});
	}
		
	else if (e.which == 40 && e.firstDown) {
		postMessage({
			_func:	"broadcast",
			sid:	"keydown",
			which:	40
		});
	}
});

local.on("keyup", function(e) {
	
	if (!isPlaying(localPlayer)) return;
	
	if (e.which == 38) {
		postMessage({
			_func:	"broadcast",
			sid:	"keyup",
			which:	38
		});
	}
		
	else if (e.which == 40) {
		postMessage({
			_func:	"broadcast",
			sid:	"keyup",
			which:	40
		});
	}
});

host.on("onBroadcast", function(e) {
	
	var paddle;
	if (e.account == lPlayer)
		paddle = lPaddle;
	else if (e.account == rPlayer)
		paddle = rPaddle;
	
	if (!paddle) return;
	
	if (e.sid == "keydown") {
		if (e.which == 38)
			paddle.slide({timestamp: e.timestamp, direction: Math.PI * 0.5});
		else if (e.which == 40)
			paddle.slide({timestamp: e.timestamp, direction: Math.PI * 1.5});
	} else if (e.sid == "keyup") {
		if (e.which == 38)
			paddle.stopSlide({timestamp: e.timestamp, direction: Math.PI * 0.5});
		else if (e.which == 40)
			paddle.stopSlide({timestamp: e.timestamp, direction: Math.PI * 1.5});
	}
	
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
