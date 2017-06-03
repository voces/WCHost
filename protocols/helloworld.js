
/*{
    "name": "HelloWorld",
    "version": "1.0.0",
    "author": "verit"
}*/

postMessage( { id: "broadcast", Hello: "World" } );

onmessage = msg => {

	if ( typeof msg === "string" ) return postMessage( { id: "broadcast", data: msg + "World!" } );

	postMessage( Object.assign( msg, { id: "broadcast", Hello: "World" } ) );

};
// postMessage( "Hello World!" );
