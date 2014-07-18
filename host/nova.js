
/**********************************
 **	Nova Class
 **********************************/

Nova = function(serverPort, ip, port, user, password) {
	
	//Default IP and port should be updated to match vox's IP/port
	if (typeof ip == "undefined") ip = "68.229.21.36";
	if (typeof port == "undefined") port = "8082";
	
	//Store location and credentials
	this.ip = ip;
	this.port = port;
	this.user = user;
	this.password = password;
	this.serverPort = serverPort;
	
	//Connect to Nova
	this.log('Attempting to connect to Nova @ ws://' + ip + ':' + port)
	this.ws = new WebSocket('ws://' + ip + ':' + port);
	
	//Attach event handles
	this.ws.on('open', this.onOpen.bind(this));
	this.ws.on('message', this.onMessage.bind(this));
	this.ws.on('close', this.onClose.bind(this));
	this.ws.on('error', this.onError.bind(this));
	
	//Pinging, done so
	//	a) we don't disconnect and
	//	b) we have a ping measurement
	this.pings = [];
	this.pingInterval = setInterval(this.pingFunc.bind(this), 300000);
}

/**********************************
 **	Message handler
 **********************************/

Nova.prototype.onMessage = function(data, flags) {
	data = JSON.parse(data);
	
	//Self
	if (data.id == "onLogin") this.onLogin(data);
	else if (data.id == "onUpgrade") this.onUpgrade();
	
	//Hosting
	else if (data.id == "reserve") this.reserve(data);
	else if (data.id == "onOnReserve") this.onOnReserve(data);
	
	//Joining
	else if (data.id == "bridge") this.bridge(data);
	//else if (data.id == "lobby") this.lobby(data);
	else if (data.id == "onOnBridge") {}
	else if (data.id == "onOnLobby") {}
	
	//Communication
	else if (data.id == "onWhisper") this.onWhisper(data);
	else if (data.id == "onWhisperEcho") {}
	
	//Misc
	else if (data.id == "onEcho") this.onEcho(data)
	
	//Unknown
	else error('Unhandled Nova message', data);
}

Nova.prototype.onEcho = function(data) {
	
	if (data.sid == "ping") this.ping(data);
	
	//Unknown
	else error('Unhandled Nova echo', data);
	
}

Nova.prototype.processCommand = function(account, command, args) {
	if (command == "reserve") {
		var name = args.join(" ");
		
		if (this.canHost(account)) {
			if (!this.server.lobbies[name.toLowerCase()]) {
				
				this.server.lobbies[name.toLowerCase()] = true;
				this.send({id: 'onReserve', name: name});
				
			} else this.send({id: "whisper", account: account, message: "That name is already taken."});
		} else this.send({id: "whisper", account: account, message: "You do not have the access to host."});
		
		
	} else if (command == "unlist") {
		var name = args.join(" ");
		
		var lobby = this.server.lobbies[name.toLowerCase()];
		
		//Make sure the lobby exists
		if (typeof lobby != 'undefined') {
			
			//Find the user's access
			db.query("select access from users where name = ?", account, function(err, rows, fields) {
				
				//Set access (0 if not found)
				if (rows.length == 0) var access = 0;
				else var access = rows[0].access;
				
				//See if they have enough
				if (access >= config.commands.unlist) {
					
					//They do, so unlist and tell user
					lobby.unlist();
					this.send({id: "whisper", account: account, message: name + " unlisted."});
					
				} else this.send({id: "whisper", account: account, message: "You do not have the access to unlist."});
			}.bind(this));
		} else this.send({id: "whisper", account: account, message: "That lobby does not exist."});
	
	} else if (command == "relist") {
		var name = args.join(" ");
		
		var lobby = this.server.lobbies[name.toLowerCase()];
		
		//Make sure the lobby exists
		if (typeof lobby != 'undefined') {
			
			//Find the user's access
			db.query("select access from users where name = ?", account, function(err, rows, fields) {
				
				//Set access (0 if not found)
				if (rows.length == 0) var access = 0;
				else var access = rows[0].access;
				
				//See if they have enough
				if (access >= config.commands.relist) {
					
					//They do, so relist and tell user
					lobby.relist();
					this.send({id: "whisper", account: account, message: name + " relisted."});
					
				} else this.send({id: "whisper", account: account, message: "You do not have the access to relist."});
			}.bind(this));
		} else this.send({id: "whisper", account: account, message: "That lobby does not exist."});
		
	} else if (command == "unreserve") {
		var name = args.join(" ");
		
		var lobby = this.server.lobbies[name.toLowerCase()];
		
		//Make sure the lobby exists
		if (typeof lobby != 'undefined') {
			
			//Find the user's access
			db.query("select access from users where name = ?", account, function(err, rows, fields) {
				
				//Set access (0 if not found)
				if (rows.length == 0) var access = 0;
				else var access = rows[0].access;
				
				//See if they have enough
				if (access >= config.commands.unreserve) {
					
					//They do, so unreserve and tell user
					lobby.unreserve();
					this.send({id: "whisper", account: account, message: name + " unreserved."});
					
				} else this.send({id: "whisper", account: account, message: "You do not have the access to unreserve."});
			}.bind(this));
		} else this.send({id: "whisper", account: account, message: "That lobby does not exist."});
		
	}
};

