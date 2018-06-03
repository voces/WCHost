
import http from "http";
import mime from "mime-types";
import path from "path";

import { readFile } from "./util.js";

export default class FileServer {

	constructor( config ) {

		this.port = config.port;
		this.root = config.path;

		this.server = http.createServer( ( req, res ) => this.onRequest( req, res ) );

		this.server.listen( this.port );

	}

	async onRequest( req, res ) {

		if ( req.url === "/favicon.ico" ) return res.end();

		const file = readFile( path.join( this.root, req.url ) )
			.catch( () => Promise.resolve() );

		if ( ! file ) {

			res.writeHead( 404, { "Content-Type": "text/plain" } );
			return res.end( "404 Not Found" );

		}

		res.writeHead( 200, { "Content-Type": mime.lookup( req.url ) } );
		res.end( file );

	}

}
