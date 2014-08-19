/*{
	"title": "Pong²",
	"author": "Chakra",
	"date": "2014-08-13",
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
	url + "r/src/Poll.js",
	url + "r/src/Point.js",
	url + "r/src/Segment.js",
	url + "r/src/Polygon.js",
	
	url + "r/src/Player.js",
	url + "r/src/PlayerGroup.js",
	url + "r/src/WidgetGroup.js",
	
	url + "r/src/Key.js",
	url + "r/src/cameraControls.js"
);

addEventListener('message', function(e) {
	
	//Real-time traffic from a host
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
	
	if (props.rotated == true) {
		this.model.geometry.size = {
			height:	 25,
			width:	250,
			depth:	 20};
		
		this.boundingBox = {
			max: {x:  875, y:  1000},
			min: {x: -875, y: -1000}};
		
	} else {
		this.model.geometry.size = {
			height:	250,
			width:	 25,
			depth:	 20};
		
		this.boundingBox = {
			max: {x:  1000, y:  875},
			min: {x: -1000, y: -875}};
	}
	
	this.speed = 700;
	
	applyProperties(this, props);
	
	postMessage({
		_func: "createWidget", 
		tempID: this.tempID,
		position: this.position,
		offset: this.offset,
		boundingBox: this.boundingBox,
		model: this.model});
}

Paddle.prototype = Object.create(Widget.prototype);

function Ball(props) {
	Widget.apply(this, [props, true])
	
	this.model.geometry = {
		shape: "IcosahedronGeometry",
		radius: 25,
		detail: 2};
	
	this.collison = 50;
	
	this.boundingBox = {
		max: {x:  1000, y:  1000},
		min: {x: -1000, y: -1000}};
	
	this.speed = 700;
	
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

/**********************************
**	Ball geometry
**********************************/

//Start moving the ball
function ballSlide(timestamp, angle, position) {
	
	var now = position || ball.homePosition;
		next = now.polarOffset(3000, angle);
	
	var nextIntercept = bounds.intercept(new Segment(now, next)),
		cross = timestamp + nextIntercept.uDistance / (ball._slide.speed || ball.speed) * 1000;
	
	if (!nextIntercept) {
		console.log("No intercept?");
		return;
	}
	
	var newContext = {
		timestamp: cross,
		startPosition: now,
		intercept: nextIntercept,
		distance: nextIntercept.uDistance,
		delta: cross - Date.now(),
		cross: cross
	};
	
	bounceTimeout = setTimeout(bounce.bind(newContext), cross - Date.now());
	
	ball.slide({timestamp: timestamp, direction: angle, position: now, speed: ball._slide.speed});
}

//Ball hit a wall, reflect it
function bounce() {
	
	ball.getPosition(this.timestamp);
	
	var wallAngle = this.intercept.segment.u.angleTo(this.intercept.segment.v),
		reflectionAngle = 2*wallAngle - ball._slide.direction;
	
	var walls = [
		 0.5 * Math.PI,		//left
		-0.5 * Math.PI,		//right
		   1 * Math.PI,		//bottom
		   0 * Math.PI];	//top
	
	var which;
	for (var i = 0; i < 4; i++)
		if (Math.abs(wallAngle - walls[i]) < 0.0001) {
			which = i;
			break;
		}
	
	//protect
	if (typeof players[which] == "undefined")
		ballSlide(this.timestamp, reflectionAngle, ball.position.clone());
	else {
		
		console.log("hit at " + this.timestamp);
		console.log("slide at " + paddles[which]._slide.start);
		
		paddles[which].getPosition(this.timestamp);
		if (this.intercept.distance(paddles[which].position) < 125) {
			ball._slide.speed += 25;
			
			var tilt = paddles[which].position.polarOffset(100, walls[which] + Math.PI * .5).angleTo(this.intercept);
			
			var tiltPoint = Point.fromPolar(tilt);
			var reflectionPoint = Point.fromPolar(reflectionAngle);
			
			var anglePoint = new Point((tiltPoint.x + reflectionPoint.x)/2, (tiltPoint.y + reflectionPoint.y)/2);
			
			ballSlide(this.timestamp, anglePoint.toPolar(), ball.position.clone());
		
		//Score!
		} else {
			
			//Freze the ball
			ball.stopSlide({timestamp: this.timestamp});
			
			//Lower hp and twinkle & complete
			players[which].hp--;
			twinkle.call({timestamp: this.timestamp, which: which, count: players[which].hp*2-1});
		}
	}
	
}

