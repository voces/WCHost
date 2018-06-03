
import dateformat from "dateformat";
import path from "path";
import util from "util";

import config from "../../config.js";
import db from "../db.js";
import { colors, merge, readdir, readFile } from "../util.js";

export default class Client {

	constructor( socket, server ) {

		this.server = server;
		this.socket = socket;

		this.remoteAddress = socket._socket.remoteAddress;
		this.remotePort = socket._socket.remotePort;

		this.account = undefined;
		this.mode = "normal";
		this.room = undefined;
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
		if ( ! this.account )

			switch ( packet.id ) {

				// Account
				case "key": return this.key( packet );

				default: return this.send( { id: "invalid", level: 1, account: this.account, data: packet } );

			}

		switch ( packet.id ) {

			// Room
			case "room": return this.joinRoom( packet );
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
			case "app": return this.setApp( packet );
			case "getApps": return this.getApps( packet );

			default: return this.send( { id: "invalid", level: 2, account: this.account, data: packet } );

		}

	}

	close() {

		this.log( "Disconnected" );

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

		if ( packet.room ) setImmediate( () => this.joinRoom( { name: packet.room } ) );
		else if ( preclient.room ) setImmediate( () => this.joinRoom( { name: preclient.room } ) );

		// Remove from preclients
		if ( preclient.timeout ) clearTimeout( preclient.timeout );
		preclient.fullfilled();

		this.log( "Client authenticated" );

		// Update clients
		this.server.clients.dict[ this.lowerAccount ] = this;

		const user = ( await db.query( "SELECT access FROM users WHERE name = ?;", [ this.account ] ) )[ 0 ];

		if ( user ) merge( this.access, user.access );

		this.send( { id: "onKey", account: this.account, access: this.access } );

	}

	//////////////////////////////////////////////
	//	Room
	//////////////////////////////////////////////

	joinRoom( packet ) {

		if ( typeof packet.name !== "string" )
			return this.send( { id: "onRoomFail", reasonCode: 48, reason: "Room not provided.", data: packet } );

		const room = this.server.rooms.dict[ packet.name.toLowerCase() ];

		if ( ! room )
			return this.send( { id: "onRoomFail", reasonCode: 47, reason: "Provided room does not exist.", data: packet } );

		// if ( room.clients.includes( this ) )
			// return this.send( { id: "onRoomFail", reasonCode: 46, reason: "Client already in provided room.", data: packet } );

		room.takeSocket( this );
		this.socket.send = data => room.proxySend( this.account, data );

		this.log( "Joined", room.name );

		this.server.clients.remove( this );

	}

	leave( packet ) {

		if ( ! this.room )
			return this.send( { id: "onLeaveFail", reasonCode: 49, reason: "Client is not in a room.", data: packet } );

		this.room.removeClient( this );
		this.room = null;

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

		if ( ! this.room ) {

			this.log( "no room" );
			return this.send( { id: "onBroadcastFail", reasonCode: 50, reason: "Client is not in a room.", data: packet } );

		}

		//Modify data
		packet.id = "onBroadcast";

		//Broadcast to room
		this.room.sandboxSend( packet );

	}

	sync( packet ) {

		if ( ! this.room )
			return this.send( { id: "onSyncFail", reasonCode: 63, reason: "Client is not in a room.", data: packet } );

		if ( packet.sid === undefined )
			return this.send( { id: "onSyncFail", reasonCode: 64, reason: "Sync id (sid) not provided.", data: packet } );

		this.send( { id: "onSync", sid: packet.sid, timestamp: Date.now() } );
		this.room.sync( packet, this );

	}

	//////////////////////////////////////////////
	//	Hosting
	//////////////////////////////////////////////

	unlist( packet ) {

		if ( ! this.room )
			return this.send( { id: "onUnlistFail", reasonCode: 52, reason: "Client is not in a room.", data: packet } );

		if ( ! this.hasAccess( "unlist" ) )
			return this.send( { id: "onUnlistFail", reasonCode: 51, reason: "Client does not have necessary access to unlist room.", data: packet } );

		this.room.unlist();
		this.send( { id: "onUnlist", data: packet } );

	}

