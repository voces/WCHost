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
	
	//Log it
	this.log("Reserved lobby");
	
}

Lobby.prototype.destroy = function() {
	
	for (var i = 0; i < this.clients; i++)
		this.removeClient(this.clients[i]);
	
	this.server.lobbies.splice(lobbies.indexOf(this), 1);
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
	
	//Log it
	this.log("Added user", client.account);
	//this.history.push([Date.now(), client, 'a']);
	
}

Lobby.prototype.removeClient = function(client) {
	
	//Tell our clients (do this first to include leaver)
	this.send({id: 'onLeave', lobby: this.name}, client);
	
	//Remove them from simple array list
	this.clients.splice(this.clients.indexOf(client), 1);
	
	//Remove them from specific account list
	delete this.clients[client.account];
	
	//Log it
	this.log("Removed user", client.account);
	//this.history.push([Date.now(), client, 'r']);
	
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
