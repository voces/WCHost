/*{
	"title": "Pong",
	"author": "Chakra",
	"date": "2014-08-09",
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
	url + "r/src/Polygon.js"
);

//Player data we already have
var players		= _initData.players;
var localPlayer	= _initData.localPlayer;

addEventListener( "message", function ( e ) {

	//Real-time traffic from a host
	if ( e.data.type == "host" )
		host.fire( e.data.data.id, e.data.data );

	else if ( e.data.type == "local" )
		local.fire( e.data.data.id, e.data.data );

	//Some other type of traffic not yet programmed
	else console.log( "uncoded data type" );

}, false );

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

function Paddle( props ) {

	Widget.apply( this, [ props, true ] );

	this.model.geometry.size = {
		height: 250,
		width: 25,
		depth: 25
	};

	this.pathingmap = [
		{ x: - 0.5, y: - 2.5 },
		{ x: - 0.5, y: 2.5 },
		{ x: 0.5, y: - 2.5 },
		{ x: 0.5, y: 2.5 }
	];

	this.boundingBox = {
		max: { x: NaN, y: 475 },
		min: { x: NaN, y: - 475 }
	};

	this.speed = 500;

	applyProperties( this, props );

	postMessage( {
		_func: "createWidget",
		tempID: this.tempID,
		position: this.position,
		offset: this.offset,
		boundingBox: this.boundingBox,
		model: this.model
	} );

}

Paddle.prototype = Object.create( Widget.prototype );

function Ball( props ) {

	Widget.apply( this, [ props, true ] );

	this.model.geometry = {
		shape: "IcosahedronGeometry",
		radius: 25,
		detail: 2
	};

	this.collison = 50;

	this.boundingBox = {
		max: { x: 712.5, y: 600 },
		min: { x: - 712.5, y: - 600 }
	};

	this.speed = 500;

	applyProperties( this, props );

	postMessage( {
		_func: "createWidget",
		tempID: this.tempID,
		position: this.position,
		offset: this.offset,
		boundingBox: this.boundingBox,
		model: this.model
	} );

}

Ball.prototype = Object.create( Widget.prototype );

/**********************************
***********************************
**	Functions
***********************************
**********************************/

//Checks if a specific user is one of our players
function isPlaying( account ) {

	return account != null && ( lPlayer == account || rPlayer == account );

}

//Updates our local player variable, removes them from waitingPlayers (if applicable), and updates UI
function setPlayer( which, account ) {

	if ( which == "left" ) {

		lPlayer = account;
		setText( "lPlayer", account );

	} else if ( which == "right" ) {

		rPlayer = account;
		setText( "rPlayer", account );

	}

	var index = waitingPlayers.indexOf( account );
	if ( index >= 0 ) {

		waitingPlayers.splice( index, 1 );
		removeElement( "wPlayer_" + account );

	}

}

/**********************************
**	Ball geometry
**********************************/

//Reflects the ball, which includes actually reflecting it and calculating when it'll hit something again
function reflect( normal, context, speedIncrease ) {

	ball.setPosition( { position: context.intercept } );

	var speed = ball._slide.speed;
	if ( speedIncrease )
		speed += 20;

	var direction = ( normal - ball._slide.direction ) % ( 2 * Math.PI );
	if ( direction < 0 ) direction += ( 2 * Math.PI );

	var now = new Point( ball.position.x, ball.position.y );
	next = now.polarOffset( 2000, direction );

	var nextIntercept = bounds.intercept( new Segment( now, next ) ),
		cross = context.timestamp + nextIntercept.uDistance / speed * 1000;

	if ( nextIntercept == false ) {

		console.log( "ERROR?", nextIntercept );
		return;

	}

	var newContext = {
		timestamp: cross,
		intercept: nextIntercept,
		distance: nextIntercept.uDistance,
		delta: cross - Date.now(),
		cross: cross
	};

	if ( Math.abs( nextIntercept.x.toFixed( 5 ) ) == 712.5 )
		checkScoreTimeout = setTimeout( checkScore.bind( newContext ), cross - Date.now() );
	else
		bounceTimeout = setTimeout( bounce.bind( newContext ), cross - Date.now() );

	ball.slide( {
		timestamp: context.timestamp,
		direction: direction,
		speed: speed
	} );

}

