
const repl = require( "repl" );

const Host = require( "./src/Host" );
const db = require( "./src/db" );

const config = require( "./config" );

const host = new Host( config );
db( config );

setTimeout( () => {

	const myRepl = repl.start( "" );
	myRepl.context.host = host;
	myRepl.on( "exit", () => process.exit() );

}, 250 );
