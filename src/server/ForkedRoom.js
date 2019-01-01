
import dateformat from "dateformat";
import WebSocket from "ws";

import Collection from "../Collection.js";
import { colors } from "../util.js";
import Client from "./ForkedClient.js";

const logging = context =>
	[ "log", "info", "error", "warn" ].forEach( level => {

		const old = console[ level ];
		console[ level ] = ( ...args ) => old( dateformat( new Date(), "hh:MM:sst" ) + colors.magenta, context, ...args, colors.default );

	} );

class ForkedRoom {

	constructor() {

		this.wss = new WebSocket.Server( { noServer: true } );

		this.clients = new Collection();
		this.clients.key = "lowerAccount";

		this.timeout = setTimeout( () => this.destroy(), 300000 );

		process.on( "message", this.onMessageFromMaster.bind( this ) );

	}

	destroy() {

		for ( let i = 0; i < this.clients.length; i ++ )
			this.removeClient( this.clients[ i ], true );

		process.exit( 0 );

	}

	//////////////////////////////////////////////
	//	Client handling
	//////////////////////////////////////////////

	addClient( data, socket ) {

		data.ws.maxPayload = this.wss.maxPayload;
		const client = new Client( data, socket, this );
		this.clients.add( client );

		clearTimeout( this.timeout );

		this._app && this._app.onServerJoin && this._app.onServerJoin( client.account );

		client.json( { id: "onRoom", app: this.appConstructor } );

	}

	removeClient( client, silent ) {

		if ( ! this.clients.dict[ client.lowerAccount ] ) return;

		if ( this.clients.length <= 1 ) {

			// this.timeout = setTimeout( () => this.destroy(), 300000 );
			this.timeout = setTimeout( () => this.destroy(), 3 );

			console.log( `Removed ${client.account}, auto destruct enabled` );

		} else console.log( `Removed ${client.account}` );

		this.clients.remove( client );
		client.Room = null;

		if ( silent !== true )
			this._app && this._app.onLeaveOnHost( client.account );

	}

	proxySend( client, data ) {

		client.send( data );

	}

	set app( app ) {

		import( app + "/app.js" ).catch( console.error.bind( this ) ).then( i => {

			this.appConstructor = i.default;
			this.appConstructor.addEventListener( "meta", meta => process.send( {
				id: "app",
				app: {
					name: meta.name,
					version: meta.version,
					author: meta.author
				}
			} ) );

			this._app = new this.appConstructor( { hostTransmit: data => this.json( data ) } );
			this.clients.forEach( client => this._app.onJoinOnHost( client.account ) );

		} ).catch( console.error.bind( this ) );

	}

	get app() {

		return this._app;

	}

	//////////////////////////////////////////////
	//	Primary support
	//////////////////////////////////////////////

	onMessageFromMaster( data, ...args ) {

		switch ( data.id ) {

			case "init": return this.init( data );

			case "addClient": return this.addClient( data, args[ 0 ] );
			case "removeClient": return this.removeClient( this.clients.dict[ data.client.toLowerCase() ] );
			case "proxySend": return this.proxySend( this.clients.dict[ data.client.toLowerCase() ], data.data );

			case "destroy": return this.destroy();
			case "app": return this.app = data.path;
			case "broadcast": return this.send( data );
			default: console.error( "Unknown message from master", data );

		}

	}

	init( data ) {

		Object.assign( this, { name: data.name, owner: data.owner } );
		logging( data.name );

	}

	json( packet ) {

		const time = this._app ? this._app.update.last : undefined;

		if ( typeof packet !== "object" ) packet = { id: "app", room: this.name, time, data: packet };
		else packet = { time, ...packet, id: "app", room: this.name };

		if ( packet.type !== "update" ) console.log( "[SEND]", packet );
		const data = JSON.stringify( packet );

		for ( let i = 0; i < this.clients.length; i ++ )
			this.clients[ i ].send( data );

	}

}

new ForkedRoom();