/**********************************
**	Scoring
**********************************/

function completeScore(timestamp) {
	
	//Return everything to positions
	for (var i = 0; i < 4; i++) paddles[i].returnHome(this.timestamp);
	ball.returnHome(this.timestamp);
	
	//Grab those woh are still around
	var living = [];
	for (var i = 0; i < players.length; i++)
		if (players[i].hp > 0) living.push(players[i]);
	
	//Multiple players still alive, continue
	if (living.length > 1) startTimeout = setTimeout(start.bind({timestamp: timestamp + 3000}), timestamp - Date.now() + 3000);
	
	//Only one player alive, end
	else win(timestamp, living[0]);
	
}

//Makes a paddle blink a few times then proceeds (either someone has won or we do another round)
function twinkle() {
	
	//If we're done blinking
	if (this.count-- <= 0) {
		
		//Fix color
		paddles[this.which].update({mesh: {material: {color: {b: 1, g: 1}}}});
		
		completeScore(this.timestamp);
	
	//We're not, blink more!
	} else {
		paddles[this.which].update({mesh: {material: {color: {b: this.count%2, g: this.count%2}}}});
		
		var context = {timestamp: this.timestamp + 500, which: this.which, count: this.count};
		twinkleTimeout = setTimeout(twinkle.bind(context), Date.now() - this.timestamp + 500);
	}
}

//Someone won: if there is no one waiting, just continue, otherwise rotate players
function win(timestamp, winner) {
	
	for (var i = 0; i < players.length; i++)
		players[i].hp = 3;
	
	startTimeout = setTimeout(start.bind({timestamp: timestamp + 1000}), timestamp - Date.now() + 1000);
}

/**********************************
**	Round state
**********************************/

//Incremented by .25PI, so we can check ranges for player[1]
var startDirections = [
	[  1 * Math.PI, 1.5 * Math.PI],
	[  0 * Math.PI, 0.5 * Math.PI],
	[1.5 * Math.PI,   2 * Math.PI],
	[0.5 * Math.PI,   1 * Math.PI]];

//Start a round	
function start() {
	
	for (var i = 0; i < 4; i++)
		paddles[i].returnHome(this.timestamp);
	
	ball._slide.speed = ball.speed;
	
	var direction,
		fakeDirection,
		flag = true;
	
	while (flag) {
		direction = Math.random() * Math.PI * 2;
		fakeDirection = (direction + .25 * Math.PI) % (Math.PI * 2);
		for (var i = 0; i < 4; i++)
			if (fakeDirection >= startDirections[i][0] && fakeDirection <= startDirections[i][1] && typeof players[i] != "undefined") {
				flag = false;
				break;
			}
	}
	
	ballSlide(this.timestamp, direction, ball.homePosition);
}

//Stop a round
function stop(timestamp) {
	
	if (partials) {
		partialUpdate.start({
			lPlayer: lPlayer,
			rPlayer: rPlayer,
			lScore: lScore,
			rScore: rScore,
			waitingPlayers: waitingPlayers,
			abort: true,
			timestamp: timestamp
		}, false, players.slice(0, players.length));
	} else startTimeout = setTimeout(start.bind({timestamp: timestamp + 1000}), timestamp - Date.now() + 1000);
	
	playing = false;
	
	clearTimeout(bounceTimeout);
	clearTimeout(checkScoreTimeout);
	clearTimeout(twinkleTimeout);
	clearTimeout(startTimeout);
	
	lScore = 0;
	rScore = 0;
	setText("lScore", 0);
	setText("rScore", 0);
	
	lPaddle.update({mesh: {material: {color: {b: 1, g: 1}}}});
	rPaddle.update({mesh: {material: {color: {b: 1, g: 1}}}});
	
	ball.stopSlide({timestamp: timestamp});
	ball.returnHome(this.timestamp);
}

function secondSync(poll, winner) {
}