	relist( packet ) {

		if ( ! this.room )
			return this.send( { id: "onRelistFail", reasonCode: 54, reason: "Client is not in a room.", data: packet } );

		if ( ! this.hasAccess( "relist" ) )
			return this.send( { id: "onUnlistFail", reasonCode: 53, reason: "Client does not have necessary access to relist room.", data: packet } );

		this.room.relist();
		this.send( { id: "onRelist", data: packet } );

	}

	unreserve( packet ) {

		if ( ! this.room )
			return this.send( { id: "onUnreserveFail", reasonCode: 56, reason: "Client is not in a room.", data: packet } );

		if ( ! this.hasAccess( "relist" ) )
			return this.send( { id: "onUnreserveFail", reasonCode: 55, reason: "Client does not have necessary access to unreserve room.", data: packet } );

		this.room.unreserve();
		this.send( { id: "onUnreserve", data: packet } );

	}

	//////////////////////////////////////////////
	//	Commands
	//////////////////////////////////////////////

	hasAccess( /*what*/ ) {

		// return this.access[ what ] || ( this.room && this.roomowner === this.account && config.access.owner[ what ] );
		return true;

	}

	setApp( packet ) {

		if ( ! this.room )
			return this.send( { id: "onAppFail", reasonCode: 59, reason: "Client is not in a room.", data: packet } );

		if ( ! packet.path )
			return this.send( { id: "onAppFail", reasonCode: 69, reason: "App path not provided.", data: packet } );

		if ( ! this.hasAccess( "app" ) )
			return this.send( { id: "onAppFail", reasonCode: 58, reason: "Client does not have necessary access to set room app.", data: packet } );

		const app = this.server.apps.dict[ packet.path.toLowerCase() ];

		if ( ! app )
			return this.send( { id: "onAppFail", reasonCode: 57, reason: "Provided app does not exist.", data: packet } );

		this.room.path = packet.path;
		this.room.app = app;

	}

	_getApps( packet ) {

		const response = { id: "onGetApps" };

		if ( typeof packet.offset !== "number" ) packet.offset = 0;

		if ( ! packet.search ) {

			response.subset = false;

			response.apps = this.server.apps.slice( packet.offset, 100 ).map( p => Object.assign( {}, p, { script: undefined } ) );

			if ( this.server.apps.length <= packet.offset + 100 )
				response.complete = true;

		} else {

			response.subset = true;

			const regex = new RegExp( ".*" + packet.search.split( "" ).join( ".*" ) + ".*" );

			let i = 0;
			for ( ; i < this.server.apps.length; i ++ ) {

				if ( regex.test( this.server.apps[ i ].toLowerCase() ) )

					if ( ! packet.offset ) response.apps.push( Object.assign( {}, this.server.apps[ i ], { script: undefined } ) );
					else -- packet.offset;

				if ( i === this.server.apps.length ) response.complete = true;
				else if ( response.apps.length === 100 ) break;

			}

		}

		this.send( response );

	}

	async getApps( packet ) {

		if ( ! this.hasAccess( "app" ) )
			return this.send( { id: "onGetAppsFail", reasonCode: 60, reason: "Client does not have necessary access to list apps.", data: packet } );

		if ( this.server.apps.length && ! packet.force )
			return this._getApps( packet );

		await this.server.apps.replace( await Promise.all( ( await readdir( config.fileServer.path ) )
				.filter( filepath => path.extname( filepath ) === ".js" )
				.map( async filepath => {

					const file = ( await readFile( path.join( config.fileServer.path, filepath ) ) ).toString();

					let app;

					try {

						app = JSON.parse( file.match( /\/\*+((.|[\r\n])*?)\*\// )[ 1 ] );

					} catch ( err ) {

						app = { corrupt: true };

					}

					app.path = filepath;
					app.lowerPath = filepath.toLowerCase();
					app.script = file;

					return app;

				} ) ) );

		this._getApps( packet );

	}

	//////////////////////////////////////////////
	//	Misc
	//////////////////////////////////////////////

	onPing( packet ) {

		if ( isNaN( parseFloat( packet.time ) ) || ! isFinite( packet.time ) ) return;

		this.room.recalcPing = true;

		if ( this.ping === undefined ) this.ping = Date.now() - packet.time;
		else this.ping = 4 / 5 * ( this.ping ) + 1 / 5 * ( Date.now() - packet.time );

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

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.bblue, this.account || this.address(), ...args, colors.default );

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + colors.blue, this.account || this.address(), ...args, colors.default );

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

		} catch ( e ) { /* do nothing */ }

	}

}
