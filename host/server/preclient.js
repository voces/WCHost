function PreClient(account, key, lobby) {
	
	this.account = account;
	this.key = key;
	this.lobby = lobby;
	
	this.timeout = setTimeout(this.timeoutFunc.bind(this), 10000);
	
	this.log("PreClient " + this.account + " created");
	
}

PreClient.prototype.timeoutFunc = function() {
	this.log("PreClient " + this.account + " timeout");
	
	this.destroy();
};

PreClient.prototype.destroy = function() {
	this.server.preclients.splice(this.server.preclients.indexOf(this), 1);
	delete this.server.preclients[this.account.toLowerCase()];
}

PreClient.prototype.log = function() {
	
	//Grab the proper arg list
	var args = Array.prototype.slice.call(arguments);
	
	//Generate time stamp
	var d = new Date();
	var t = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + ":" + d.getMilliseconds().pad(3);
	
	//Place the ip address first
	args.unshift(t + cc.yellow, '[' + this.account + ']');
	
	//Default color at end
	args.push(cc.default);
	
	//Output
	console.log.apply(this, args);
};

//Expose Client class
module.exports = PreClient;
