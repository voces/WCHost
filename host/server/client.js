//////////////////////////////////////////////
//	Constructor + property set/gets
//////////////////////////////////////////////

//Client class
//	socket	The socket of the client, can either be WebSocket or net.Socket
function Client(socket) {
	
	this.account = null;
	this.mode = "normal";
	this.lobby = null;
	this.lobbies = {};
	this.access = {};
	
	for (var property in config.access.default)
		if (config.access.default.hasOwnProperty(property))
			this.access[property] = config.access.default[property];
	
	//Make sure the socket is an object type
	if (typeof socket == "object") {
		
		//Set local value
		this.socket = socket;
		
		//Store the socket type without us having to do instanceof's
		if (socket instanceof WebSocket) this.type = "ws";
		else if (socket instanceof net.Socket) this.type = "s";
		
		//Attach message/data events (ws/tcp, respectfully)
		this.socket.on('message', this.receive.bind(this));
		this.socket.on('data', this.receive.bind(this));
		
		this.socket.on('close', this.close.bind(this));
		
		//Attach error event
		this.socket.on('error', this.error.bind(this));
		
		this.storedAddress = this.address();
		
		//Output to console the new connection...
		this.log('Connected');
		
	//Else just give up
	} else return;
}

//////////////////////////////////////////////
//	Event Managers
//////////////////////////////////////////////

Client.prototype.receive = function(data) {
	
	//Check if the incoming data is as a Buffer
	if (typeof data == "object" && data instanceof Buffer) {
		
		//It is, so convert to string
		data = data.toString();
		
		//Remove last bit... this should actually be handled client-side, but nc sends shitty stuff
		//data = data.substr(0, data.length-1);
	}
	
	try {
		
		//Try to convert the text into JSON
		var packet = JSON.parse(data);
		
		//Report it out first
		this.log(cc.magenta, packet);
		
	//Incoming object isn't in JSON format
	} catch (err) {
		
		error(err);
		
		//If the mode is set to JS, treat it as REPL...
		if (this.mode == "js") var packet = {id:"js", command:data};
		
		//If they simply sent "koalas", it's a keyword and direct JS control is enabled
		else if (data == config.password && this.hasAccess("js")) {
			this.mode = "js";
			this.send("Access Granted", true);
			return;
		
		//Packet is definitely invalid of some sort, so tell client
		} else this.send({id:"invalid", level:0, account: this.account, data:data});
	}
	
	if (packet) {
		
		//Packets come in as two categories (online and offline)
		if (!this.account) {
			
			//Account
			if (packet.id == "key") this.key(packet);
			
			//Misc
			else if (packet.id == "js") this.js(packet.data);
			
			//Missing packet
			else this.send({id:"invalid", level:1, account: this.account, data:packet});
			
		} else {
			
			//Lobby
			if (packet.id == "lobby") this.joinLobby(packet);
			else if (packet.id == "leave") this.leave(packet);
			
			//Communication
			else if (packet.id == "broadcast") this.broadcast(packet);
			else if (packet.id == "echo") this.echo(packet);
			
			//Hosting
			else if (packet.id == "unlist") this.unlist(packet);
			else if (packet.id == "relist") this.relist(packet);
			else if (packet.id == "unreserve") this.unreserve(packet);
			
			//Commands
			else if (packet.id == "protocol") this.setProtocol(packet);
			else if (packet.id == "getProtocols") this.getProtocols(packet);
			
			//Misc
			else if (packet.id == "js") this.js(packet.data);
			
			//Packet id not matched
			else this.send({id:"invalid", level:2, account: this.account, data:packet});
			
		}
	}
}

Client.prototype.close = function() {
	this.log('Disconnected');
	
	if (this.lobby) this.lobby.removeClient(this);
	
	server.removeClient(this);
}

//////////////////////////////////////////////
//	Key
//////////////////////////////////////////////