/**********************************
 **********************************
 **	Packet functions
 **********************************
 **********************************/

/**********************************
 **	Self
 **********************************/

Nova.prototype.onLogin = function(packet) {
	
	this.log("Logged in successfully as " + packet.account);
	
	//Store login creds
	this.account = packet.account;
	
	//Upgrade client type
	this.log("Upgrading to host");
	this.send({id: 'upgrade', port: this.serverPort});
}

Nova.prototype.onUpgrade = function() {
	this.log("Successfully upgraded to host");
	
	for (var i = 0; i < this.server.lobbies.length; i++)
		this.send({id: 'onReserve', name: this.server.lobbies[i].name});
}

/**********************************
 **	Hosting
 **********************************/

//Ideally this would check for the user in the database and make sure they have access to host
//		But I'm not worrying abut that at the moment.
Nova.prototype.canHost = function(who) {
	return true;
}

//Ideally this would check for the user in the database and make sure they have access to connect (i.e., not on blacklist)
//		But I'm not worrying abut that at the moment.
Nova.prototype.canConnect = function(trueAccount, account, ip) {
	return typeof this.server.clients[account] == "undefined" && typeof this.server.preclients[account] == "undefined";
}

Nova.prototype.canJoin = function(trueAccount, account, ip) {
	return true;
}

Nova.prototype.reserve = function(packet) {
	
	if (typeof packet.name == "string") {
		if (this.canHost(packet.account.toLowerCase())) {
			if (!this.server.lobbies[packet.name.toLowerCase()]) {
			
				this.server.lobbies[packet.name.toLowerCase()] = true;
				this.send({id: 'onReserve', name: packet.name});
				
			}
		}
	}
}

Nova.prototype.bridge = function(packet) {
	
	if (this.canConnect(packet.originalAccount, packet.account.toLowerCase(), packet.ip)) {
		
		//Set the key
		//	A string instead of a number because json++ is wonky ATM
		var key = Math.random().toString().substr(2);
		
		var preClient = new PreClient(packet.account, key);
		
		this.server.preclients.push(preClient);
		this.server.preclients[packet.account.toLowerCase()] = preClient;
		
		preClient.server = this.server;
		
		this.send({id: 'onBridge', account: packet.account, key: key});
		
	} else this.send({id: 'bridgeReject', account: packet.account, reason: 'blocked', data: packet});
	
}

Nova.prototype.onOnReserve = function(packet) {
	
	this.server.newLobby(packet.name);
	
};

/**********************************
 **	Communication
 **********************************/

Nova.prototype.onWhisper = function(packet) {
	if (packet.message.substr(0, 1) == "/") {
		var args = packet.message.split(" ");
		var command = args.shift().substr(1);
		
		this.processCommand(packet.account, command, args);
	}
};

/**********************************
 **	Pinging
 **********************************/

Nova.prototype.ping = function(data) {
	this.pings.push(new Date().getTime() - data.sent);
	
	if (this.pings.length > 5) this.pings.shift();
};

/**********************************
 **********************************
 **	Generic functions
 **********************************
 **********************************/

Nova.prototype.send = function(what) {
	if (this.ws.readyState == 1) {
		if (typeof what != "string") what = JSON.stringify(what);
		
		this.ws.send(what);
	}
};

Nova.prototype.pingFunc = function() {
	this.send({id: "echo", sid: "ping", sent: new Date().getTime()});
};

/**********************************
 **	Generic websocket events
 **********************************/

Nova.prototype.onOpen = function() {
	
	//Connected to nova
	this.log("Connected to Nova, logging in as " + this.user);
	
	//Password hashing
	if (this.password != '') {
		
		//Our stable, global salting value...
		var salt = '$2a$10$Nov4t3n7weNTeE51KstHu4';
		
		//Hash it
		bcrypt.hash(this.password + 'nova10262013', salt, function(err, hash) {
			
			this.send({id: 'login', account: this.user, password: hash});
			
		}.bind(this));
	} else {	//blank passwords aren't hashed
		this.send({id: 'login', account: this.user, password: this.password});
	}
}

Nova.prototype.onClose = function(ignorePrint) {
	
	if (ignorePrint !== true) error("Disconnected from Nova");
	
	//Connect to Nova
	this.log('Attempting to connect to Nova @ ws://' + this.ip + ':' + this.port)
	this.ws = new WebSocket('ws://' + this.ip + ':' + this.port);
	
	//Attach event handles
	this.ws.on('open', this.onOpen.bind(this));
	this.ws.on('message', this.onMessage.bind(this));
	this.ws.on('close', this.onClose.bind(this));
	this.ws.on('error', this.onError.bind(this));
	
}

Nova.prototype.onError = function(err) {
	if (err.code == 'ETIMEDOUT') {
		
		error("Timed out while trying to connect to Nova.");
		
		this.onClose(true);
		
	} else error('Unhandled Nova error', err);
}

Nova.prototype.log = function() {
	
	//Grab the proper arg list
	var args = Array.prototype.slice.call(arguments);
	
	//Generate time stamp
	var d = new Date();
	var t = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + ":" + d.getMilliseconds().pad(3);
	
	//Shift color and timestamp at front
	args.unshift(t + cc.yellow);
	
	//Default color at end
	args.push(cc.default);
	
	//Output
	console.log.apply(this, args);
};

//Expose Server class
module.exports = Nova;
