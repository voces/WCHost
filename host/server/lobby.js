//////////////////////////////////////////////
//	Constructor + property set/gets + deconstructor
//////////////////////////////////////////////

function Lobby(name) {
	
	//Define local variables
	this.name = name;
	this.clients = [];
	this.history = [];
	this.settings = {permissions: {}, ranks: {}};
	this.protocol = null;
	
	this.timeout = setTimeout(this.destroy.bind(this), 300000);	//destruct in 5 minutes
	
	//Log it
	this.log("Reserved lobby");
	
}

Lobby.prototype.destroy = function() {
	
	//Tell Nova we're dead
	nova.send({id: 'unreserve', name: this.name});
	
	//Tell our clients they have left and then silently remove them
	for (var i = 0; i < this.clients; i++) {
		this.send({id: 'onLeave', lobby: this.name, forced: true}, this.clients[i]);
		this.removeClient(this.clients[i], true);
	}
	
	this.server.lobbies.splice(this.server.lobbies.indexOf(this), 1);
	delete this.server.lobbies[this.name.toLowerCase()];
	
	this.log(cc.red, "Lobby unreserved");
}

//////////////////////////////////////////////
//	Client handling
//////////////////////////////////////////////

Lobby.prototype.addClient = function(client) {
	
	//Tell our clients
	this.send({id:'onJoin', lobby: this.name, accounts: [client.account], protocol: this.protocol});
	
	//So we can loop through clients...
	this.clients.push(client);
	
	//For easy access of clients...
	this.clients[client.account] = client;
	
	//Tell the client who's here
	client.send({id:'onJoin', lobby:this.name, accounts:propArrOfArr(this.clients, 'account')});
	
	//Make sure timeout is not active
	clearTimeout(this.timeout);
	
	//Log it
	client.log("Added user to lobby");
	//this.history.push([Date.now(), client, 'a']);
}

Lobby.prototype.removeClient = function(client, silent) {
	
	//If empty, start timer to destruct
	if (this.clients.length <= 1) {
		this.timeout = setTimeout(this.destroy.bind(this), 300000);	//5 minutes
		
		//Special log
		client.log("Removed user from lobby, auto destruct enabled");
		
	//Normal log
	} else client.log("Removed user from lobby");
	
	//Tell our clients (do this first to include leaver)
	if (silent !== true)
		this.send({id: 'onLeave', lobby: this.name}, client);
	
	//Remove them from array, object, and set their status
	this.clients.splice(this.clients.indexOf(client), 1);
	delete this.clients[client.account];
	client.lobby = null;
	
}

//////////////////////////////////////////////
//	Nova listings
//////////////////////////////////////////////

Lobby.prototype.unlist = function(client) {
	nova.send({id: 'unlist', name: this.name});
}

Lobby.prototype.relist = function(account) {
	nova.send({id: 'relist', name: this.name});
}

Lobby.prototype.unreserve = function(account) {
	nova.send({id: 'unreserve', name: this.name});
}

//////////////////////////////////////////////
//	Lobby communication
//////////////////////////////////////////////

Lobby.prototype.broadcast = function(data, account) {
	this.send(data, account);
	
	this.broadcastID++;
};

Lobby.prototype.update = function(data, account) {
	this.send(data, account);
	
	this.updateID++;
};

Lobby.prototype.send = function(data, client) {
	
	//Append a lobby name to the packet
	//	This makes data.lobby effectively reserved for any data transmitting through this function
	data.lobby = this.name;
	
	//Only allows data.account to be set if a client is passed, otherwise kill it
	if (client) data.account = client.account;
	else delete data.account;
	
	//Loop through clients in lobby
	for (var x = 0; x < this.clients.length; x++) {
		
		//Send via client
		this.clients[x].send(data);
		
	}
	
	//Log it
	//this.log("Broadcasting", data);
	//this.history.push([Date.now(), this, account, 's', data]);
}

Lobby.prototype.log = function() {
	
	//Grab the proper arg list
	var args = Array.prototype.slice.call(arguments);
	
	//Generate time stamp
	var d = new Date();
	var t = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + ":" + d.getMilliseconds().pad(3);
	
	args.unshift(t + cc.cyan, '[' + cc.magenta + this.name + cc.cyan + ']');
	
	//Default color at end
	args.push(cc.default);
	
	//Output
	console.log.apply(this, args);
};

//Expose Lobby class
module.exports = Lobby;
