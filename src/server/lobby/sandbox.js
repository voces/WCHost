
const { VM } = require( "vm2" );
const sandbox = { postMessage: ( ...args ) => process.send( ...args ) };
const vm = new VM( { sandbox } );

let onmessage;

process.on( "message", msg => {

	switch ( msg.id ) {

		case "protocol": return onmessage = vm.run( msg.data + ";this.onmessage" );
		case "send": return typeof onmessage === "function" ? onmessage( msg.data ) : null;

	}

} );
