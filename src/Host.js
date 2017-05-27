
// const https = require( "https" );

const dateformat = require( "dateformat" );
// const ws = require( "ws" );

const Server = require( "./Server" );
const Nova = require( "./Nova" );
const FileServer = require( "./FileServer" );
const UTIL = require( "./util" );

class Host {

	constructor( config ) {

		this.config = config;

		this.server = new Server( config.server );
		this.nova = new Nova( this, config.nova );
		this.files = new FileServer( config.fileServer );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.bcyan, ...args, UTIL.colors.default );

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + UTIL.colors.cyan, ...args, UTIL.colors.default );

	}

}

module.exports = Host;
