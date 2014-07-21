//***************************************
//**	Requires
//***************************************

//Custom libraries
PreClient		= require('./server/preclient.js');
Client		= require('./server/client.js');
Lobby		= require('./server/lobby.js');
util		= new (require('./server/util.js'));

Server = function(port) {
	
	//***************************************
	//**	Variables
	//***************************************
	
	//Arrays
	this.preclients = [];
	this.clients = [];
	this.lobbies = [];
	
	//Set up the server
	this.wss = new WebSocket.Server({port: port});
	
	//Bind connections
	this.wss.on('connection', this.onWS.bind(this))
	
	//Finished
	this.log('Server started');
};

//On Websocket connection
Server.prototype.onWS = function(socket) {
	var client = new Client(socket);
	client.server = this;
	
	this.clients.push(client);
};

//Function that grabs a lobby from the lobby array
//	If it doesn't exist, it'll create it
Server.prototype.getLobby = function(lobbyName, callback) {
	
	//Check if lobby exists
	if (typeof this.lobbies[lobbyName.toLowerCase()] == "undefined") {
		
		//It doesn't create it
		var lobby = this.newLobby(lobbyName);;
		
	//Lobby already exists, return lobby
	} else callback(this.lobbies[lobbyName.toLowerCase()]);
	
};

//Remove a client from the client array
//	client	instanceof Client
Server.prototype.removeClient = function(client) {
	
	//Remove them from simple array list
	this.clients.splice(this.clients.indexOf(client), 1);
	
	//Remove them from specific account list
	if (client.account) delete this.clients[client.account.toLowerCase()];
};

Server.prototype.newLobby = function(name, owner) {
	
	//Check if lobby exists
	if (this.lobbies[name.toLowerCase()] == true) {
		
		//It doesn't create it
		var lobby = new Lobby(name, owner);
		
		//Set parent variable
		lobby.server = this;
		
		//Add it to array
		this.lobbies.push(lobby);
		this.lobbies[name.toLowerCase()] = lobby;
		
		return lobby;
		
	//Lobby already exists, return lobby
	} else return false;
	
};

Server.prototype.log = function() {
	
	//Grab the proper arg list
	var args = Array.prototype.slice.call(arguments);
	
	//Generate time stamp
	var d = new Date();
	var t = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + ":" + d.getMilliseconds().pad(3);
	
	//Shift color and timestamp at front
	args.unshift(t + cc.cyan);
	
	//Default color at end
	args.push(cc.default);
	
	//Output
	console.log.apply(this, args);
};

//Expose Server class
module.exports = Server;
