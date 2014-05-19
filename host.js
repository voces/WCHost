//***************************************
//**	Requires
//***************************************

//Standard libraries
WebSocket	= require('ws');
mysql = require('mysql');
bcrypt = require('bcryptjs');
util = require('util');
async = require('async');
fs = require('fs');
crypto = require('crypto');
http = require('http');

//Custom libraries
Server = require('./host/server.js');
Nova = require('./host/nova.js');
FileServer = require('./host/files.js');

//Global variables
server = null;
nova = null;
config = null;
db = null;

rootdir = __dirname;

//***************************************
//**	Setup
//***************************************

//Colors index
cc = {
	black: '\x1b[30m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	black: '\x1b[30m',
	bred: '\x1b[1;31m',
	bgreen: '\x1b[1;32m',
	byellow: '\x1b[1;33m',
	bblue: '\x1b[1;34m',
	bmagenta: '\x1b[1;35m',
	bcyan: '\x1b[1;36m',
	bwhite: '\x1b[1;37m',
	default: '\x1b[0;37m',
};

//For debugging colors
/*for (var property in cc) {
	if (cc.hasOwnProperty(property)) {
		console.log(cc[property], property);
	}
}*/

//For padding numbers
Number.prototype.pad = function(size) {
	var s = this + "";
	while (s.length < size) s = "0" + s;
	return s
}

instance = function(obj, type) {
	if (typeof obj == "object")
		if (obj instanceof type) return true;
		else return false;
	else return false;
}

propArrOfArr = function(arr, prop) {
	propArr = [];
	
	for (var i = 0; i < arr.length; i++)
		propArr.push(arr[i][prop]);
	
	return propArr;
}

error = function() {
	
	//Grab the proper arg list
	var args = Array.prototype.slice.call(arguments);
	
	//Generate time stamp
	var d = new Date();
	var t = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + ":" + d.getMilliseconds().pad(3);
	
	//Shift color and timestamp at front
	args.unshift(t + cc.bred);
	
	//Default color at end
	args.push(cc.default);
	
	//Output
	console.log.apply(this, args);
}

dbLog = function() {
	
	//Grab the proper arg list
	var args = Array.prototype.slice.call(arguments);
	
	//Generate time stamp
	var d = new Date();
	var t = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + ":" + d.getMilliseconds().pad(3);
	
	//Shift color and timestamp at front
	args.unshift(t + cc.bcyan);
	
	//Default color at end
	args.push(cc.default);
	
	//Output
	console.log.apply(this, args);
}

fs.readFile(rootdir + '/config.json', 'utf8', function (err, data) {
	
	if (err) {
		error("No configuration file found. One will be created.");
		
		config = {
			
			mysql: {
				host		: 'localhost',
				user		: 'webcraft_host',
				password	: '$11$WzyHRaXfvPsjZfRX9fe0',
				database	: 'webcraft_host'
			},
			
			nova: {
				ip			: '68.229.21.36',
				port		: 8082,
				user		: 'anon',
				password	: ''
			},
			
			server: {
				port	: 8089
			},
			
			fileserver: {
				port: 	8088,
				path:	"protocols"
			},
			
			commands: {
				host:		1,
				set:		2,
				del:		2
			}
			
		};
		
		fs.writeFile(__dirname + '/config.json', JSON.stringify(config, null, "\t"), function(err) {
			if (err) error("Can't create configuration file.");
		});
	}
	
	if (config == null) {
		try {
			config = JSON.parse(data);
		} catch (err) {
			error('Configuration file corrupted. Please validate proper JSON.');
			config = null;
		}
	}
	
	if (typeof config == "undefined") {
		error("Configuration not loaded. Aborting.");
		return;
	}
	
	server = new Server(config.server.port);
	nova = new Nova(config.server.port, config.nova.ip, config.nova.port, config.nova.user, config.nova.password);
	files = new FileServer(config.fileserver.port);
	
	server.nova = nova;
	server.config = config;
	
	nova.server = server;
	nova.config = config;
	
	files.config = config;
	
	dbLog("Connecting to database @ " + config.mysql.host + " using " + config.mysql.user);
	connectSQL(config.mysql.host, config.mysql.user, config.mysql.password, config.mysql.database);

	//For input
	var input = process.openStdin();

	//Attach input listener
	input.addListener("data", function(d) {
		try {console.log(eval(d.toString().substring(0, d.length-2)));}
		catch (err) {console.log(err);}
	});

}.bind(this));

db = null;
function connectSQL(host, user, password, database) {
	
	//Setup MySQL connection
	db = mysql.createConnection({
		host     : host,
		user     : user,
		password : password,
		database : database
	});
	
	db.connect(function(err, a, b) {
		if (err) error(err);
		
		dbLog("MySQL connected");
	});
	
	db.on('error', function(err) {
		dbLog("MySQL disconnected, reconnecting to database @ " + config.mysql.host + " using " + config.mysql.user);
		connectSQL(host, user, password, database);
	});
}
