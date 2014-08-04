/*{
	"title": "Pong",
	"author": "Chakra",
	"date": "2014-08-03",
	"version": 0,
	"description": "Pong is one of the first computer games ever created. This simple tennis-like game features two paddles and a ball with the goal to get the ball past the opponent. The first player to 10 goals wins.",
	"preview": {
		"small": "r/img/pongSmall.png",
		"medium": "r/img/pongMedium.png",
		"large": "r/img/pongLarge.jpg"
	}
}*/

/*********************************************************************
**********************************************************************
**********************************************************************
**	Standard stuff, useful in all protocols
**********************************************************************
**********************************************************************
*********************************************************************/

var url = _initData.url;

importScripts(
	url + "r/src/seedrandom.min.js",
	url + "r/src/natives.js",
	url + "r/src/applyProperties.js",
	url + "r/src/EventTarget.js",
	url + "r/src/local.js",
	url + "r/src/Widget.js",
	url + "r/src/host.js",
	url + "r/src/Poll.js"
);

//Player data we already have
var players		= _initData.players;
var localPlayer	= _initData.localPlayer;

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
	
	this.boundingBox = {
		max: {x: NaN, y: 475},
		min: {x: NaN, y: -475}
	};
	
	this.speed = 500;
	
	applyProperties(this, props);
	
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

function Ball(props) {
	Widget.apply(this, [props, true])
	
	this.model.geometry = {
		shape: "IcosahedronGeometry",
		radius: 25,
		detail: 2
	};
	
	this.collison = 50;
	
	this.speed = 500;
	
	applyProperties(this, props);
	
	postMessage({
		_func: "createWidget", 
		tempID: this.tempID,
		position: this.position,
		offset: this.offset,
		boundingBox: this.boundingBox,
		model: this.model
	});
}

Ball.prototype = Object.create(Widget.prototype);

/**********************************
***********************************
**	Functions
***********************************
**********************************/

function isPlaying(account) {
	return account != null && (lPlayer == account || rPlayer == account);
}

function setPlayer(which, account) {
	if (which == "left") {
		lPlayer = account;
		setText("lPlayer", account);
	} else if (which == "right") {
		rPlayer = account;
		setText("rPlayer", account);
	}
	
	var index = waitingPlayers.indexOf(account);
	if (index >= 0) {
		waitingPlayers.splice(index, 1);
		removeElement("wPlayer_" + account);
	}
}

function start() {
	lPaddle.setPosition({position: {x: -750, y: 0}, timestamp: this.timestamp});
	rPaddle.setPosition({position: {x:  750, y: 0}, timestamp: this.timestamp});
	
	playing = true;
	
	//ball.slide({timestamp: this.timestamp, direction: Math.random() * Math.PI * 2});
}

function stop(timestamp) {
	playing = false;
	
	ball.stopSlide({timestamp: timestamp});
	ball.setPosition({position: {x:  0, y: 0}, timestamp: timestamp});
}

