
import path from "path";

export default {
	db: {
		host: "localhost",
		user: "webcraft_host",
		database: "webcraft_host"
	},
	nova: {
		address: "ws://notextures.io:8080",
		user: "anon",
		password: ""
	},
	server: {
		port: 8089
	},
	fileServer: {
		port: 8087,
		path: path.join( __dirname, "apps" )
	},
	access: {
		default: {
			reserve: false,
			app: false,
			set: false,
			kick: false,
			js: false
		},
		owner: {
			app: true,
			kick: true
		}
	},
	password: "admin"
};
