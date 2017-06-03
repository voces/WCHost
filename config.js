
const path = require( "path" );

module.exports = {
	db: {
		host: "localhost",
		user: "webcraft_host",
		password: "$11$WzyHRaXfvPsjZfRX9fe0",
		database: "webcraft_host"
	},
	nova: {
		address: "wss://notextures.io:8080",
		user: "anon",
		password: ""
	},
	server: {
		port: 8089
	},
	fileServer: {
		port: 8087,
		path: path.join( __dirname, "protocols" )
	},
	access: {
		default: {
			reserve: false,
			protocol: false,
			set: false,
			kick: false,
			js: false
		},
		owner: {
			protocol: true,
			kick: true
		}
	},
	password: "admin"
};
