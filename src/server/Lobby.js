
const VM = require( "vm" );

const Collection = require( "../Collection" );

class Lobby {

	constructor( host, name, owner ) {

		this.host = host;
		this.server = host.server;
		this.nova = host.nova;

		this.name = name;
		this.lowerName = name.toLowerCase();
		this.ownerAccount = owner;

		this.clients = new Collection();
		this.clients.key = "lowerAccount";

		this.vm = new VM();

		this.log( "Reserved lobby" );

		this.timeout = setTimeout( () => this.destroy(), 300000 );

	}

	get protocol() {

		return this._protocol;

	}

	set protocol( value ) {

		this._protocol = value;

		this.vm.run( value.script );

	}

	destroy() {

		this.nova.send( { id: "unreserve", name: this.name } );

		for ( let i = 0; i < this.clients.length; i ++ ) {

			this.send( { id: "onLeave", lobby: this.name, forced: true }, this.clients[ i ] );
			this.removeClient( this.clients[ i ], true );

		}

		this.server.lobbies.remove( this );

		this.log( "Lobby unreserved" );

	}

	//////////////////////////////////////////////
	//	Client handling
	//////////////////////////////////////////////

	addClient( client ) {

		clearTimeout( this.timeout );

		this.send( { id: "onJoin", lobby: this.name, accounts: [ client.account ] } );

		this.clients.push( client );

		client.send( {
			id: "onJoin",
			lobby: this.name,
			accounts: this.clients.map( client => client.account ),
			protocol: this.protocol,
			owner: this.ownerAccount,
			isOwner: ( this.ownerAccount.toLowerCase() === client.lowerAccount )
		} );

	}

	removeClient( client, silent ) {

		if ( this.clients.length <= 1 ) {

			this.timeout = setTimeout( () => this.destroy(), 300000 );

			this.log( "Removed user from lobby, auto destruct enabled" );

		} else this.log( "Removed user from lobby" );

		if ( silent !== true )
			this.send( { id: "onLeave", lobby: this.name }, client );

		this.clients.remove( client );
		client.lobby = null;

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

	}

	//////////////////////////////////////////////
	//	Primary support
	//////////////////////////////////////////////

	send( packet, client ) {

		packet.lobby = this.name;

		if ( client ) packet.account = client.account;
		else delete packet.account;

		packet.timestamp = Date.now();

		const data = JSON.stringify( data );

		for ( let i = 0; i < this.clients.length; i ++ )
			this.clients[ i ].send( packet );

	}

}

//Expose Lobby class
module.exports = Lobby;
