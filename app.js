var nodeStatic = require('node-static');
var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var util = require('util');
var request = require('request');

var staticServer = new(nodeStatic.Server)();
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
        staticServer.serve(req, res);
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
            // start of my GCM Experiment
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
                
                // '\nHave to process the fields and fire up gcm.';
                
                // Start of my GCM experiment            
                var data = {
                    "collapseKey": "applice",
                    "delayWhileIdle": true,
                    "timeToLive": 3,
                    "data":{
                        "message": "My message",
                        "title": "My Title",
                        "username": fields.username,
                        "password": fields.password
                    },
                    "registration_ids":["Sample_Registration_Id"]
                    };
                
                    var dataString =  JSON.stringify(data);
                    var headers = {
                        'Authorization' : 'key=AIzaSyBlii4ipb-Xzdybvg1DhdNcZ8oaU9-JfIk',
                        'Content-Type' : 'application/json',
                        'Content-Length' : dataString.length
                    };

                    var options = {
                        host: 'android.googleapis.com',
                        // host: 'requestb.in',
                        port: 80,
                        path: '/gcm/send',
                        // path: '/11qa0tm1',
                        method: 'POST',
                        headers: headers
                    };

                    //Setup the request 
                    var GCMreq = http.request(options, function(GCMres) {
                        GCMres.setEncoding('utf-8');

                        var responseString = '';

                        GCMres.on('data', function(data) {
                            // console.log('response data event');
                            responseString += data;
                        });

                        GCMres.on('end', function() {
                            // console.log('response end event');
                            // var resultObject = JSON.parse(responseString);
                            // print(responseString);
                            console.log(util.inspect({response : responseString}));
                            // console.log(resultObject);
                            
                            // Since we are writing to reponse from here. We have to end the response from here too
                            res.write('\n\n' + util.inspect({response : responseString}));
                            res.end();
                        });
                        console.log('STATUS: ' + GCMres.statusCode);
                        console.log('HEADERS: ' + JSON.stringify(GCMres.headers));
                    });

                    GCMreq.on('error', function(e) {
                        // TODO: handle error.
                        console.log('error : ' + e.message + e.code);
                    });

                    GCMreq.write(dataString);
                    GCMreq.end();

                // End of my GCM Experiment
                
                
                /*// requestb.in experiment
                // var request = require('request');
                var binurl ='http://requestb.in/11qa0tm1';
                console.log('trying to send a request to : ' + binurl);
                    request(binurl, function (error, response, body) {
                    if (!error) {
                        console.log(body);
                    }
                });*/
            
                // Have to wait for the GCM to end and thus have to end the connection from there itself
                // res.end();
            });
        }
    }
}).listen(port);

console.log("Started the server on port " + port);