function firstSync(poll, winner) {
	
	//Adopt teams if we know nothing or if we aren't playing, in which case the winner was updated player info
	if (state.updated == 0 || !winner.data.playing) {
		players = new PlayerGroup();
		waitingPlayers = new PlayerGroup();
		
		for (var i = 0; i < winner.data.players.length; i++) {
			players.add(Player.all[winner.data.players[i]]);
			players[i].paddle = paddles[i];	}
		
		for (var i = 0; i < winner.data.waitingPlayers.length; i++)
			waitingPlayers.add(Player.all[winner.data.waitingPlayers[i]]);
	}
	
	//Set playing state
	state.playing = winner.data.playing;
	
	//Flag we need a secondSync if playing
	if (state.playing) state.updated = 1;
	
	//Start it if we weren't playing
	else {
		state.updated = 2;
		Math.seedrandom(winner.data.seed);
		startTimeout = setTimeout(start.bind({timestamp: winner.data.timestamp + 5000}), winner.data.timestamp - Date.now() + 5000);
	}
}

/**********************************
***********************************
**	Init
***********************************
**********************************/

/**********************************
**	Globals
**********************************/

var localPlayer	= new Player(_initData.localPlayer);

var state = {
	playing: false,
	updated: 0	};//0 for completely out of date, 1 for partially up to date, 2 for completely up to date

var broadcast		= new EventTarget();
var players			= new PlayerGroup();
var waitingPlayers	= new PlayerGroup();

var firstSyncPoll	= new Poll("firstSync", firstSync, players.slice(0, players.length - 1));
var secondSyncPoll	= new Poll("secondSync", secondSync, players.slice(0, players.length - 1));

var startTimeout;
var bounceTimeout;
var twinkleTimeout;

disableCameraPan();

//Draft everyone into waitingPlayers
for (var i = 0; i < _initData.players.length; i++)
	if (_initData.players[i] == _initData.localPlayer) waitingPlayers.add(localPlayer);
	else waitingPlayers.add(new Player(_initData.players[i]));
	
/**********************************
**	Global objects
**********************************/

var paddles = new WidgetGroup([
	new Paddle({homePosition: new Point(-1000,     0), rotated: false}),
	new Paddle({homePosition: new Point( 1000,     0), rotated: false}),
	new Paddle({homePosition: new Point(    0, -1000), rotated: true}),
	new Paddle({homePosition: new Point(    0,  1000), rotated: true})]);

var ball = new Ball({homePosition: new Point(0, 0)});

var bounds = new Polygon({vertices: [
	new Point(-1000,  1000),
	new Point( 1000,  1000),
	new Point( 1000, -1000),
	new Point(-1000, -1000)]});

//White part...
var outline = new Widget({
	model: {geometry: {size: {width: 2050, height: 2050, depth: 200}}},
	position: {z: -110}
});

//Black part (creates a 
var outline2 = new Widget({
	model: {
		geometry: {size: {width: 2025, height: 2025, depth: 1}},
		material: {color: "black"}
	}, position: {z: -10}
});

/**********************************
**	UI
**********************************/
/*
addHTML([
	{tag: "div", id: "panel", children: [
		{tag: "div", id: "header", children: [
			{tag: "span", id: "lPlayer", class: "player", text: "null"}, 
			{tag: "span", id: "lScore", class: "score", text: 0},
			{tag: "span", text: " vs. "},
			{tag: "span", id: "rPlayer", class: "player", text: "null"},
			{tag: "span", id: "rScore", class: "score", text: 0}]},
		{tag: "div", id: "queue"}]},
	{tag: "style", rules:
		[{id: "panel", position: "absolute", right: "1em", top: "1em"},
		{id: "panel", selector: ".score:before", content: "\" (\""},
		{id: "panel", selector: ".score:after", content: "\")\""}]}
]);
*/
/**********************************
**	Some player stuff
**********************************/

//Only one person in the game, which means we are a player, but don't start the game...
if (waitingPlayers.length == 1) {
	
	var length = players.add(waitingPlayers.splice(0, 1)[0]);
	players[length - 1].paddle = paddles[length - 1];
	
	delete length;
	
	state.updated = 2;
	
//We were here at the beginning, so draft the first four and start!
} else if (_initData.start) {
	
	//Draft our players
	var length;
	for (var i = 0; i < waitingPlayers.length && players.length < 4;) {
		length = players.add(waitingPlayers.splice(0, 1)[0]);
		players[length - 1].paddle = paddles[length - 1];
	}
	delete length;
	
	//Update state
	state.updated = 2;
	
	//Set everyone' HP to 3
	for (var i = 0; i < players.length; i++)
		players[i].hp = 3;
	
	//Setup our seed and start the game
	Math.seedrandom(_initData.seed);
	startTimeout = setTimeout(start.bind({timestamp: _initData.timestamp + 5000}), _initData.timestamp - Date.now() + 5000);
	
//We joined, which means we're confused as fuck about what's going on
} else {
	
}

