
import dateformat from "dateformat";
import WebSocket from "ws";

import Collection from "../Collection.js";
import { colors } from "../util.js";
import Client from "./ForkedClient.js";

class ForkedRoom {

	constructor() {

		// this.host = host;
		// this.server = host.server;
		// this.nova = host.nova;

		// this.name = name;
		// this.lowerName = name.toLowerCase();
		// this.ownerAccount = owner;

		this.wss = new WebSocket.Server( { noServer: true } );

		this.clients = new Collection();
		this.clients.key = "lowerAccount";

		// this.log( "Reserved Room for", owner );

		this.timeout = setTimeout( () => this.destroy(), 300000 );

		process.on( "message", this.onMessage.bind( this ) );

	}

	destroy() {

		for ( let i = 0; i < this.clients.length; i ++ )
			this.removeClient( this.clients[ i ], true );

		this.log( "Room unreserved" );

	}

	//////////////////////////////////////////////
	//	Client handling
	//////////////////////////////////////////////

	addClient( data, socket ) {

		data.ws.maxPayload = this.wss.maxPayload;
		const client = new Client( data, socket );
		this.clients.add( client );

		clearTimeout( this.timeout );

		this.app && this.app.dispatchEvent( { id: "onJoin", accounts: [ ws.account ] } );

		client.json( { id: "onRoom", app: this.app } );

	}

	removeClient( client, silent ) {

		if ( this.clients.length <= 1 ) {

			this.timeout = setTimeout( () => this.destroy(), 300000 );

			this.log( "Removed user from Room, auto destruct enabled" );

		} else this.log( "Removed user from Room" );

		if ( silent !== true )
			this.sandboxSend( { id: "onLeave", accounts: [ client.account ] } );

		this.clients.remove( client );
		client.Room = null;

	}

	proxySend( client, data ) {

		client.send( data );

	}

	//////////////////////////////////////////////
	//	Primary support
	//////////////////////////////////////////////

	onMessage( data, ...args ) {

		switch ( data.id ) {

			case "addClient": return this.addClient( data, args[ 0 ] );
			case "removeClient": return this.removeClient( this.clients.dict[ data.client.toLowerCase() ] );
			case "proxySend": return this.proxySend( this.clients.dict[ data.client.toLowerCase() ], data.data );

			case "destroy": return this.destroy();
			// case "app": return this.app = this.server.apps.dict[ data.path.toLowerCase() ];
			case "broadcast": return this.send( data );
			default: this.error( "Unknown message from master", data );

		}

	}

	send( packet ) {

		if ( typeof packet !== "object" ) packet = { id: "broadcast", data: packet };
		else packet.id = "broadcast";

		packet.Room = this.name;
		packet.timestamp = Date.now();

		const data = JSON.stringify( packet );

		for ( let i = 0; i < this.clients.length; i ++ )
			this.clients[ i ].send( data );

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + colors.magenta, this.name, ...args, colors.default );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.bmagenta, this.name, ...args, colors.default );

	}

}

new ForkedRoom();