//Ball hit a side, check if the paddle reflected or if a user scored
function checkScore() {

	//rScore
	ball.getPosition( this.timestamp );

	if ( ball.position.x > 0 ) {

		rPaddle.getPosition( this.timestamp );
		if ( Math.abs( rPaddle.position.y - ball.position.y ) < 150 )
			reflect( Math.PI, this, true );
		else {

			setText( "lScore", ++ lScore );
			ball.stopSlide( { timestamp: this.timestamp } );
			rPaddle.update( { mesh: { material: { color: { b: 0, g: 0 } } } } );

			twinkleTimeout = setTimeout( twinkle.bind( { timestamp: this.timestamp + 300, which: rPaddle, count: 0 } ), Date.now() - this.timestamp + 300 );

		}

	//lScore

	} else {

		lPaddle.getPosition( this.timestamp );
		if ( Math.abs( lPaddle.position.y - ball.position.y ) < 150 )
			reflect( Math.PI, this, true );
		else {

			setText( "rScore", ++ rScore );
			ball.stopSlide( { timestamp: this.timestamp } );
			lPaddle.update( { mesh: { material: { color: { b: 0, g: 0 } } } } );

			twinkleTimeout = setTimeout( twinkle.bind( { timestamp: this.timestamp + 300, which: lPaddle, count: 0 } ), Date.now() - this.timestamp + 300 );

		}

	}

}

//Ball hit a wall, reflect it
function bounce() {

	reflect( 0, this );

}

/**********************************
**	Scoring
**********************************/

function completeScore( timestamp ) {

	if ( partials ) {

		partialUpdate.start( {
			lScore: lScore,
			rScore: rScore,
			abort: false,
			timestamp: timestamp
		}, false, players.slice( 0, players.length ) );

		return;

	}

	//Position everything
	ball.setPosition( { position: { x: 0, y: 0 } } );
	lPaddle.setPosition( { position: { x: - 750, y: 0 }, timestamp: timestamp } );
	rPaddle.setPosition( { position: { x: 750, y: 0 }, timestamp: timestamp } );

	//Call win if someone has won
	if ( lScore >= 3 ) win( timestamp, lPlayer );
	else if ( rScore >= 3 ) win( timestamp, rPlayer );

	//No winners, another round
	else startTimeout = setTimeout( start.bind( { timestamp: timestamp + 3000 } ), timestamp - Date.now() + 3000 );

}

//Makes a paddle blink a few times then proceeds (either someone has won or we do another round)
function twinkle() {

	//If we're done blinking
	if ( this.count++ > 3 ) {

		//Fix color
		this.which.update( { mesh: { material: { color: { b: 1, g: 1 } } } } );

		completeScore( this.timestamp );

	//We're not, blink more!

	} else {

		this.which.update( { mesh: { material: { color: { b: this.count % 2, g: this.count % 2 } } } } );
		twinkleTimeout = setTimeout( twinkle.bind( { timestamp: this.timestamp + 300, which: this.which, count: this.count } ), Date.now() - this.timestamp + 300 );

	}

}

