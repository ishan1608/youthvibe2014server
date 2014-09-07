var static = require('node-static');
var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var util = require('util');

var file = new(static.Server)();
var port = Number(process.env.PORT || 80);

http.createServer(function (req, res) {
    // Testing for public folder for static hosting
    // console.log(req.url+'\n');
    var parts = url.parse(req.url, true, true);
    // console.log(parts);
    // console.log(parts.path);
    var folder = parts.path.substring(0,8);
    // console.log(folder);
    if(folder == '/public/') {
        // console.log('Inside public folder for static hosting.');
        file.serve(req, res);
    } else {
        // res.end('not inside public folder for my implementation');
        // console.log(parts.path);
        if(parts.path == '/form') {
            // Read the file and display it in here on console.
            fs.readFile('form.html', function(error, data) {
                if(error) {
                    console.log('Error reading file :\n' + error);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                    res.end(data);
                }
            });
        } else if(parts.path == '/send') {
            // console.log('inside send :\n');
            // This only works for the get methods
            // console.log(url.parse(req.url, true).query);
            // Parse a form
            var form = new formidable.IncomingForm();

            form.parse(req, function(err, fields, files) {
                var data = util.inspect({fields: fields, files: files});
                res.writeHead(200, {'content-type': 'text/plain'});
                res.write('Received form:\n\n');
                res.write('Fields :\nusername : ' + fields.username + '\npassword : ' + fields.password);
                console.log(fields);
                res.end('\nHave to process the fields and fire up gcm.');
            });
        }
    }
}).listen(port);

console.log("Started the server on port " + port);