/**********************************
***********************************
**	Broadcasting
***********************************
**********************************/

broadcast.on("keydown", function(e) {
	var player = players[e.account];
	if (!player) return;
	
	if (player.paddle.rotated) {
		if (e.which == 37) player.paddle.slide({timestamp: e.timestamp, direction: Math.PI});
		else if (e.which == 39) player.paddle.slide({timestamp: e.timestamp, direction: 0});
	} else {
		if (e.which == 38) player.paddle.slide({timestamp: e.timestamp, direction: Math.PI * 0.5});
		else if (e.which == 40) player.paddle.slide({timestamp: e.timestamp, direction: Math.PI * 1.5});
	}
});

broadcast.on("keyup", function(e) {
	var player = players[e.account];
	if (!player) return;
	
	if (player.paddle.rotated) {
		if (e.which == 37) player.paddle.stopSlide({timestamp: e.timestamp, direction: Math.PI});
		else if (e.which == 39) player.paddle.stopSlide({timestamp: e.timestamp, direction: 0});
	} else {
		if (e.which == 38) player.paddle.stopSlide({timestamp: e.timestamp, direction: Math.PI * 0.5});
		else if (e.which == 40) player.paddle.stopSlide({timestamp: e.timestamp, direction: Math.PI * 1.5});
	}
});

/**********************************
***********************************
**	Hooking (passive & active)
***********************************
**********************************/

local.on("keydown", function(e) {
	if (!e.firstDown) return;
	if (!players.has(localPlayer)) return;
	
	if (localPlayer.paddle.rotated) {
		if (e.which == 37 || e.which == 39)
			postMessage({
				_func:	"broadcast",
				sid:	"keydown",
				which:	e.which});
	} else {
		if (e.which == 38 || e.which == 40)
			postMessage({
				_func:	"broadcast",
				sid:	"keydown",
				which:	e.which});
	}
});

local.on("keyup", function(e) {
	if (!players.has(localPlayer)) return;
	
	if (localPlayer.paddle.rotated) {
		if (e.which == 37 || e.which == 39)
			postMessage({
				_func:	"broadcast",
				sid:	"keyup",
				which:	e.which});
	} else {
		if (e.which == 38 || e.which == 40)
			postMessage({
				_func:	"broadcast",
				sid:	"keyup",
				which:	e.which});
	}
});

host.on("onBroadcast", function(e) {
	broadcast.fire(e.sid, e);
});

//Someone has joined mid-game
host.on("onJoin", function(e) {
	
	//Create out players
	var newPlayers = [];
	for (var i = 0; i < e.accounts.length; i++)
		newPlayers.push(new Player(e.accounts[i]));
	
	//We know jack shit, we aren't helpful
	if (state.updated == 0) return;
	
	//Get the dudes that already know shit
	var originalPlayers = PlayerGroup.fromGroups(players, waitingPlayers);
	
	//Loop through the new kids
	for (var i = 0; i < newPlayers.length; i++)
		
		//If not a full game, add them
		if (!state.playing && players.length < 4) {
			length = players.add(newPlayers[i]);
			players[length - 1].paddle = paddles[length - 1];
			paddles[length - 1].player = players[length - 1];	}
		
		//Else just add them to the list
		else waitingPlayers.add(newPlayers);
	
	//Let's get the teams simplified down to player accounts (so we don't have circular functions)
	var playersNames = [];
	for (var i = 0; i < players.length; i++)
		playersNames.push(players[i].account);
	
	var waitingPlayersNames = [];
	for (var i = 0; i < waitingPlayers.length; i++)
		waitingPlayersNames.push(waitingPlayers[i].account);
	
	//And start the poll
	firstSyncPoll.start({
		players: playersNames,
		waitingPlayers: waitingPlayersNames,
		playing: state.playing,
		timestamp: e.timestamp,
		seed: e.seed
	}, false, originalPlayers);
});

host.on("onLeave", function(e) {
	var index = players.indexOf(e.account);
	
	if (index >= 0) {
		return;
	}
	
	index = waitingPlayers.indexOf(e.account);
	waitingPlayers.splice(index, 1);
	
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
