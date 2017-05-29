
const dateformat = require( "dateformat" );

const UTIL = require( "../util" );

class Preclient {

	constructor( server, account, key, lobby ) {

		this.server = server;

		this.account = account;
		this.lowerAccount = account.toLowerCase();
		this.key = key;
		this.lobby = lobby;

		this.timeout = setTimeout( () => this.timeoutFunc(), 10000 );

		this.log( "Preclient created" );

	}

	timeoutFunc() {

		this.log( "Preclient timeout" );

		this.server.preclients.remove( this );

	}

	fullfilled() {

		this.log( "Fullfilled" );

		this.server.preclients.remove( this );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.byellow, this.account || this.address(), ...args, UTIL.colors.default );

	}

	error( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.yellow, this.account || this.address(), ...args, UTIL.colors.default );

	}

}

//Expose Client class
module.exports = Preclient;
