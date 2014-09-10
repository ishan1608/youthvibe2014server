var nodeStatic = require('node-static');
var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var util = require('util');
var request = require('request');
var mongo = require('mongodb');

var staticServer = new(nodeStatic.Server)();
var port = Number(process.env.PORT || 8080);

// MongoHQ Server Url 'mongodb://ishanatmuz:m7382in@kahana.mongohq.com:10045/youthVibe2014';
var mongoUri = process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/youthVibe2014';

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
        
        switch (parts.path) {
            case '/form':
                // Read the file and send it to the user
                fs.readFile('form.html', function(error, data) {
                    if(error) {
                        console.log('Error reading file :\n' + error);
                    } else {
                        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                        res.end(data);
                    }
                });
            break;
            case '/send':
                // start of my GCM Experiment
                // console.log('inside send :\n');
                // This only works for the get methods
                // console.log(url.parse(req.url, true).query);
                // Parse a form
                var form = new formidable.IncomingForm();

                form.parse(req, function(err, fields, files) {
                    var formData = util.inspect({fields: fields, files: files});
                    res.writeHead(200, {'content-type': 'text/plain'});
                    res.write('Received form:\n\n');
                    res.write('Fields :\nusername : ' + fields.username + '\npassword : ' + fields.password);
                    res.write('\n\nRaw Form Data : \n' + formData);
                    console.log(fields);

                    // TODO: Have to remove the GCM firing from here and instead store the registration IDs in the mongoDB database.
                    // Will have to shift the GCM Experiment to a new location '/send'
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
                        // TODO: Will fetch these registration IDs from the database.
                        "registration_ids":[fields.RegistrationID]
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
                                res.write('\n\nGCM Data : \n' + util.inspect({response : responseString}));
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
                });
            break;
            case '/register':
                var form = new formidable.IncomingForm();
                form.parse(req, function(err, fields, files) {
                    res.writeHead(200, {'content-type': 'text/plain'});
                    if(fields.RegistrationID === undefined) {
                        res.end('Oops Something went wrong. There was no registration ID detected for your device.\nPlease contact the administrators.');
                    } else {
                        // MongoDB server connection to store IDs
                        mongo.Db.connect(mongoUri, function (err, db) {
                            db.collection('userIds', function(err, collection) {
                              collection.insert({'id': fields.RegistrationID}, {safe: true}, function(err, rs) {
                                if(err) {
                                  res.end("\nUser Registration Failed.\n" + err);
                                } else if(rs) {
                                  res.end("\nUser Registered successfully :\nRegistration ID : " + fields.RegistrationID + "\n\nResult : \n" + rs);
                                }
                              });
                            });
                          });
                    }
                });
            break;
            case '/users':
                res.writeHead(200, {'content-type': 'text/plain'});
                // MongoDB server connection to store IDs
                res.write('attempting connection\n');
                mongo.Db.connect(mongoUri, function (err, db) {
                    if(err) {
                        res.write('Error connecting to the database.');
                    } else {
                        res.write('attempting to get collection\n');
                        db.collection('userIds', function(err, collection) {
                            res.write('inside the collection error or collection area\n');
                            if(err) {
                                res.write('Error getting the user list');
                            } else {
                                res.write('List of registered users :\n');
                                var cursor = collection.find({'id': true, '_id': false});
                                for(int i=0; i<cursor.length(); i++) {
                                    res.write(cursor[i].id);
                                }
                            }
                        });
                    }
                  });
                res.end('\n\n\t\tReached the end');
            break;
            default:
                console.log("Sorry, we are out of " + parts.path + ".");
        }
    }
}).listen(port);

console.log("Started the server on port " + port);