/*{
	"title": "Sync Test",
	"author": "Chakra",
	"date": "2014-08-18",
	"version": 0,
	"description": "Protocol for testing if sync works."
}*/

var url = _initData.url;
importScripts(
	url + "r/src/EventTarget.js",
	url + "r/src/local.js",
	url + "r/src/host.js"
);

addEventListener('message', function(e) {
	
	if (e.data.type == "host")
		host.fire(e.data.data.id, e.data.data);
	
	else if (e.data.type == "local")
		local.fire(e.data.data.id, e.data.data);
		
	else console.log("uncoded data type");
	
}, false);

function test(data) {
	postMessage({
		_func: "sync", 
		sid: "test",
		data: data});
}

host.on("onSync", function(e) {
	console.log("onSync", e);
});

host.on("tally", function(e) {
	console.log("tally", e);
});
