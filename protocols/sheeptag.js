/*{
	"title": "Sheep Tag",
	"author": "Chakra",
	"date": "2014-11-28",
	"version": 0,
	"description": "An attempt to create WC3 Sheep Tag on Nova...",
	"preview": {
		"medium": "r/img/stMedium.jpg"
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

/**********************************
***********************************
**	Functions
***********************************
**********************************/

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

//Draft everyone into waitingPlayers
for (var i = 0; i < _initData.players.length; i++)
	if (_initData.players[i] == _initData.localPlayer) waitingPlayers.add(localPlayer);
	else waitingPlayers.add(new Player(_initData.players[i]));
	
/**********************************
**	Global objects
**********************************/


/**********************************
**	UI
**********************************/


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
	
	//Update state
	state.updated = 2;
	
	//Setup our seed and start the game
	Math.seedrandom(_initData.seed);
	
	
//We joined, which means we're confused as fuck about what's going on
} else {
	
}

/**********************************
***********************************
**	Broadcasting - these are incoming broadcasts, meaning we execute
***********************************
**********************************/

broadcast.on("keydown", function(e) {
	
});

broadcast.on("keyup", function(e) {
	
});

/**********************************
***********************************
**	Hooking (passive & active)
***********************************
**********************************/

local.on("keydown", function(e) {
	if (!e.firstDown) return;	//Only send out initial key-presses
	if (!players.has(localPlayer)) return;	//Only send if we are in the game
	
	
});

local.on("keyup", function(e) {
	if (!players.has(localPlayer)) return;	//Only send if we are in the game
	
});

/**********************************
**	Host
**********************************/

//Out general broadcast hook
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
