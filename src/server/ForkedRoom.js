
import dateformat from "dateformat";
import WebSocket from "ws";

import Collection from "../Collection.js";
import { colors } from "../util.js";
import Client from "./ForkedClient.js";

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

		this.log( "Room unreserved" );

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

		this._app && this._app.dispatchEvent( "onJoin", { accounts: [ client.account ] } );

		client.json( { id: "onRoom", app: this.appConstructor } );

	}

	removeClient( client, silent ) {

		if ( ! this.clients.dict[ client.lowerAccount ] ) return;

		if ( this.clients.length <= 1 ) {

			this.timeout = setTimeout( () => this.destroy(), 300000 );

			this.log( "Removed user from Room, auto destruct enabled" );

		} else this.log( "Removed user from Room" );

		if ( silent !== true )
			this._app && this._app.dispatchEvent( { id: "onLeave", accounts: [ client.account ] } );

		this.clients.remove( client );
		client.Room = null;

	}

	proxySend( client, data ) {

		client.send( data );

	}

	set app( app ) {

		import( app + "/app.js" ).catch( this.error.bind( this ) ).then( i => {

			this.appConstructor = i.default;
			this.appConstructor.addEventListener( "meta", meta => process.send( {
				id: "app",
				app: {
					name: meta.name,
					version: meta.version,
					author: meta.author
				}
			} ) );

			this._app = new this.appConstructor();
			this._app.addEventListener( "network", event => this.json( event.data ) );
			if ( this.clients.length ) this._app.dispatchEvent( "onJoin", { accounts: this.clients.map( c => c.account ) } );

		} ).catch( this.error.bind( this ) );

	}

	get app() {

		return this._app;

	}

	//////////////////////////////////////////////
	//	Primary support
	//////////////////////////////////////////////

	onMessageFromMaster( data, ...args ) {

		switch ( data.id ) {

			case "init": return ( Object.assign( this, { name: data.name, owner: data.owner } ), this.log( "Forked into separate process" ) );

			case "addClient": return this.addClient( data, args[ 0 ] );
			case "removeClient": return this.removeClient( this.clients.dict[ data.client.toLowerCase() ] );
			case "proxySend": return this.proxySend( this.clients.dict[ data.client.toLowerCase() ], data.data );

			case "destroy": return this.destroy();
			case "app": return this.app = data.path;
			case "broadcast": return this.send( data );
			default: this.error( "Unknown message from master", data );

		}

	}

	json( packet ) {

		if ( typeof packet !== "object" ) packet = { id: "network", data: packet };
		else packet.id = "network";

		packet.room = this.name;
		packet.time = Date.now();

		this.log( "[SEND]", packet );

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
