
import cp from "child_process";
import dateformat from "dateformat";

import { colors } from "../util.js";

export default class MasterRoom {

	constructor( host, name, owner ) {

		this.host = host;
		this.server = host.server;
		this.nova = host.nova;

		this.name = name;
		this.lowerName = name.toLowerCase();
		this.ownerAccount = owner;

		this.sandbox = cp.fork( "index.js", { env: { FILE: "./src/server/ForkedRoom.js" } } );
		process.children.push( this.sandbox );
		this.sandbox.send( { id: "init", name, owner } );
		this.sandbox.on( "message", msg => this.sandboxReceive( msg ) );
		this.sandbox.on( "error", () => this.destroy() );
		this.sandbox.on( "exit", () => this.destroy() );

		this.log( "Reserved room for", owner );

	}

	get app() {

		return this._app;

	}
	// process.children[0].on('exit', () => console.log('abc'))
	set app( value ) {

		if ( typeof value === "string" ) return this.sandboxApp( value );

		this._app = value;

		this.nova.send( {
			id: "update",
			name: this.name,
			app: value.name,
			date: value.date,
			version: value.version,
			preview: value.preview,
			author: value.author
		} );

	}

	destroy() {

		if ( this.destroyed ) return;
		this.destroyed = true;

		this.unreserve();

		try {

			this.sandboxSend( { id: "destroy" } );

		} catch ( err ) { /* do nothing */ }

		const index = process.children.indexOf( this.sandbox );
		if ( index >= 0 ) process.children.splice( index );

		this.server.rooms.remove( this );

	}

	//////////////////////////////////////////////
	//	Clients
	//////////////////////////////////////// //////

	takeSocket( client ) {

		this.sandbox.send( { id: "addClient", account: client.account, ws: {
			protocolVersion: client.socket.protocolVersion,
			extensions: client.socket.extensions,
			protocol: client.socket.protocol
		} }, client.socket._socket );

	}

	proxySend( _, data ) {

		this.sandbox.send( { id: "proxySend", data } );

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

		this.log( "Room unreserved" );

	}

	//////////////////////////////////////////////
	//	Primary support
	//////////////////////////////////////////////

	sandboxSend( data ) {

		this.sandbox.send( { id: "send", data } );

	}

	sandboxApp( data ) {

		this.sandbox.send( { id: "app", data } );

	}

	sandboxReceive( data ) {

		switch ( data.id ) {

			case "destroy": return this.destroy();
			case "removeClient": return this.removeClient( this.clients.dict[ data.client.toLowerCase() ] );
			case "unlist": return this.unlist();
			case "relist": return this.relist();
			case "unreserve": return this.unreserve();
			case "app": return this.app = data.app || {};
			default: this.error( "Unknown message from sandbox", data );

		}

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + colors.magenta, this.name, ...args, colors.default );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.bmagenta, this.name, ...args, colors.default );

	}

}
