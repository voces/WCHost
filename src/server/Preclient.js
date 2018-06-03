
import dateformat from "dateformat";

import { colors } from "../util.js";

export default class Preclient {

	constructor( server, account, key, Room ) {

		this.server = server;

		this.account = account;
		this.lowerAccount = account.toLowerCase();
		this.key = key;
		this.Room = Room;

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

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.byellow, this.account || this.address(), ...args, colors.default );

	}

	error( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.yellow, this.account || this.address(), ...args, colors.default );

	}

}
