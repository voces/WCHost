
import dateformat from "dateformat";
import WebSocket from "ws";

import MasterRoom from "./server/MasterRoom.js";
import Preclient from "./server/Preclient.js";
import { colors } from "./util.js";

const WEBSOCKET_ERRORS = {
	ETIMEDOUT: "Timed out while trying to connect to Nova.",
	ECONNREFUSED: "Unable to connect to Nova. You may have the incorrect address."
};

export default class Nova {

	constructor( host, config = {} ) {

		this.host = host;
		this.server = host.server;

		Object.assign( this, {

			ip: "70.173.152.171", // TODO: switch to a module that grab's ip
			port: 8082,

			address: "wss://notextures.io:8082",
			user: "anno"

		}, config );

		this.connect();

		setInterval( () => this.send( { id: "echo", sid: "ping", sent: Date.now() } ), 1800000 );

	}

	connect() {

		this.log( "Attempting to connect to Nova @ " + this.address );
		this.ws = new WebSocket( this.address );

		this.ws.on( "open", () => this.onOpen() );
		this.ws.on( "message", data => this.onMessage( data ) );
		this.ws.on( "close", () => this.onClose() );
		this.ws.on( "error", err => this.onError( err ) );

	}

	//////////////////////////////////////////////
	//	Event handlers
	//////////////////////////////////////////////

	onMessage( data ) {

		data = JSON.parse( data );

		switch ( data.id ) {

			// Self
			case "onLogin": return this.onLogin( data );
			case "onLoginFail": return ( this.error( data ), process.exit( 1 ) );
			case "onUpgrade": return this.onUpgrade();

			// Hosting
			case "reserve": return this.reserve( data );
			case "onOnReserve": return this.onOnReserve( data );

			// Joining
			case "bridge": return this.bridge( data );
			case "onOnBridge": case "onOnRoom": return;

			// Communication
			case "onWhisper": return this.onWhisper( data );
			case "onWhisperEcho": return;
			case "onEcho": return this.onEcho( data );

			default: this.error( "Unhandled Nova message", data.id );

		}

	}

	onOpen() {

		//Connected to nova
		this.log( "Connected to Nova, logging in as " + this.user );

		this.send( { id: "login", account: this.user, password: this.password } );

	}

	onClose() {

		setTimeout( () => this.connect(), 5000 );

	}

	onError( err ) {

		const errorMessage = WEBSOCKET_ERRORS[ err.code ];

		if ( errorMessage ) this.error( errorMessage );
		else this.error( "Unhandled Nova error", err );

	}

	//////////////////////////////////////////////
	// Self
	//////////////////////////////////////////////

	onLogin( packet ) {

		this.log( "Logged in successfully as " + packet.account );

		//Store login creds
		this.account = packet.account;

		//Upgrade client type
		this.log( "Upgrading to host" );
		this.send( { id: "upgrade", port: this.server.port } );

	}

	onUpgrade() {

		this.log( "Successfully upgraded to host" );

		// Reserve all currently running rooms
		for ( let i = 0; i < this.server.rooms.length; i ++ )
			this.send( { id: "onReserve", name: this.server.rooms[ i ].name, owner: this.server.rooms[ i ].ownerAccount } );

	}

	//////////////////////////////////////////////
	// Hosting
	//////////////////////////////////////////////

	// TODO: move these functions into an ETL
	canHost( /* who */ ) {

		return true;

	}

	canConnect( account ) {

		return ! this.host.server.clients.dict[ account ] && ! this.host.server.preclients.dict[ account ];

	}

	canJoin( /* trueAccount, account, ip */ ) {

		return true;

	}

	canUnlist() {

		return true;

	}

	canRelist() {

		return true;

	}

	reserve( packet ) {

		if ( typeof packet.name !== "string" )
			return this.send( { id: "onReserveReject", owner: packet.owner, Room: packet.name, reason: "Room name not provided." } );

		if ( ! this.canHost( packet.owner.toLowerCase() ) )
			return this.send( { id: "onReserveReject", owner: packet.owner, Room: packet.name, reason: "Owner cannot host." } );

		const roomName = packet.name.toLowerCase();

		if ( this.server.rooms.dict[ roomName ] )
			return this.send( { id: "onReserveReject", owner: packet.owner, Room: packet.name, reason: "Room name is already taken." } );

		this.host.server.rooms.dict[ roomName ] = true;
		this.send( { id: "onReserve", name: packet.name, owner: packet.owner } );

	}

