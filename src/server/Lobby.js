
const cp = require( "child_process" );

// const { VM } = require( "vm2" );
const dateformat = require( "dateformat" );

const Collection = require( "../Collection" );
const UTIL = require( "../util" );

class Lobby {

	constructor( host, name, owner ) {

		this.host = host;
		this.server = host.server;
		this.nova = host.nova;

		this.name = name;
		this.lowerName = name.toLowerCase();
		this.ownerAccount = owner;

		this.clients = new Collection();
		this.clients.key = "lowerAccount";

		this.sandbox = cp.fork( "src/server/lobby/sandbox" );
		this.sandbox.on( "message", msg => this.sandboxReceive( msg ) );

		this.log( "Reserved lobby for", owner );

		this.timeout = setTimeout( () => this.destroy(), 300000 );

	}

	get protocol() {

		return this._protocol;

	}

	set protocol( value ) {

		this._protocol = value;

		this.log( "Protocol set to", value.path );

		this.nova.send( {
			id: "update",
			name: this.name,
			protocol: this.protocol.name,
			date: this.protocol.date,
			version: this.protocol.version,
			preview: this.protocol.preview,
			author: this.protocol.authorw
		} );

		this.send( { id: "onProtocol", protocol: value } );

		this.sandboxProtocol( value.script );

	}

	destroy() {

		this.nova.send( { id: "unreserve", name: this.name } );

		this.sandboxSend( { id: "destroy" } );

		for ( let i = 0; i < this.clients.length; i ++ )
			this.removeClient( this.clients[ i ], true );

		this.server.lobbies.remove( this );

		this.log( "Lobby unreserved" );

	}

	//////////////////////////////////////////////
	//	Client handling
	//////////////////////////////////////////////

	addClient( client ) {

		clearTimeout( this.timeout );

		this.sandboxSend( { id: "onJoin", accounts: [ client.account ] } );

		this.clients.add( client );

		// client.send( {
		// 	id: "onJoin",
		// 	lobby: this.name,
		// 	// accounts: this.clients.map( client => client.account ),
		// 	protocol: this.protocol
		// 	// owner: this.ownerAccount,
		// 	// isOwner: ( this.ownerAccount.toLowerCase() === client.lowerAccount )
		// } );

	}

	removeClient( client, silent ) {

		if ( this.clients.length <= 1 ) {

			this.timeout = setTimeout( () => this.destroy(), 300000 );

			this.log( "Removed user from lobby, auto destruct enabled" );

		} else this.log( "Removed user from lobby" );

		if ( silent !== true )
			this.sandboxSend( { id: "onLeave", accounts: [ client.account ] } );

		this.clients.remove( client );
		client.lobby = null;

	}

	//////////////////////////////////////////////
	//	Nova listings
	//////////////////////////////////////////////

	unlist() {

		this.nova.send( { id: "unlist", name: this.name } );

	}

	relist() {

		this.nova.send( { id: "relist", name: this.name } );

	}

	unreserve() {

		this.nova.send( { id: "unreserve", name: this.name } );

	}

	//////////////////////////////////////////////
	//	Primary support
	//////////////////////////////////////////////

	sandboxSend( data ) {

		this.sandbox.send( { id: "send", data } );

	}

	sandboxProtocol( data ) {

		this.sandbox.send( { id: "protocol", data } );

	}

	sandboxReceive( data ) {

		switch ( data.id ) {

			case "destroy": return this.destroy();
			case "removeClient": return this.removeClient( this.clients.dict[ data.client.toLowerCase() ] );
			case "unlist": return this.unlist();
			case "relist": return this.relist();
			case "unreserve": return this.unreserve();
			case "protocol": return this.protocol = this.server.protocols.dict[ data.path.toLowerCase() ];
			case "broadcast": return this.send( data );
			default: this.error( "Unknown message from sandbox", data );

		}

	}

	send( packet ) {

		if ( typeof packet !== "object" ) packet = { id: "broadcast", data: packet };
		else packet.id = "broadcast";

		packet.lobby = this.name;
		packet.timestamp = Date.now();

		const data = JSON.stringify( packet );

		for ( let i = 0; i < this.clients.length; i ++ )
			this.clients[ i ].send( data );

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.magenta, this.name, ...args, UTIL.colors.default );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.bmagenta, this.name, ...args, UTIL.colors.default );

	}

}

//Expose Lobby class
module.exports = Lobby;
