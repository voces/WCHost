
import dateformat from "dateformat";
import util from "util";
import WebSocket from "ws";

import { colors } from "../util.js";
import EventDispatcher from "wc-eventdispatcher/src/EventDispatcher.js";

export default class Player extends EventDispatcher {

	constructor( data, socket, room ) {

		super();

		this.socket = new WebSocket( [ socket, []], null, data.ws );
		this.account = data.account;
		this.lowerAccount = data.account.toLowerCase();
		this.room = room;

		this.socket.on( "message", data => this.receive( data ) );
		this.socket.on( "close", data => this.close( data ) );
		this.socket.on( "error", data => this.error( data ) );

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

		switch ( packet.id ) {

			// Game
			case "network":
				console.warn( "`type=network` is deprecated, just send stuff directly" );
				return this.onNetwork( packet );

			// Room
			// case "room": return this.joinRoom( packet );
			// case "leave": return this.leave( packet );

			// Communication
			// case "broadcast": return this.broadcast( packet );
			// case "echo": return this.echo( packet );
			// case "sync": return this.sync( packet );

			// Hosting
			// case "unlist": return this.unlist( packet );
			// case "relist": return this.relist( packet );
			// case "unreserve": return this.unreserve( packet );

			// Commands
			case "app": return this.setApp( packet );
			// case "getApps": return this.getApps( packet );

			default: return this.onNetwork( packet );

		}

	}

	close() {

		this.log( "Disconnected" );

		this.room.removeClient( this );

	}

	//////////////////////////////////////////////
	//	Game
	//////////////////////////////////////////////

	onNetwork( packet ) {

		if ( ! this.room || ! this.room._app ) return;

		packet.account = this.account;
		console.log( "onNetwork", packet );
		this.room._app.receive( packet );

	}

	//////////////////////////////////////////////
	//	Commands
	//////////////////////////////////////////////

	hasAccess( /*what*/ ) {

		// return this.access[ what ] || ( this.room && this.roomowner === this.account && config.access.owner[ what ] );
		return true;

	}

	setApp( packet ) {

		if ( ! packet.path )
			return this.send( { id: "onAppFail", reasonCode: 69, reason: "App path not provided.", data: packet } );

		if ( ! this.hasAccess( "app" ) )
			return this.send( { id: "onAppFail", reasonCode: 58, reason: "Client does not have necessary access to set room app.", data: packet } );

		// const app = this.server.apps.dict[ packet.path.toLowerCase() ];

		// if ( ! app )
		// 	return this.send( { id: "onAppFail", reasonCode: 57, reason: "Provided app does not exist.", data: packet } );

		// this.room.path = packet.path;
		this.room.app = packet.path;

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

		console.log( colors.bblue + ( this.account || this.address() ), ...args, colors.default );

	}

	error( ...args ) {

		console.error( colors.blue + ( this.account || this.address() ), ...args, colors.default );

	}

	send( data ) {

		try {

			this.socket.send( data );

		} catch ( err ) {

			this.close();

		}

	}

	json( data, useUtil ) {

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

			this.socket.send( s );

		} catch ( e ) { /* do nothing */ }

	}

}
