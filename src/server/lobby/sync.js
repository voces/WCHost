
function Sync(lobby, sid) {
	
	this.lobby = lobby;
	this.sid = sid;
	
	this.votes = [];
	this.options = [];
	this.initiated = Date.now();
	this.expired = false;
	
	this.timeout = setTimeout(this.expire.bind(this), this.initated + 5000);
}

Sync.prototype.vote = function(client, data) {
	
	if (Date.now() - this.initiated >= 5000) {
		this.votes = [];
		this.options = [];
		this.initiated = Date.now();
		this.expired = false;
		
		clearTimeout(this.timeout);
		this.timeout = setTimeout(this.expire.bind(this), this.initated + 5000);
	
	} else if (this.expired) return;
	
	var vote = new Sync.Vote(this, client, data);
	this.votes.push(vote);
	
	var option = false;
	for (var i = 0; i < this.options.length; i++)
		if (option = this.options[i].attempt(vote))
			break;
	
	if (!option)
		this.options.push(new Sync.Option(this, vote));
	
	console.log(this.sid, this.votes.length, this.lobby.clients.length);
	
	if (this.votes.length >= this.lobby.clients.length / 2) {
		clearTimeout(this.timeout);
		this.expire();
	}
};

Sync.prototype.expire = function() {
	this.expired = true;
	
	var winCount = 0;
	var winner = null;
	
	for (var i = 0; i < this.options.length; i++)
		if (this.options[i].votes.length > winCount) {
			winCount = this.options[i].votes.length;
			winner = this.options[i];
		} else if (this.options[i].votes.length == winCount) {
			winner = "tie";
		}
	
	this.lobby.send({id: "tally", sid: this.sid, result: winner.data});
};

Sync.Option = function(sync, vote) {
	this.sync = sync;
	this.data = vote.data;
	this.stringified = vote.stringified;
	
	this.votes = [vote];
};

Sync.Option.prototype.attempt = function(vote) {
	if (this.stringified == vote.stringified) {
		this.votes.push(vote);
		return this;
	} else return false;
};

Sync.Vote = function(sync, client, data) {
	this.sync = sync;
	this.client = client;
	this.data = data;
	
	this.stringified = JSON.stringify(data);
};

//Expose Sync class
module.exports = Sync;
