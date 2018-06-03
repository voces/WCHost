
import dateformat from "dateformat";

import FileServer from "./FileServer.js";
import Nova from "./Nova.js";
import Server from "./Server.js";
import { colors } from "./util.js";

export default class Host {

	constructor( config ) {

		this.config = config;

		this.server = new Server( config.server );
		this.nova = new Nova( this, config.nova );
		this.files = new FileServer( config.fileServer );

	}

	log( ...args ) {

		console.log( dateformat( new Date(), "hh:MM:sst" ) + colors.bcyan, ...args, colors.default );

	}

	error( ...args ) {

		console.error( dateformat( new Date(), "hh:MM:sst" ) + colors.cyan, ...args, colors.default );

	}

}
