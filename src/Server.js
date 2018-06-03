
import dateformat from "dateformat";
import http from "http";
import WebSocket from "ws";

import Client from "./server/Client.js";
import Collection from "./Collection.js";
import { colors } from "./util.js";

export default class Server {

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

		this.rooms = new Collection();
		this.rooms.key = "lowerName";

		this.apps = new Collection();
		this.apps.key = "lowerPath";

		this.nova = nova;

		this.port = config.port || 8081;

		config = Object.assign( { port: this.port }, config );

		const server = http.createServer();
		server.on( "upgrade", ( request, socket ) => {

			if ( ! request.headers[ "sec-websocket-protocol" ] )
				this.wss.handleUpgrade( request, socket, [], ws => this.clients.add( new Client( ws, this ) ) );

		} );

		this.wss = new WebSocket.Server( { noServer: true } );

		server.listen( this.port );
		this.log( "Server started on port", this.port );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.bcyan, ...args, colors.default );

	}

}
