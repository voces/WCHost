
const path = require( "path" );
const util = require( "util" );

const dateformat = require( "dateformat" );

const db = require( "../db" );
const config = require( "../../config" );
const UTIL = require( "../util" );

class Client {

	constructor( socket, server ) {

		this.server = server;
		this.socket = socket;

		this.remoteAddress = socket._socket.remoteAddress;
		this.remotePort = socket._socket.remotePort;

		this.account = undefined;
		this.mode = "normal";
		this.lobby = undefined;
		this.access = config.access.default;

		this.socket.on( "message", data => this.receive( data ) );
		this.socket.on( "close", data => this.close( data ) );
		this.socket.on( "error", data => this.error( data ) );

		this.storedAddress = this.address();

		this.type = "ws";

		this.log( "Connected" );

	}

	//////////////////////////////////////////////
	//	Event Managers
	//////////////////////////////////////////////

	receive( data ) {

		if ( typeof data === "object" && data instanceof Buffer )
			data = data.toString();

		let packet;

		try {

			packet = JSON.parse( data );

		} catch ( err ) {

			return this.send( { id: "invalid", level: 0, account: this.account, data } );

		}

		this.log( "[RECV]", packet );

			//Packets come in as two categories (online and offline)
		if ( ! this.account ) {

			switch ( packet.id ) {

					// Account
				case "key": return this.key( packet );

				default: return this.send( { id: "invalid", level: 1, account: this.account, data: packet } );

			}

		}

		switch ( packet.id ) {

				// Lobby
			case "lobby": return this.joinLobby( packet );
			case "leave": return this.leave( packet );

				// Communication
			case "broadcast": return this.broadcast( packet );
			case "echo": return this.echo( packet );
			case "sync": return this.sync( packet );

				// Hosting
			case "unlist": return this.unlist( packet );
			case "relist": return this.relist( packet );
			case "unreserve": return this.unreserve( packet );

				// Commands
			case "protocol": return this.setProtocol( packet );
			case "getProtocols": return this.getProtocols( packet );

				// Misc
			case "js": return this.js( packet );

			default: return this.send( { id: "invalid", level: 2, account: this.account, data: packet } );

		}

	}

	close() {

		this.log( "Disconnected" );

		if ( this.lobby ) this.lobby.removeClient( this );

		this.server.clients.remove( this );

	}

	//////////////////////////////////////////////
	//	Authentication
	//////////////////////////////////////////////

	async key( packet ) {

		const preclient = this.server.preclients.dict[ packet.key ];

		if ( ! preclient )
			return this.send( { id: "onKeyFail", reasonCode: 62, reason: "Provided key does not match anything.", data: packet } );

		this.account = preclient.account;
		this.lowerAccount = this.account.toLowerCase();

		if ( packet.lobby ) setImmediate( () => this.joinLobby( { name: packet.lobby } ) );
		else if ( preclient.lobby ) setImmediate( () => this.joinLobby( { name: preclient.lobby } ) );

		// Remove from preclients
		if ( preclient.timeout ) clearTimeout( preclient.timeout );
		preclient.fullfilled();

		this.log( "Client authenticated" );

		// Update clients
		this.server.clients.dict[ this.lowerAccount ] = this;

		const user = ( await db.query( "SELECT access FROM users WHERE name = ?;", [ this.account ] ) )[ 0 ];

		if ( user ) UTIL.merge( this.access, JSON.parse( user.access ) );

		this.send( { id: "onKey", account: this.account, access: this.access } );

	}

	//////////////////////////////////////////////
	//	Lobby
	//////////////////////////////////////////////

	joinLobby( packet ) {

		if ( typeof packet.name !== "string" )
			return this.send( { id: "onLobbyFail", reasonCode: 48, reason: "Lobby not provided.", data: packet } );

		const lobby = this.server.lobbies.dict[ packet.name.toLowerCase() ];

		if ( ! lobby )
			return this.send( { id: "onLobbyFail", reasonCode: 47, reason: "Provided lobby does not exist.", data: packet } );

		if ( lobby.clients.includes( this ) )
			return this.send( { id: "onLobbyFail", reasonCode: 46, reason: "Client already in provided lobby.", data: packet } );

		this.lobby = lobby;
		lobby.addClient( this );

		this.send( { id: "onLobby", lobby: lobby.name, protocol: lobby.protocol } );

	}