Client.prototype.key = function(packet) {
	var flag = true;
	
	for (var i = 0; i < this.server.preclients.length; i++) {
		if (this.server.preclients[i].key == packet.key) {
			flag = false;
			
			//Grab account from preclient info
			this.account = this.server.preclients[i].account;
			
			//Check to see if the key packet includes a request for a lobby
			if (packet.lobby) {
				var lobby = this.server.lobbies[packet.lobby];
				
				//Lobby exists, add them
				if (lobby) {
					this.lobby = lobby;
					lobby.addClient(this);
				}
			
			//See if they requested one while a preclient
			} else if (this.server.preclients[i].lobby) {
				this.lobby = this.server.preclients[i].lobby;
				this.server.preclients[i].lobby.addClient(this);
			}
			
			//Destroy preclient
			clearTimeout(this.server.preclients[i].timeout);
			this.server.preclients[i].destroy();
			
			//Set easy access within client object
			this.server.clients[this.account.toLowerCase()] = this;
			
			//Grab client's access and echo
			db.query("select access from users where name = ?", this.account, function(err, rows, fields) {
				if (rows.length != 0) {
					var access = JSON.parse(rows[0].access);
					
					for (var property in access)
						if (access.hasOwnProperty(property))
							this.access[property] = access[property];
				}
				
				this.send({id: 'onKey', account: this.account, access: this.access});
			}.bind(this));
			
			//Report
			this.log("Client authenticated");
		}
	}
	
	if (flag) this.send({id: 'onKeyFail', data: packet});
};

//////////////////////////////////////////////
//	Lobby
//////////////////////////////////////////////

Client.prototype.joinLobby = function(packet) {
	
	//Validate name argument (for lobby)
	if (typeof packet.name == "string") {
		
		//Validate lobby exists exists
		var lobby = this.server.lobbies[packet.name.toLowerCase()];
		if (typeof lobby != "undefined") {
			
			//Validate they aren't already inside
			if (lobby.clients.indexOf(this) < 0) {
				
				this.lobby = lobby;
				lobby.addClient(this);
				
			} else this.send({id: 'onLobbyFail', reason: 'duplicate', data: packet});
		} else this.send({id: 'onLobbyFail', reason: 'noLobby', data: packet});
	} else this.send({id: 'onLobbyFail', reason: 'args', data: packet});
	
};

Client.prototype.leave = function(packet) {
	if (this.lobby) this.lobby.removeClient(this);
	else this.send({id: "onLeaveFail", reason: "noLobby", data: packet});
	
	this.lobby = null;
};

//////////////////////////////////////////////
//	Communication
//////////////////////////////////////////////

Client.prototype.echo = function(packet) {
	
	//Modify data
	packet.id = 'onEcho';
	packet.timestamp = new Date().getTime();
	
	//Send to client
	this.send(packet);
}

Client.prototype.broadcast = function(packet) {

	//If they are in a lobby
	if (this.lobby) {
		
		//Modify data
		packet.id = 'onBroadcast';
		packet.timestamp = new Date().getTime();
		
		//Broadcast to lobby
		this.lobby.broadcast(packet, this);
		//this.lobby.send(data, this);
	
	//Else give them a fail
	} else this.send({id: 'onBroadcastFail', reason: 'lobby', data: packet});
}

//////////////////////////////////////////////
//	Hosting
//////////////////////////////////////////////

Client.prototype.unlist = function(packet) {
	
	//Make sure they are in a lobby
	if (this.lobby) {
		
		//Find the user's access
		db.query("select access from users where name = ?", this.account, function(err, rows, fields) {
			
			//Set access (0 if not found)
			if (rows.length == 0) var access = 0;
			else var access = rows[0].access;
			
			//See if they have enough
			if (access >= config.commands.host) {
				
				//They do, so unlist and tell user
				this.lobby.unlist();
				this.send({id: 'onUnlist', data: packet});
				
			} else this.send({id: 'onUnlistFail', reason: 'block', data: packet});
		}.bind(this));
	} else this.send({id: 'onUnlistFail', reason: 'lobby', data: packet});
}