	//////////////////////////////////////////////
	// Joining
	//////////////////////////////////////////////

	bridge( packet ) {

		if ( typeof packet.account !== "string" || typeof packet.originalAccount !== "string" )
			return this.send( { id: "bridgeReject", account: packet.account, reason: "Account not provided.", data: packet } );

		if ( ! this.canConnect( packet.originalAccount, packet.account.toLowerCase(), packet.ip ) )
			return this.send( { id: "bridgeReject", account: packet.account, reason: "Provided account is blocked.", data: packet } );

		const key = Math.random().toString().substr( 2 );
		const preclient = new Preclient( this.host.server, packet.account, key );

		this.host.server.preclients.add( preclient );

		this.send( { id: "onBridge", account: packet.account, key } );

	}

	onOnReserve( packet ) {

		this.host.server.rooms.add( new MasterRoom( this.host, packet.name, packet.owner ) );

	}

	//////////////////////////////////////////////
	// Communication
	//////////////////////////////////////////////

	onEcho( /* data */ ) {

		// Maybe keep track of pings? Who cares
		// if ( data.sid === "ping" ) return;

	}

	onWhisper( packet ) {

		if ( packet.message.substr( 0, 1 ) === "/" ) {

			const args = packet.message.split( " " ),
				command = args.shift().substr( 1 );

			this.processCommand( packet.account, command, args );

		}

	}

	//////////////////////////////////////////////
	// Commands
	//////////////////////////////////////////////

	commandReserve( account, args ) {

		if ( ! this.canHost( account ) )
			return this.send( { id: "whisper", account, message: "You do not have the access to host." } );

		const name = args.join( " " ),
			lowerName = name.toLowerCase();

		if ( this.server.rooms.dict[ lowerName ] )
			return this.send( { id: "whisper", account, message: "That name is already taken." } );

		this.server.rooms.dict[ lowerName ] = true;
		this.send( { id: "onReserve", name } );

	}

	commandUnlist( account, args ) {

		if ( ! this.canUnlist( account ) )
			return this.send( { id: "whisper", account, message: "You do not have the access to unlist." } );

		const name = args.join( " " ),
			lowerName = name.toLowercase(),

			Room = this.server.rooms.dict[ lowerName ];

		if ( ! Room )
			return this.send( { id: "whisper", account, message: "That Room does not exist." } );

		Room.unlist();
		this.send( { id: "whisper", account, message: name + " unlisted." } );

	}

	commandRelist( account, args ) {

		if ( ! this.canRelist( account ) )
			return this.send( { id: "whisper", account, message: "You do not have the access to relist." } );

		const name = args.join( " " ),
			lowerName = name.toLowercase(),

			Room = this.server.rooms.dict[ lowerName ];

		if ( ! Room )
			return this.send( { id: "whisper", account, message: "That Room does not exist." } );

		Room.relist();
		this.send( { id: "whisper", account, message: name + " relisted." } );

	}

	commandUnreserve( account, args ) {

		if ( ! this.canRelist( account ) )
			return this.send( { id: "whisper", account, message: "You do not have the access to unreserve." } );

		const name = args.join( " " ),
			lowerName = name.toLowercase(),

			Room = this.server.rooms.dict[ lowerName ];

		if ( ! Room )
			return this.send( { id: "whisper", account, message: "That Room does not exist." } );

		Room.unreserve();
		this.send( { id: "whisper", account, message: name + " unreserved." } );

	}

	processCommand( account, command, args ) {

		switch ( command ) {

			case "reserve": return this.commandReserve( account, args );
			case "unlist": return this.commandUnlist( account, args );
			case "relist": return this.commandRelist( account, args );
			case "unreserve": return this.commandUnreserve( account, args );

			default: this.send( { id: "whisper", account, message: "Unknown command " + command } );

		}

	}

	//////////////////////////////////////////////
	// Primary Support Functions
	//////////////////////////////////////////////

	send( data ) {

		if ( this.ws.readyState !== 1 ) return;

		if ( typeof data !== "string" ) data = JSON.stringify( data );

		this.ws.send( data );

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + colors.cyan, ...args, colors.default );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.bcyan, ...args, colors.default );

	}

}