	leave( packet ) {

		if ( ! this.lobby )
			return this.send( { id: "onLeaveFail", reasonCode: 49, reason: "Client is not in a lobby.", data: packet } );

		this.lobby.removeClient( this );
		this.lobby = null;

	}

	//////////////////////////////////////////////
	//	Communication
	//////////////////////////////////////////////

	echo( packet ) {

		//Modify data
		packet.id = "onEcho";
		packet.timestamp = Date.now();

		//Send to client
		this.send( packet );

	}

	broadcast( packet ) {

		if ( ! this.lobby ) {

			this.log( "no lobby" );
			return this.send( { id: "onBroadcastFail", reasonCode: 50, reason: "Client is not in a lobby.", data: packet } );

		}

		//Modify data
		packet.id = "onBroadcast";

		//Broadcast to lobby
		this.lobby.sandboxSend( packet );

	}

	sync( packet ) {

		if ( ! this.lobby )
			return this.send( { id: "onSyncFail", reasonCode: 63, reason: "Client is not in a lobby.", data: packet } );

		if ( packet.sid === undefined )
			return this.send( { id: "onSyncFail", reasonCode: 64, reason: "Sync id (sid) not provided.", data: packet } );

		this.send( { id: "onSync", sid: packet.sid, timestamp: Date.now() } );
		this.lobby.sync( packet, this );

	}

	//////////////////////////////////////////////
	//	Hosting
	//////////////////////////////////////////////

	unlist( packet ) {

		if ( ! this.lobby )
			return this.send( { id: "onUnlistFail", reasonCode: 52, reason: "Client is not in a lobby.", data: packet } );

		if ( ! this.hasAccess( "unlist" ) )
			return this.send( { id: "onUnlistFail", reasonCode: 51, reason: "Client does not have necessary access to unlist lobby.", data: packet } );

		this.lobby.unlist();
		this.send( { id: "onUnlist", data: packet } );

	}

	relist( packet ) {

		if ( ! this.lobby )
			return this.send( { id: "onRelistFail", reasonCode: 54, reason: "Client is not in a lobby.", data: packet } );

		if ( ! this.hasAccess( "relist" ) )
			return this.send( { id: "onUnlistFail", reasonCode: 53, reason: "Client does not have necessary access to relist lobby.", data: packet } );

		this.lobby.relist();
		this.send( { id: "onRelist", data: packet } );

	}

	unreserve( packet ) {

		if ( ! this.lobby )
			return this.send( { id: "onUnreserveFail", reasonCode: 56, reason: "Client is not in a lobby.", data: packet } );

		if ( ! this.hasAccess( "relist" ) )
			return this.send( { id: "onUnreserveFail", reasonCode: 55, reason: "Client does not have necessary access to unreserve lobby.", data: packet } );

		this.lobby.unreserve();
		this.send( { id: "onUnreserve", data: packet } );

	}

	//////////////////////////////////////////////
	//	Commands
	//////////////////////////////////////////////

	hasAccess( /*what*/ ) {

		// return this.access[ what ] || ( this.lobby && this.lobbyowner === this.account && config.access.owner[ what ] );
		return true;

	}

	setProtocol( packet ) {

		if ( ! this.lobby )
			return this.send( { id: "onProtocolFail", reasonCode: 59, reason: "Client is not in a lobby.", data: packet } );

		if ( ! packet.path )
			return this.send( { id: "onProtocolFail", reasonCode: 69, reason: "Protocol path not provided.", data: packet } );

		if ( ! this.hasAccess( "protocol" ) )
			return this.send( { id: "onProtocolFail", reasonCode: 58, reason: "Client does not have necessary access to set lobby protocol.", data: packet } );

		const protocol = this.server.protocols.dict[ packet.path.toLowerCase() ];

		if ( ! protocol )
			return this.send( { id: "onProtocolFail", reasonCode: 57, reason: "Provided protocol does not exist.", data: packet } );

		this.lobby.path = packet.path;
		this.lobby.protocol = protocol;

	}