Client.prototype.relist = function(packet) {
	
	//Make sure they are in a lobby
	if (this.lobby) {
		
		//Find the user's access
		db.query("select access from users where name = ?", this.account, function(err, rows, fields) {
			
			//Set access (0 if not found)
			if (rows.length == 0) var access = 0;
			else var access = rows[0].access;
			
			//See if they have enough
			if (access >= config.commands.host) {
				
				//They do, so relist and tell user
				this.lobby.relist();
				this.send({id: 'onRelist', data: packet});
				
			} else this.send({id: 'onRelistFail', reason: 'block', data: packet});
		}.bind(this));
	} else this.send({id: 'onRelistFail', reason: 'lobby', data: packet});
};

Client.prototype.unreserve = function(packet) {
	
	//Make sure they are in a lobby
	if (this.lobby) {
		
		//Find the user's access
		db.query("select access from users where name = ?", this.account, function(err, rows, fields) {
			
			//Set access (0 if not found)
			if (rows.length == 0) var access = 0;
			else var access = rows[0].access;
			
			//See if they have enough
			if (access >= config.commands.host) {
				
				//They do, so unreserve and tell user
				this.lobby.unreserve();
				this.send({id: 'onUnreserve', data: packet});
				
			} else this.send({id: 'onUnreserveFail', reason: 'block', data: packet});
		}.bind(this));
	} else this.send({id: 'onUnreserveFail', reason: 'no lobby', data: packet});
};

//////////////////////////////////////////////
//	Commands
//////////////////////////////////////////////

Client.prototype.hasAccess = function(what) {
	return this.access[what] || (this.lobby && this.lobbyowner == this.account && config.access.owner[what]);
};

Client.prototype.setProtocol = function(packet) {

	//Make sure they are in a lobby
	if (this.lobby) {
		
		//See if they have access to change the protocol
		if (this.hasAccess("protocol")) {
			
			//Read the protocol
			fs.readFile(rootdir + '/protocols/' + packet.path + '.json', 'utf8', function (err, data) {
				
				if (err) {
					if (err.code == "ENOENT") this.send({id: 'onProtocolFail', reason: 'no protocol', data: packet});
					else this.log("err", err, rootdir + '/protocols/' + packet.path);
				} else {
					try {
						this.lobby.path = packet.path;
						this.lobby.protocol = JSON.parse(data);
					} catch (err) {
						this.send({id: 'onProtocolFail', reason: 'corrupt protocol', data: packet});
						return;
					}
					
					nova.send({
						id: "update",
						name: this.lobby.name,
						protocol: this.lobby.protocol.meta.title,
						preview: this.lobby.protocol.meta.preview
					});
					
					this.lobby.send({id: 'onProtocol', protocol: this.lobby.protocol, data: packet});
				}
			}.bind(this));
			
		} else this.send({id: 'onProtocolFail', reason: 'no access', data: packet});
	} else this.send({id: 'onProtocolFail', reason: 'no lobby', data: packet});
};

Client.prototype._getProtocols = function(packet) {
	
	var protocols = [];
	var oPacket = {id: 'onGetProtocols', protocols: protocols};
	
	if (typeof packet.offset == "undefined") packet.offset = 0;
	
	//No search string, just return first 100
	if (typeof packet.search == "undefined" || packet.search == "") {
		oPacket.subset = false;
		
		var i;
		for (i = packet.offset; i < server.protocols.length && i < 100 + packet.offset; i++)
			protocols.push(server.protocols[i]);
		
		if (i == server.protocols.length)
			oPacket.complete = true;
		
	//Build regex and return first 100 matching
	} else {
		oPacket.subset = true;
		var regex = new RegExp(".*" + packet.search.split("").join(".*") + ".*");
		
		var i;
		for (i = packet.offset, n = 0; i < server.protocols.length && n < 100; i++) {
			if (regex.test(server.protocolIds[i].toLowerCase())) {
				protocols.push(server.protocols[i]);
				n++;
			}
		}
		
		if (i == server.protocols.length)
			oPacket.complete = true;
	}
	
	//Return
	this.send(oPacket);
};

