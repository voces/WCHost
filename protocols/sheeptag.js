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
	url + "r/src/Unit.js",
	url + "r/src/host.js",
	url + "r/src/Poll.js",
	url + "r/src/Point.js",
	url + "r/src/Segment.js",
	url + "r/src/Polygon.js",
	url + "r/src/TileMap.js",
	
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

function Sheep() {
	Unit.apply(this, [props]);
	
	applyProperties(this, props);
}

Sheep.prototype = Object.create(Unit.prototype);

/**********************************
***********************************
**	Functions
***********************************
**********************************/

function secondSync(poll, winner) {
}

function firstSync(poll, winner) {
	
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
