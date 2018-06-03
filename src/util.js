
import fs from "fs";

export const colors = {
	red: "\x1b[0;31m",
	green: "\x1b[0;32m",
	yellow: "\x1b[0;33m", // Preclient
	blue: "\x1b[0;34m",	// Client
	magenta: "\x1b[0;35m",
	cyan: "\x1b[0;36m",	// Server
	white: "\x1b[0;37m",
	black: "\x1b[0;30m",

	bred: "\x1b[1;31m",
	bgreen: "\x1b[1;32m",
	byellow: "\x1b[1;33m",
	bblue: "\x1b[1;34m",
	bmagenta: "\x1b[1;35m",
	bcyan: "\x1b[1;36m",
	bwhite: "\x1b[1;37m",
	default: "\x1b[0;0m"
};

export const merge = ( target, ...sources ) => {

	for ( let i = 0, source; source = sources[ i ]; i ++ )
		for ( const prop in source )

			if ( typeof source[ prop ] !== "object" || typeof target[ prop ] !== "object" )
				target[ prop ] = target = source[ prop ];

			else {

				const type = source[ prop ] instanceof Array ? Array : Object;

				if ( typeof target[ prop ] !== "object" ) target[ prop ] = new type();
				else if ( target[ prop ] instanceof source[ prop ].constructor ) target[ prop ] = new type();

				merge( target[ prop ], source[ prop ] );

			}

};

// class UTIL {

// 	static _pick( source, target, ...fields ) {

// 		for ( let i = 0; i < fields.length; i ++ )
// 			if ( typeof fields[ i ] === "object" && fields[ i ] instanceof Array )
// 				UTIL._pick( source, target, fields[ i ] );
// 			else target[ fields[ i ] ] = source[ fields[ i ] ];

// 	}

// 	static pick( source, ...fields ) {

// 		return UTIL._pick( source, {}, ...fields );

// 	}

// }

function promisify( func ) {

	return ( ...args ) =>
		new Promise( ( resolve, reject ) =>
			func( ...args, ( err, res ) =>
				err ? reject( err ) : resolve( res ) ) );

}

export const readdir = promisify( fs.readdir );
export const readFile = promisify( fs.readFile );