	_getProtocols( packet ) {

		const response = { id: "onGetProtocols" };

		if ( typeof packet.offset !== "number" ) packet.offset = 0;

		if ( ! packet.search ) {

			response.subset = false;

			response.protocols = this.server.protocols.slice( packet.offset, 100 ).map( p => Object.assign( {}, p, { script: undefined } ) );

			if ( this.server.protocols.length <= packet.offset + 100 )
				response.complete = true;

		} else {

			response.subset = true;

			const regex = new RegExp( ".*" + packet.search.split( "" ).join( ".*" ) + ".*" );

			let i = 0;
			for ( ; i < this.server.protocols.length; i ++ ) {

				if ( regex.test( this.server.protocols[ i ].toLowerCase() ) ) {

					if ( ! packet.offset ) response.protocols.push( Object.assign( {}, this.server.protocols[ i ], { script: undefined } ) );
					else -- packet.offset;

				}

				if ( i === this.server.protocols.length ) response.complete = true;
				else if ( response.protocols.length === 100 ) break;

			}

		}

		this.send( response );

	}

	async getProtocols( packet ) {

		if ( ! this.hasAccess( "protocol" ) )
			return this.send( { id: "onGetProtocolsFail", reasonCode: 60, reason: "Client does not have necessary access to list protocols.", data: packet } );

		if ( this.server.protocols.length && ! packet.force )
			return this._getProtocols( packet );

		await this.server.protocols.replace( await Promise.all( ( await UTIL.readdir( config.fileServer.path ) )
				.filter( filepath => path.extname( filepath ) === ".js" )
				.map( async filepath => {

					const file = ( await UTIL.readFile( path.join( config.fileServer.path, filepath ) ) ).toString();

					let protocol;

					try {

						protocol = JSON.parse( file.match( /\/\*+((.|[\r\n])*?)\*\// )[ 1 ] );

					} catch ( err ) {

						protocol = { corrupt: true };

					}

					protocol.path = filepath;
					protocol.lowerPath = filepath.toLowerCase();
					protocol.script = file;

					return protocol;

				} ) ) );

		this._getProtocols( packet );

	}

	//////////////////////////////////////////////
	//	Misc
	//////////////////////////////////////////////

	onPing( packet ) {

		if ( isNaN( parseFloat( packet.time ) ) || ! isFinite( packet.time ) ) return;

		this.lobby.recalcPing = true;

		if ( this.ping === undefined ) this.ping = Date.now() - packet.time;
		else this.ping = 4 / 5 * ( this.ping ) + 1 / 5 * ( Date.now() - packet.time );

	}

	js( packet ) {

		if ( this.mode !== "js" )
			return this.send( { id: "onJSFail", reasonCode: 61, reason: "JavaScript mode not enabled.", data: packet } );

		try {

			this.send( eval( packet ), true );

		} catch ( err ) {

			this.send( err, true );

		}

	}

	//////////////////////////////////////////////
	//	Secondary Support Functions
	//////////////////////////////////////////////

	address( arr ) {

		//Set up our address array
		const address = this.type === "ws" ?
			[ this.remoteAddress, this.remotePort ] :
			[ this.remoteAddress, this.remotePort ];

		//Return value
		if ( arr === true ) return address;
		else return address.join( ":" );

	}

	//////////////////////////////////////////////
	//	Primary Support Functions
	//////////////////////////////////////////////

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.bblue, this.account || this.address(), ...args, UTIL.colors.default );

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.blue, this.account || this.address(), ...args, UTIL.colors.default );

	}

	send( data, useUtil ) {

		//Only try to send if client socket is receiving
		if ( ! ( this.socket.readyState === 1 || this.socket.readyState === "open" ) ) return;

		try {

			const s = typeof data === "string" ?
				data :
				useUtil ?
					util.inspect( data ) :
					JSON.stringify( data );

			if ( s.length > 5000 ) return;

			this.log( "[SEND]", data );

			//Send via websocket
			if ( this.type === "ws" ) this.socket.send( s );

			//Send via socket
			else if ( this.type === "s" ) this.socket.write( s );

		} catch ( e ) {}

	}

}

//Expose Client class
module.exports = Client;
