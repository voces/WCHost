
import repl from "repl";

import Host from "./src/Host.js";
import db from "./src/db.js";

import config from "./config.js";

const host = new Host( config );
db( config );

process.children = [];

setTimeout( () => {

	const myRepl = repl.start( "" );
	myRepl.context.host = host;
	myRepl.on( "exit", () => {

		process.children.forEach( process => process.kill( "SIGINT" ) );
		process.exit();

	} );

}, 250 );