function sync(poll, winner) {
	if (!winner) throw "Got a problem here...";
	
	updated = true;
	
	emptyElement("queue");
	
	playing = winner.data.playing;
	waitingPlayers = winner.data.waitingPlayers;
	setPlayer("left", winner.data.lPlayer);
	setPlayer("right", winner.data.rPlayer);
	
	var html = [];
	
	for (var i = 0; i < waitingPlayers.length; i++)
		html.push({
			id: "wPlayer_" + waitingPlayers[i].replace(/#/g, "&35;"),
			tag: "div",
			parent: "queue",
			text: waitingPlayers[i]
		});
	
	addHTML(html);
	
	Math.seedrandom(winner.data.start);
	
	var difference = Date.now() - winner.data.start + 3000;
	setTimeout(start.bind({timestamp: winner.data.start + 3000}), difference);
}

/**********************************
***********************************
**	Init
***********************************
**********************************/

/**********************************
**	Globals
**********************************/

var broadcast = new EventTarget();

var lPlayer = null;
var rPlayer = null;
var waitingPlayers = players.slice();

var playing = false;
var updated = false;

var update = new Poll("update", sync, players.slice(0, players.length - 1));

/**********************************
**	Now create some objects
**********************************/

var lPaddle = new Paddle({position: {x: -750}});
var rPaddle = new Paddle({position: {x:  750}});
var ball = new Ball();

//White part...
var outline = new Widget({
	model: {geometry: {size: {width: 1550, height: 1250, depth: 200}}},
	position: {z: -113}
});

//Black part (creates a 
var outline2 = new Widget({
	model: {
		geometry: {size: {width: 1525, height: 1200, depth: 1}},
		material: {color: "black"}
	}, position: {z: -0.5}
});

/**********************************
**	UI
**********************************/

addHTML([
	{tag: "div", id: "panel", children: [
		{tag: "div", id: "header", children: [
			{tag: "span", id: "lPlayer", class: "player", text: "null"}, 
			{tag: "span", text: " vs. "},
			{tag: "span", id: "rPlayer", class: "player", text: "null"}]}, 
		{tag: "div", id: "queue"}]},
	{tag: "style", rules: [{id: "panel", position: "absolute", right: "1em", top: "1em"}]}
]);

/**********************************
**	Some player stuff
**********************************/

//This is the only case we know and it means we are the first player in the game
if (waitingPlayers.length == 1) {
	setPlayer("left", waitingPlayers.splice(0, 1)[0]);
	this.updated = true;
} else {
	var html = [];
	
	for (var i = 0; i < waitingPlayers.length; i++)
		html.push({
			id: "wPlayer_" + waitingPlayers[i].replace(/#/g, "&35;"),
			tag: "div",
			parent: "queue",
			text: waitingPlayers[i]
		});
	
	addHTML(html);
}

/**********************************
***********************************
**	Broadcasting
***********************************
**********************************/

broadcast.on("keydown", function(e) {
	
	var paddle;
	if (e.account == lPlayer)
		paddle = lPaddle;
	else if (e.account == rPlayer)
		paddle = rPaddle;
	
	if (!paddle) return;
	
	if (e.which == 38)
		paddle.slide({timestamp: e.timestamp, direction: Math.PI * 0.5});
	else if (e.which == 40)
		paddle.slide({timestamp: e.timestamp, direction: Math.PI * 1.5});
});

broadcast.on("keyup", function(e) {
	
	var paddle;
	if (e.account == lPlayer)
		paddle = lPaddle;
	else if (e.account == rPlayer)
		paddle = rPaddle;
	
	if (!paddle) return;
	
	if (e.which == 38)
		paddle.stopSlide({timestamp: e.timestamp, direction: Math.PI * 0.5});
	else if (e.which == 40)
		paddle.stopSlide({timestamp: e.timestamp, direction: Math.PI * 1.5});
});

/**********************************
***********************************
**	Hooking (passive & active)
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
	broadcast.fire(e.sid, e);
});

//Users who join mid-game
host.on("onJoin", function(e) {
	players = players.concat(e.accounts);
	
	waitingPlayers = waitingPlayers.concat(e.accounts);
	
	if (updated) {
		if (lPlayer == null)
			setPlayer("left", waitingPlayers.splice(0, 1)[0]);
		else if (rPlayer == null)
			setPlayer("right", waitingPlayers.splice(0, 1)[0]);
		
		update.start({
			lPlayer: lPlayer,
			rPlayer: rPlayer,
			waitingPlayers: waitingPlayers,
			playing: playing,
			start: e.timestamp
		}, false, players.slice(0, players.length - 1));
	}
	
	var html = [];
	
	for (var i = 0; i < e.accounts.length; i++)
		if (e.accounts[i] != lPlayer && e.accounts[i] != rPlayer)
			html.push({
				id: "wPlayer_" + e.accounts[i].replace(/#/g, "&35;"),
				tag: "div",
				parent: "queue",
				text: e.accounts[i]
			});
	
	if (html.length) addHTML(html);
});

host.on("onLeave", function(e) {
	var index = players.indexOf(e.account);
	players.splice(index, 1);
	
	if (e.account == lPlayer) {
		setPlayer("left", waitingPlayers[0] || null);
		stop(e.timestamp);
	} else if (e.account == rPlayer) {
		setPlayer("right", waitingPlayers[0] || null);
		stop(e.timestamp);
	} else {
		index = waitingPlayers.indexOf(e.account);
		
		if (index >= 0) {
			waitingPlayers.splice(index, 1);
			removeElement("wPlayer_" + e.account);
		}
	}
});