//Someone won: if there is no one playing, just continue, otherwise rotate players
function win( timestamp, winner ) {

	if ( waitingPlayers.length == 0 ) {

		startTimeout = setTimeout( start.bind( { timestamp: timestamp + 1000 } ), timestamp - Date.now() + 1000 );
		return;

	}

	lScore = 0;
	rScore = 0;
	setText( "lScore", 0 );
	setText( "rScore", 0 );

	var toRemove;
	if ( winner == lPlayer ) {

		toRemove = rPlayer;
		setPlayer( "right", waitingPlayers[ 0 ] );

	} else {

		toRemove = lPlayer;
		setPlayer( "left", waitingPlayers[ 0 ] );

	}

	waitingPlayers.push( toRemove );
	addHTML( {
		id: "wPlayer_" + toRemove.replace( /#/g, "&35;" ),
		tag: "div",
		parent: "queue",
		text: toRemove
	} );

	startTimeout = setTimeout( start.bind( { timestamp: timestamp + 1000 } ), timestamp - Date.now() + 1000 );

}

/**********************************
**	Round state
**********************************/

function ballSlide( timestamp, angle, position ) {

	var now = new Point( 0, 0 );
	next = now.polarOffset( 2000, angle );

	var nextIntercept = bounds.intercept( new Segment( now, next ) ),
		cross = timestamp + nextIntercept.uDistance / ball.speed * 1000;

	var newContext = {
		timestamp: cross,
		intercept: nextIntercept,
		distance: nextIntercept.uDistance,
		delta: cross - Date.now(),
		cross: cross
	};

	if ( Math.abs( nextIntercept.x.toFixed( 5 ) ) == 712.5 )
		checkScoreTimeout = setTimeout( checkScore.bind( newContext ), cross - Date.now() );
	else
		bounceTimeout = setTimeout( bounce.bind( newContext ), cross - Date.now() );

	ball.slide( { timestamp: timestamp, direction: angle, position: position } );

}

//Start a round
function start() {

	lPaddle.setPosition( { position: { x: - 750, y: 0 }, timestamp: this.timestamp } );
	rPaddle.setPosition( { position: { x: 750, y: 0 }, timestamp: this.timestamp } );

	playing = true;

	ballSlide( this.timestamp, Math.random() * Math.random() * ( Math.random() * 2 - 1 ) * Math.PI + ( Math.random() > .5 ? 0 : Math.PI ), { x: 0, y: 0 } );

}

//Stop a round
function stop( timestamp ) {

	if ( partials ) {

		partialUpdate.start( {
			lPlayer: lPlayer,
			rPlayer: rPlayer,
			lScore: lScore,
			rScore: rScore,
			waitingPlayers: waitingPlayers,
			abort: true,
			timestamp: timestamp
		}, false, players.slice( 0, players.length ) );

	} else startTimeout = setTimeout( start.bind( { timestamp: timestamp + 1000 } ), timestamp - Date.now() + 1000 );

	playing = false;

	clearTimeout( bounceTimeout );
	clearTimeout( checkScoreTimeout );
	clearTimeout( twinkleTimeout );
	clearTimeout( startTimeout );

	lScore = 0;
	rScore = 0;
	setText( "lScore", 0 );
	setText( "rScore", 0 );

	lPaddle.update( { mesh: { material: { color: { b: 1, g: 1 } } } } );
	rPaddle.update( { mesh: { material: { color: { b: 1, g: 1 } } } } );

	ball.stopSlide( { timestamp: timestamp } );
	ball.setPosition( { position: { x: 0, y: 0 }, timestamp: timestamp } );

}

function finishSync( poll, winner ) {

	if ( ! winner ) throw "Got a problem here...";

	partials = false;
	partial = false;

	lScore = winner.data.lScore;
	rScore = winner.data.rScore;
	setText( "lScore", lScore );
	setText( "rScore", rScore );

	if ( winner.data.abort ) {

		waitingPlayers = winner.data.waitingPlayers;
		setPlayer( "left", winner.data.lPlayer );
		setPlayer( "right", winner.data.rPlayer );

		stop( winner.data.timestamp );
		startTimeout = setTimeout( start.bind( { timestamp: winner.data.timestamp + 3000 } ), Date.now() - winner.data.timestamp + 3000 );

	} else completeScore( winner.data.timestamp );

}

//Sync data for everyone
function sync( poll, winner ) {

	if ( ! winner ) throw "Got a problem here...";

	updated = true;

	emptyElement( "queue" );

	waitingPlayers = winner.data.waitingPlayers;
	setPlayer( "left", winner.data.lPlayer );
	setPlayer( "right", winner.data.rPlayer );

	lScore = winner.data.lScore;
	rScore = winner.data.rScore;
	setText( "lScore", lScore );
	setText( "rScore", rScore );

	var html = [];

	for ( var i = 0; i < waitingPlayers.length; i ++ )
		html.push( {
			id: "wPlayer_" + waitingPlayers[ i ].replace( /#/g, "&35;" ),
			tag: "div",
			parent: "queue",
			text: waitingPlayers[ i ]
		} );

	addHTML( html );

	Math.seedrandom( winner.data.start );

	//If we're not playing, start it
	if ( ! winner.data.playing ) {

		var difference = Date.now() - winner.data.start + 3000;
		startTimeout = setTimeout( start.bind( { timestamp: winner.data.start + 3000 } ), difference );

	} else {

		if ( ! playing ) partial = true;
		partials = true;

	}

	playing = winner.data.playing;

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

var lScore = 0;
var rScore = 0;

var waitingPlayers = players.slice();

var playing = false;
var updated = false;
var partials = false;
var partial = false;

var update = new Poll( "update", sync, players.slice( 0, players.length - 1 ) );
var partialUpdate = new Poll( "partial", finishSync, players.slice( 0, players.length - 1 ) );

var bounceTimeout;
var checkScoreTimeout;
var twinkleTimeout;
var startTimeout;

/**********************************
**	Global objects
**********************************/

var lPaddle = new Paddle( { position: { x: - 750 } } );
var rPaddle = new Paddle( { position: { x: 750 } } );
var ball = new Ball();

var bounds = new Polygon( { vertices: [
	new Point( - 712.5, 600 ),
	new Point( 712.5, 600 ),
	new Point( 712.5, - 600 ),
	new Point( - 712.5, - 600 ) ] } );

//White part...
var outline = new Widget( {
	model: { geometry: { size: { width: 1550, height: 1250, depth: 200 } } },
	position: { z: - 113 }
} );

//Black part (creates a
var outline2 = new Widget( {
	model: {
		geometry: { size: { width: 1525, height: 1200, depth: 1 } },
		material: { color: "black" }
	}, position: { z: - 0.5 }
} );

/**********************************
**	UI
**********************************/

addHTML( [
	{ tag: "div", id: "panel", children: [
		{ tag: "div", id: "header", children: [
			{ tag: "span", id: "lPlayer", class: "player", text: "null" },
			{ tag: "span", id: "lScore", class: "score", text: 0 },
			{ tag: "span", text: " vs. " },
			{ tag: "span", id: "rPlayer", class: "player", text: "null" },
			{ tag: "span", id: "rScore", class: "score", text: 0 } ] },
		{ tag: "div", id: "queue" } ] },
	{ tag: "style", rules:
	[ { id: "panel", position: "absolute", right: "1em", top: "1em" },
		{ id: "panel", selector: ".score:before", content: "\" (\"" },
		{ id: "panel", selector: ".score:after", content: "\")\"" } ] }
] );

/**********************************
**	Some player stuff
**********************************/

//This is the only case we know and it means we are the first player in the game
if ( waitingPlayers.length == 1 ) {

	setPlayer( "left", waitingPlayers.splice( 0, 1 )[ 0 ] );
	this.updated = true;

} else if ( _initData.start ) {

	setPlayer( "left", waitingPlayers.splice( 0, 1 )[ 0 ] );
	setPlayer( "right", waitingPlayers.splice( 0, 1 )[ 0 ] );

	Math.seedrandom( _initData.timestamp );

	this.updated = true;
	startTimeout = setTimeout( start.bind( { timestamp: _initData.timestamp + 3000 } ), Date.now() - _initData.timestamp + 3000 );

} else {

	var html = [];

	for ( var i = 0; i < waitingPlayers.length; i ++ )
		html.push( {
			id: "wPlayer_" + waitingPlayers[ i ].replace( /#/g, "&35;" ),
			tag: "div",
			parent: "queue",
			text: waitingPlayers[ i ]
		} );

	addHTML( html );

}

/**********************************
***********************************
**	Broadcasting
***********************************
**********************************/

broadcast.on( "keydown", function ( e ) {

	var paddle;
	if ( e.account == lPlayer )
		paddle = lPaddle;
	else if ( e.account == rPlayer )
		paddle = rPaddle;

	if ( ! paddle ) return;

	if ( e.which == 38 )
		paddle.slide( { timestamp: e.timestamp, direction: Math.PI * 0.5 } );
	else if ( e.which == 40 )
		paddle.slide( { timestamp: e.timestamp, direction: Math.PI * 1.5 } );

} );

broadcast.on( "keyup", function ( e ) {

	var paddle;
	if ( e.account == lPlayer )
		paddle = lPaddle;
	else if ( e.account == rPlayer )
		paddle = rPaddle;

	if ( ! paddle ) return;

	if ( e.which == 38 )
		paddle.stopSlide( { timestamp: e.timestamp, direction: Math.PI * 0.5 } );
	else if ( e.which == 40 )
		paddle.stopSlide( { timestamp: e.timestamp, direction: Math.PI * 1.5 } );

} );

/**********************************
***********************************
**	Hooking (passive & active)
***********************************
**********************************/

local.on( "keydown", function ( e ) {

	if ( ! isPlaying( localPlayer ) ) return;

	if ( e.which == 38 && e.firstDown ) {

		postMessage( {
			_func:	"broadcast",
			sid:	"keydown",
			which:	38
		} );

	}	else if ( e.which == 40 && e.firstDown ) {

		postMessage( {
			_func:	"broadcast",
			sid:	"keydown",
			which:	40
		} );

	}

} );

local.on( "keyup", function ( e ) {

	if ( ! isPlaying( localPlayer ) ) return;

	if ( e.which == 38 ) {

		postMessage( {
			_func:	"broadcast",
			sid:	"keyup",
			which:	38
		} );

	}	else if ( e.which == 40 ) {

		postMessage( {
			_func:	"broadcast",
			sid:	"keyup",
			which:	40
		} );

	}

} );

host.on( "onBroadcast", function ( e ) {

	broadcast.fire( e.sid, e );

} );

//Users who join mid-game
host.on( "onJoin", function ( e ) {

	players = players.concat( e.accounts );

	waitingPlayers = waitingPlayers.concat( e.accounts );

	if ( updated ) {

		if ( lPlayer == null )
			setPlayer( "left", waitingPlayers.splice( 0, 1 )[ 0 ] );
		else if ( rPlayer == null )
			setPlayer( "right", waitingPlayers.splice( 0, 1 )[ 0 ] );

		update.start( {
			lPlayer: lPlayer,
			rPlayer: rPlayer,
			lScore: lScore,
			rScore: rScore,
			waitingPlayers: waitingPlayers,
			playing: playing,
			start: e.timestamp
		}, false, players.slice( 0, players.length - 1 ) );

	}

	var html = [];

	for ( var i = 0; i < e.accounts.length; i ++ )
		if ( e.accounts[ i ] != lPlayer && e.accounts[ i ] != rPlayer )
			html.push( {
				id: "wPlayer_" + e.accounts[ i ].replace( /#/g, "&35;" ),
				tag: "div",
				parent: "queue",
				text: e.accounts[ i ]
			} );

	if ( html.length ) addHTML( html );

} );

host.on( "onLeave", function ( e ) {

	var index = players.indexOf( e.account );
	players.splice( index, 1 );

	if ( e.account == lPlayer ) {

		setPlayer( "left", waitingPlayers[ 0 ] || null );
		stop( e.timestamp );

	} else if ( e.account == rPlayer ) {

		setPlayer( "right", waitingPlayers[ 0 ] || null );
		stop( e.timestamp );

	} else {

		index = waitingPlayers.indexOf( e.account );

		if ( index >= 0 ) {

			waitingPlayers.splice( index, 1 );
			removeElement( "wPlayer_" + e.account );

		}

	}

} );
