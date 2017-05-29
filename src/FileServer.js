
const http = require( "http" );
const path = require( "path" );

const mime = require( "mime-types" );

const UTIL = require( "./util" );

class FileServer {

	constructor( config ) {

		this.port = config.port;
		this.root = config.path;

		this.server = http.createServer( ( req, res ) => this.onRequest( req, res ) );

		this.server.listen( this.port );

	}

	async onRequest( req, res ) {

		if ( req.url === "/favicon.ico" ) return res.end();

		const file = UTIL.readFile( path.join( this.root, req.url ) )
			.catch( () => Promise.resolve() );

		if ( ! file ) {

			res.writeHead( 404, { "Content-Type": "text/plain" } );
			return res.end( "404 Not Found" );

		}

		res.writeHead( 200, { "Content-Type": mime.lookup( req.url ) } );
		res.end( file );

	}

}

module.exports = FileServer;
