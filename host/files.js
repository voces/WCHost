

/**********************************
 **	FileServer Class
 **********************************/

FileServer = function(port) {
	
	this.server = http.createServer(this.onRequest.bind(this));
	
	this.server.listen(port);
	
	this.server.on("error", function(e) {
		if (e.code == "EADDRINUSE") error("FileServer port " + port + " taken.")
		else error("Unkown error opening FileServer on port " + port + ".");
		
		process.exit(1);
	});
	
}

FileServer.prototype.onRequest = function(req, res) {
	if (req.url != "/favicon.ico") {
		console.log(this.config.fileserver.path + req.url);
		fs.readFile(this.config.fileserver.path + req.url, function(err, data) {
			if (err) {
				res.writeHead(404, {"Content-Type": "text/plain"});
				res.end("404 Not Found");
			} else {
				res.writeHead(200, {"Content-Type": "application/json"});
				res.end(data);
			}
		});
	}
};

//Expose Server class
module.exports = FileServer;
