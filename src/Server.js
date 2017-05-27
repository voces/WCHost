
const WebSocket = require( "ws" );
const dateformat = require( "dateformat" );

const Collection = require( "./Collection" );
const Client = require( "./server/Client" );
const UTIL = require( "./util" );

class Server {

	constructor( config, nova ) {

		this.config = config;

		this.preclients = new Collection();
		// this.preclients.key = "lowerAccount";

		this.clients = new Collection();
		this.clients.key = "lowerAccount";
		this.send = function ( message ) {

			message = JSON.stringify( message );
			for ( let i = 0; i < this.length; i ++ )
				this[ i ].send( message );

		};

		this.lobbies = new Collection();
		this.lobbies.key = "lowerName";

		this.protocols = new Collection();
		this.clients.key = "lowerPath";

		this.nova = nova;

		this.wss = new WebSocket.Server( config );
		this.wss.on( "connection", socket => this.clients.add( new Client( socket, this ) ) );

		// this.pinger = new setInterval( this.pingFunc.bind( this ), 1000 );

		this.log( "Server started" );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.bcyan, ...args, UTIL.colors.default );

	}

}

//Expose Server class
module.exports = Server;