Client.prototype.getProtocols = function(packet) {
	
	//Verify they have access
	if (this.hasAccess("protocol")) {
		
		//Either not loaded or a force reload is requested, let's do this
		if (!server.protocols.length || packet.force == true) {
			
			server.protocols = [];
			server.protocolIds = [];
			
			//Grab our protocol list
			fs.readdir(rootdir + '/protocols/', function(err, files) {
				var count = 0;
				for (var i = 0; i < files.length; i++) {
					
					//Verify & read
					if (files[i].substr(files[i].length - 5).toLowerCase() == '.json') {
						fs.readFile(rootdir + '/protocols/' + files[i], 'utf8', function (err, data) {
							
							try {	var protocol = JSON.parse(data);	}
							catch (err) {return;}
							
							protocol.path = files[i];
							
							server.protocols.push(protocol);
							server.protocolIds.push([
								protocol.meta.title,
								protocol.meta.date,
								protocol.meta.version,
								protocol.meta.author
							].join(" "));
							
							count++;
							if (count == files.length) this._getProtocols(packet);
						}.bind(this));
					}
				}
			}.bind(this));
		} else this._getProtocols(packet);
	} else this.send({id: 'onGetProtocolsFail', reason: 'no access', data: packet});
};

//////////////////////////////////////////////
//	Misc
//////////////////////////////////////////////

Client.prototype.js = function(packet) {
	
	if (this.mode == "js") {
		try {
			this.send(eval(packet), true);
		} catch (err) {
			this.send(err, true);
		}
	} else this.send({id:'onJSFail', reason:'Access denied.', data: packet});
}

//////////////////////////////////////////////
//	Secondary Support Functions
//////////////////////////////////////////////

//Returns the ip:port of the client, if arr is true returns as array
Client.prototype.address = function(arr) {
	
	//Set up our address array
	if (this.type == "ws") var address = [this.socket._socket.remoteAddress, this.socket._socket.remotePort];
	else if (this.type == "s") var address = [this.socket.remoteAddress, this.socket.remotePort];
	
	//Return value
	if (arr === true) return address;
	else return address.join(':');
	
}

//////////////////////////////////////////////
//	Primary Support Functions
//////////////////////////////////////////////

//For error processing
Client.prototype.error = function(err) {
	
	if (err.code == "ECONNRESET") {
		//this.log('Connection closed by remote host');
	} else {
		this.log(clc.red.bold(err));
	}
	
}

//Sends the client a message
//	data	
Client.prototype.send = function(data, useUtil) {
	
	try {
		if (useUtil) var s = util.inspect(data);
		else var s = JSON.stringify(data);
		
		this.log(cc.green, data);
		
		//Send via websocket
		if (this.type == "ws") this.socket.send(s);
		
		//Send via socket
		else if (this.type == "s") this.socket.write(s);
		
	} catch(e){};
}

Client.prototype.log = function() {
	
	//Grab the proper arg list
	var args = Array.prototype.slice.call(arguments);
	
	//Generate time stamp
	var d = new Date();
	var t = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + ":" + d.getMilliseconds().pad(3);
	
	//Place the ip address first
	if (typeof this.account == "string") {
		if (this.lobby) args.unshift(t + cc.cyan, '[' + cc.magenta + this.lobby.name + cc.cyan + '] [' + cc.green + this.account + cc.cyan + ']');
		else args.unshift(t + cc.cyan, '[' + cc.green + this.account + cc.cyan + ']');
	} else {
		if (this.lobby) args.unshift(t + cc.cyan, '[' + cc.magenta + this.lobby.name + cc.cyan + '] [' + cc.green + this.storedAddress + cc.cyan + ']');
		else args.unshift(t + cc.cyan, '[' + cc.green + this.storedAddress + cc.cyan + ']');
	}
	
	//Default color at end
	args.push(cc.default);
	
	//Output
	console.log.apply(this, args);
};

//Expose Client class
module.exports = Client;
