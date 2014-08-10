var static = require('node-static');
var http = require('http');

var file = new(static.Server)();
var port = Number(process.env.PORT || 80);

http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(port);

console.log("Started the server on port " + port);
