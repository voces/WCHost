
import dateformat from "dataformat";
import WebSocket from "ws";

import { colors } from "../util.js";
import EventDispatcher from "wc-eventdispatcher/src/EventDispatcher.js";

export default class Player extends EventDispatcher {

	constructor( data, socket ) {

		super();

		this.socket = new WebSocket( [ socket, []], null, data.ws );
		this.account = data.account;
		this.lowerAccount = data.account.toLowerCase();

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

	send( data ) {

		this.socket.send( data );

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

			//Send via websocket
			if ( this.type === "ws" ) this.socket.send( s );

			//Send via socket
			else if ( this.type === "s" ) this.socket.write( s );

		} catch ( e ) { /* do nothing */ }

	}

}
